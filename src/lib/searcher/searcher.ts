import { sortedIndex } from "$lib/binary-search";

import { BIGRAM_LOGITS, AVG_LOGIT } from "./bigram-logits";

export interface Candidate {
  word: string;
  positions: number[];
  score: number;
}

const possibilityDp: { [lettersLen: number]: { [posLen: number]: number } } =
  {};

export class SearcherResults {
  bucketSize: number;

  results = [];
  nameSet = new Set<string>();

  constructor(bucketSize) {
    this.bucketSize = bucketSize;
  }

  /**
   * @param order 1 for ascending, -1 for descending
   */
  _addToArray(array: Candidate[], candidate: Candidate, order) {
    if (this.nameSet.has(candidate.word)) {
      return;
    }

    const candidateKey = candidate.score * order;
    if (
      array.length === this.bucketSize &&
      array[array.length - 1][2] * order < candidateKey
    ) {
      return;
    }

    array.splice(
      sortedIndex(array, candidate, (x) => x[2] * order),
      0,
      candidate
    );
    this.nameSet.add(candidate.word);

    // limit size
    if (array.length > this.bucketSize) {
      const popped = array.pop();
      this.nameSet.delete(popped[0]);
    }
  }

  add(candidate: Candidate) {
    this._addToArray(this.results, candidate, -1);
  }
}

export class SearchProgress {
  searched: number;
  searchedPercent: number;
  remaining: number;
  remainingPercent: number;
  total: number;

  constructor(searched: number, total: number) {
    this.searched = searched;
    this.searchedPercent = (this.searched / total) * 100;
    this.remaining = total - searched;
    this.remainingPercent = (this.remaining / total) * 100;
    this.total = total;
  }
}

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
  wordsLen: number;
  wordConstraints: boolean[];
  numWordConstraints: number;
  letters: string;
  lettersLen: number;
  minLen: number;
  maxLen: number;
  useStats: boolean;
  greedyStatsPruning: boolean;

  lastPos: number[] = [];

  totalPossibilities: number = 0;
  // dp[lettersLen][posLen] = number of possibilities for lettersLen letters with posLen (free) pointers

  /**
   * @param words list of words to perform the search on
   * @param wordConstraints list of booleans, true if the word at the corresponding have to be used
   * @param minLen minimum length of the result
   * @param maxLen maximum length of the result
   * @param useStats whether to use bigram stats
   * @param greedyStatsPruning if true, then branch is pruned as soon as encountering one letter pair with low bigram logit
   */
  constructor(
    words: string[],
    wordConstraints: boolean[],
    minLen = 3,
    maxLen: number | null = null,
    useStats = true,
    greedyStatsPruning = true
  ) {
    this.words = words;
    this.wordsLen = words.length;

    if (words.length === 0) {
      throw new Error("Provide at least 1 word");
    }

    this.wordConstraints = wordConstraints;
    this.numWordConstraints = wordConstraints.reduce(
      (acc, val) => acc + (val ? 1 : 0),
      0
    );

    if (words.length !== wordConstraints.length) {
      throw new Error(
        "Number of words should equal to number of word constraints"
      );
    }

    this.letters = words.join("");
    this.lettersLen = this.letters.length;

    this.minLen = Math.max(minLen, 1);
    if (this.minLen < this.numWordConstraints) {
      this.minLen = this.numWordConstraints;
    }

    if (this.minLen > this.lettersLen) {
      throw new Error(
        "Minimum length cannot be greater than the number of letters, try add more letters or words"
      );
    }

    this.maxLen = maxLen || this.lettersLen;

    if (this.minLen > this.maxLen) {
      throw new Error("Minimum length cannot be greater than maximum length");
    }

    this.useStats = useStats;
    this.greedyStatsPruning = greedyStatsPruning;

    this.calcTotalPossibilities();
  }

  private _tryExtendInPlace(
    pos: number[],
    by: number | null = null
  ): number[] | null {
    by = by ?? Math.max(this.minLen - pos.length, 0);

    if (
      pos.length >= this.maxLen ||
      pos[pos.length - 1] + by >= this.lettersLen
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
  private _popShiftInPlace(pos: number[]): number[] | null {
    pos.pop();
    if (pos.length === 0) {
      return null;
    }
    pos[pos.length - 1] += 1;
    return pos;
  }

  public _nextValidCandidate(): [number[], number] | null {
    const nextPos = [...this.lastPos];

    // try walking down the tree if possible
    if (this._tryExtendInPlace(nextPos, 1) === null) {
      nextPos[nextPos.length - 1] += 1;
    }
    return this._makeValidCandidate(nextPos);
  }

  /**
   * checks if inPos is a valid candidate, if not then tries to find the next valid candidate
   * @returns null if search space exhausted
   */
  public _makeValidCandidate(inPos: number[]): [number[], number] | null {
    let pos: number[] | null = inPos;

    let score = -Infinity;

    // repeat until next_pos meets all constraints
    while (true) {
      if (pos === null) {
        return null;
      }

      if (pos[pos.length - 1] >= this.lettersLen) {
        pos = this._popShiftInPlace(pos);
        continue;
      }

      if (pos.length < this.minLen) {
        const extendResult = this._tryExtendInPlace(pos);
        // if we cannot extend then we have to pop shift again
        pos = extendResult ? extendResult : this._popShiftInPlace(pos);
        continue;
      }

      if (this.wordConstraints.length > 0) {
        const result = this._forceWordsConstraints(pos);
        if (result === null) {
          return null;
        }

        pos = result[1];
        if (result[0]) {
          // if pos changed then we have to rerun all checks
          continue;
        }
      }

      if (this.useStats) {
        let totalLogValue = 0;
        let greedyBreak = false;

        for (let i = 0; i < pos.length - 1; i++) {
          const pair = this.letters[pos[i]] + this.letters[pos[i + 1]];
          const pairLogValue = BIGRAM_LOGITS[pair] ?? -Infinity;

          if (this.greedyStatsPruning && pairLogValue < AVG_LOGIT) {
            pos = pos.slice(0, i + 2);
            pos[pos.length - 1] += 1;
            greedyBreak = true;
            break;
          }

          totalLogValue += pairLogValue;
        }

        if (greedyBreak) {
          continue;
        }

        if (totalLogValue < pos.length * AVG_LOGIT) {
          pos[pos.length - 1] += 1;
          continue;
        }

        score = totalLogValue;
      }

      break;
    }

    return [pos, score];
  }

  public _forceWordsConstraints(
    pos: number[] | null
  ): [boolean, number[]] | null {
    if (!pos) {
      return null;
    }

    if (pos[pos.length - 1] >= this.lettersLen) {
      return this._forceWordsConstraints(this._popShiftInPlace(pos));
    }

    // pointing to the next word that needs to be used
    let curWord = -1;
    let curWordOffset = 0;
    let curWordEnd = 0; // exclusive
    let wordsUsed = 0;

    const setNextWord = () => {
      if (curWord >= 0) {
        wordsUsed += 1;
      }

      // going one more than wordsLen to allow curWord to be set to wordsLen
      for (let i = curWord + 1; i <= this.wordsLen; i++) {
        curWord = i;
        curWordOffset = curWordEnd;
        curWordEnd =
          curWord >= this.wordsLen
            ? Infinity
            : curWordOffset + this.words[curWord].length;

        if (i >= this.wordsLen || this.wordConstraints[i]) {
          break;
        }
      }
    };

    setNextWord();

    let curPointer = 0;
    const maxPointers = Math.min(
      this.maxLen,
      (pos?.length ?? 0) + this.lettersLen - 1 - pos[pos.length - 1]
    );

    let posChanged = false;

    for (curPointer = 0; curPointer < maxPointers; curPointer++) {
      // check & fill as long as there's no skipped word
      // when there is skipped word, pop shift

      // all words are covered
      if (curWord >= this.wordsLen) {
        break;
      }

      // skipped word, need to pop shift
      if (curPointer < pos.length && pos[curPointer] >= curWordEnd) {
        if (curPointer === 0) {
          return null;
        }

        const newPos = pos.slice(0, curPointer);
        newPos[newPos.length - 1] += 1;
        const result = this._forceWordsConstraints(newPos);
        if (result === null) {
          return null;
        }
        return [true, result[1]];
      }

      // number of pointers remaining, including current pointer
      const numRemPointers = maxPointers - curPointer;

      // number of words need to be used
      const numRemWords = this.numWordConstraints - wordsUsed;

      // no possible arrangement exists
      if (numRemPointers < numRemWords) {
        return null;
      }

      // more pointers than words, extend if possible
      if (numRemPointers > numRemWords) {
        if (curPointer >= pos.length) {
          pos.push(pos[pos.length - 1] + 1);
          posChanged = true;
        }

        if (pos[curPointer] >= curWordOffset) {
          // guaranteed to not skip any words
          setNextWord();
        }

        continue;
      }

      // guaranteed numRemPointers == numRemWords, which we will either move or extend + move

      if (curPointer >= pos.length) {
        pos.push(curWordOffset);
        posChanged = true;
      } else if (pos[curPointer] < curWordOffset) {
        pos[curPointer] = curWordOffset;
        posChanged = true;
      }

      setNextWord();
    }

    return [posChanged, pos];
  }

  public _makeInitialCandidate(): [number[], number] | null {
    return this._makeValidCandidate(
      Array.from({ length: this.minLen }, (_, i) => i)
    );
  }

  private _makeLetters(pos: number[]): string {
    return pos.map((i) => this.letters[i]).join("");
  }

  calcPossibilitiesFixedLength(lettersLen, posLen) {
    if (posLen === lettersLen) {
      return 1;
    }

    if (posLen === 0) {
      return 1;
    }

    if (posLen === 1) {
      return lettersLen;
    }

    if (lettersLen in possibilityDp && posLen in possibilityDp[lettersLen]) {
      return possibilityDp[lettersLen][posLen];
    }

    // either we take the first letter, then allocate pos-1 letters for the rest
    // or we allocate all the letters for the rest
    const value =
      this.calcPossibilitiesFixedLength(lettersLen - 1, posLen - 1) +
      this.calcPossibilitiesFixedLength(lettersLen - 1, posLen);
    possibilityDp[lettersLen] = possibilityDp[lettersLen] ?? {};
    possibilityDp[lettersLen][posLen] = value;
    return value;
  }

  calcPossibilitiesRange(lettersLen, minLen, maxLen) {
    minLen = Math.max(minLen, 0);
    maxLen = Math.min(maxLen, lettersLen);
    if (maxLen < minLen) {
      return 0;
    }

    let possibilities = 0;
    for (let i = minLen; i <= maxLen; i++) {
      if (i > lettersLen) {
        break;
      }
      possibilities += this.calcPossibilitiesFixedLength(lettersLen, i);
    }
    return possibilities;
  }

  calcTotalPossibilities() {
    this.totalPossibilities = this.calcPossibilitiesRange(
      this.lettersLen,
      this.minLen,
      this.maxLen
    );

    return this.totalPossibilities;
  }

  calcProgress(): SearchProgress {
    if (!this.lastPos) {
      return new SearchProgress(0, this.totalPossibilities);
    }

    // if lastPos is not null then 1 pos has been searched. then for each position after minLen, one additional pos has been searched
    let searched = this.lastPos.length - this.minLen + 1;

    for (let i = 0; i < this.lastPos.length; ++i) {
      const pos = this.lastPos[i];
      const firstPossiblePos = i === 0 ? 0 : this.lastPos[i - 1] + 1; // first possible position that this ptr can be
      const needLetters = this.minLen - i - 1; // number of letters needed to meet minLen

      // each encountered zero means all the branches where that position is 1 has been searched
      for (let j = firstPossiblePos; j < pos; ++j) {
        searched += this.calcPossibilitiesRange(
          this.lettersLen - j - 1,
          needLetters,
          this.maxLen - i - 1
        );
      }
    }

    return new SearchProgress(searched, this.totalPossibilities);
  }

  nextCandidate(): Candidate | null {
    const candidate =
      this.lastPos.length === 0
        ? this._makeInitialCandidate()
        : this._nextValidCandidate();

    if (candidate === null) {
      // set lastPos to the last minLen indices
      this.lastPos = Array.from(
        { length: this.minLen },
        (_, i) => this.lettersLen - this.minLen + i
      );

      return null;
    }

    this.lastPos = candidate[0];
    return {
      word: this._makeLetters(candidate[0]),
      positions: candidate[0],
      score: candidate[1],
    };
  }
}
