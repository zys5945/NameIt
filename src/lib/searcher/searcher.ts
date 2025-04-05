import { BIGRAM_LOGITS, AVG_LOGIT } from "./bigramLogits";

/**
 * formulates possible candidates as a tree, whose edges are the pointer positions
 *
 * the root node represents nothing (empty set)
 * all edges in first level are where the first pointer can be, i.e. [0, len(letters))
 * all edges in second level are where the second pointer can be, which is dependent on its parent
 * e.g. if first pointer is at 1, then second pointer CANNOT be at 0 or 1, it has to start from 2
 *
 * then searching through the space becomes a DFS on the tree
 * 2 operations primarily used:
 * 1. extend, which attempts to walk one more level
 * 2. pop_shift, which exits from current subtree back to its parent, and visits its parent's next sibling
 *
 * additional heuristics based on constraints are used to cut branches
 */
export class Searcher {
  words: string[];
  words_len: number;
  word_constraints: boolean[];
  num_word_constraints: number;
  letters: string;
  letters_len: number;
  min_len: number;
  max_len: number;
  use_stats: boolean;
  greedy_stats_pruning: boolean;
  last_pos: number[];

  constructor(
    words: string[],
    word_constraints: boolean[],
    min_len = 3,
    max_len: number | null = null,
    use_stats = true,
    greedy_stats_pruning = true
  ) {
    this.words = words;
    this.words_len = words.length;

    if (words.length === 0) {
      throw new Error("provide at least 1 word");
    }

    this.word_constraints = word_constraints;
    this.num_word_constraints = word_constraints.reduce(
      (acc, val) => acc + (val ? 1 : 0),
      0
    );

    if (words.length !== word_constraints.length) {
      throw new Error("number of words should equal to number of constraints");
    }

    this.letters = words.join("");
    this.letters_len = this.letters.length;

    this.min_len = min_len;
    if (this.min_len < this.num_word_constraints) {
      // TODO: should show INFO feedback and change min_len in the ui
      this.min_len = this.num_word_constraints;
    }

    this.max_len = max_len || this.letters_len;

    if (this.min_len > this.max_len) {
      throw new Error("minimum length cannot be greater than maximum length");
    }

    if (this.min_len > this.letters_len) {
      throw new Error(
        "minimum length cannot be greater than the number of total letters available"
      );
    }

    this.use_stats = use_stats;
    this.greedy_stats_pruning = greedy_stats_pruning;

    this.last_pos = [];
  }

  private _try_extend_in_place(
    pos: number[],
    by: number | null = null
  ): number[] | null {
    by = by ?? Math.max(this.min_len - pos.length, 0);

    if (
      pos.length >= this.max_len ||
      pos[pos.length - 1] + by >= this.letters_len
    ) {
      return null;
    }

    for (let _ = 0; _ < by; _++) {
      pos.push(pos[pos.length - 1] + 1);
    }

    return pos;
  }

  /**
   * modifies pos in place
   */
  private _pop_shift_in_place(pos: number[]): number[] | null {
    pos.pop();
    if (pos.length === 0) {
      return null;
    }
    pos[pos.length - 1] += 1;
    return pos;
  }

  public _next_valid_candidate(): [number[], number] | null {
    const next_pos = [...this.last_pos];

    // try walking down the tree if possible
    if (this._try_extend_in_place(next_pos, 1) === null) {
      next_pos[next_pos.length - 1] += 1;
    }
    return this._make_valid_candidate(next_pos);
  }

  /**
   * checks if in_pos is a valid candidate, if not then tries to find the next valid candidate
   * @returns null if search space exhausted
   */
  public _make_valid_candidate(in_pos: number[]): [number[], number] | null {
    let pos: number[] | null = in_pos;

    let score = -Infinity;

    // repeat until next_pos meets all constraints
    while (true) {
      if (pos === null) {
        return null;
      }

      if (pos[pos.length - 1] >= this.letters_len) {
        pos = this._pop_shift_in_place(pos);
        continue;
      }

      if (pos.length < this.min_len) {
        const extend_result = this._try_extend_in_place(pos);
        // if we cannot extend then we have to pop shift again
        pos = extend_result ? extend_result : this._pop_shift_in_place(pos);
        continue;
      }

      if (this.word_constraints.length > 0) {
        const result = this._force_words_constraints(pos);
        if (result === null) {
          return null;
        }

        pos = result[1];
        if (result[0]) {
          // if pos changed then we have to rerun all checks
          continue;
        }
      }

      if (this.use_stats) {
        let total_log_value = 0;
        let greedy_break = false;

        for (let i = 0; i < pos.length - 1; i++) {
          const pair = this.letters[pos[i]] + this.letters[pos[i + 1]];
          const pair_log_value = BIGRAM_LOGITS[pair] ?? -Infinity;

          if (this.greedy_stats_pruning && pair_log_value < AVG_LOGIT) {
            pos = pos.slice(0, i + 2);
            pos[pos.length - 1] += 1;
            greedy_break = true;
            break;
          }

          total_log_value += pair_log_value;
        }

        if (greedy_break) {
          continue;
        }

        if (total_log_value < pos.length * AVG_LOGIT) {
          pos[pos.length - 1] += 1;
          continue;
        }

        score = total_log_value;
      }

      break;
    }

    return [pos, score];
  }

  public _force_words_constraints(
    pos: number[] | null
  ): [boolean, number[]] | null {
    if (!pos) {
      return null;
    }

    if (pos[pos.length - 1] >= this.letters_len) {
      return this._force_words_constraints(this._pop_shift_in_place(pos));
    }

    // pointing to the next word that needs to be used
    let cur_word = -1;
    let cur_word_offset = 0;
    let cur_word_end = 0; // exclusive
    let words_used = 0;

    const set_next_word = () => {
      if (cur_word >= 0) {
        words_used += 1;
      }

      // going one more than words_len to allow cur_word to be set to words_len
      for (let i = cur_word + 1; i <= this.words_len; i++) {
        cur_word = i;
        cur_word_offset = cur_word_end;
        cur_word_end =
          cur_word >= this.words_len
            ? Infinity
            : cur_word_offset + this.words[cur_word].length;

        if (i >= this.words_len || this.word_constraints[i]) {
          break;
        }
      }
    };

    set_next_word();

    let cur_pointer = 0;
    const max_pointers = Math.min(
      this.max_len,
      (pos?.length ?? 0) + this.letters_len - 1 - pos[pos.length - 1]
    );

    let pos_changed = false;

    for (cur_pointer = 0; cur_pointer < max_pointers; cur_pointer++) {
      // check & fill as long as there's no skipped word
      // when there is skipped word, pop shift

      // all words are covered
      if (cur_word >= this.words_len) {
        break;
      }

      // skipped word, need to pop shift
      if (cur_pointer < pos.length && pos[cur_pointer] >= cur_word_end) {
        if (cur_pointer === 0) {
          return null;
        }

        const new_pos = pos.slice(0, cur_pointer);
        new_pos[new_pos.length - 1] += 1;
        const result = this._force_words_constraints(new_pos);
        if (result === null) {
          return null;
        }
        return [true, result[1]];
      }

      // number of pointers remaining, including current pointer
      const num_rem_pointers = max_pointers - cur_pointer;

      // number of words need to be used
      const num_rem_words = this.num_word_constraints - words_used;

      // no possible arrangement exists
      if (num_rem_pointers < num_rem_words) {
        return null;
      }

      // more pointers than words, extend if possible
      if (num_rem_pointers > num_rem_words) {
        if (cur_pointer >= pos.length) {
          pos.push(pos[pos.length - 1] + 1);
          pos_changed = true;
        }

        if (pos[cur_pointer] >= cur_word_offset) {
          // guaranteed to not skip any words
          set_next_word();
        }

        continue;
      }

      // guaranteed num_rem_pointers == num_rem_words, which we will either move or extend + move

      if (cur_pointer >= pos.length) {
        pos.push(cur_word_offset);
        pos_changed = true;
      } else if (pos[cur_pointer] < cur_word_offset) {
        pos[cur_pointer] = cur_word_offset;
        pos_changed = true;
      }

      set_next_word();
    }

    return [pos_changed, pos];
  }

  public _make_initial_candidate(): [number[], number] | null {
    return this._make_valid_candidate(
      Array.from({ length: this.min_len }, (_, i) => i)
    );
  }

  private _make_letters(pos: number[]): string {
    return pos.map((i) => this.letters[i]).join("");
  }

  next_candidate(): [string, number] | null {
    const candidate =
      this.last_pos.length === 0
        ? this._make_initial_candidate()
        : this._next_valid_candidate();

    if (candidate === null) {
      return null;
    }

    this.last_pos = candidate[0];
    return [this._make_letters(candidate[0]), candidate[1]];
  }
}
