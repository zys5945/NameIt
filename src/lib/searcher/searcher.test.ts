import { Searcher } from "./searcher";
import { expect, test } from "vitest";

test("word constraints", () => {
  let s = new Searcher(["cat", "dog"], [true, true], 2);
  expect(s._force_words_constraints([0])).toEqual([true, [0, 1, 2, 3]]);
  expect(s._force_words_constraints([0, 1])).toEqual([true, [0, 1, 2, 3]]);
  expect(s._force_words_constraints([0, 2])).toEqual([true, [0, 2, 3]]);
  expect(s._force_words_constraints([0, 3])).toEqual([false, [0, 3]]);
  expect(s._force_words_constraints([0, 4])).toEqual([false, [0, 4]]);
  expect(s._force_words_constraints([0, 5])).toEqual([false, [0, 5]]);
  expect(s._force_words_constraints([0, 6])).toEqual([true, [1, 2, 3]]);
  expect(s._force_words_constraints([1, 4])).toEqual([false, [1, 4]]);
  expect(s._force_words_constraints([3, 4])).toEqual(null);

  s = new Searcher(["cat", "dog"], [true, true], 3);
  expect(s._force_words_constraints([0, 1, 2])).toEqual([true, [0, 1, 2, 3]]);
  expect(s._force_words_constraints([0, 2, 3])).toEqual([false, [0, 2, 3]]);
  expect(s._force_words_constraints([0, 2, 4])).toEqual([false, [0, 2, 4]]);
  expect(s._force_words_constraints([1, 2, 4])).toEqual([false, [1, 2, 4]]);
  expect(s._force_words_constraints([3, 4, 5])).toEqual(null);
  expect(s._force_words_constraints([0, 1, 3, 4])).toEqual([
    false,
    [0, 1, 3, 4],
  ]);

  s = new Searcher(["cat", "dog", "mouse"], [true, true, true], 3);
  expect(s._force_words_constraints([0, 1, 2])).toEqual([
    true,
    [0, 1, 2, 3, 4, 5, 6],
  ]);
  expect(s._force_words_constraints([1, 3, 6])).toEqual([false, [1, 3, 6]]);
  expect(s._force_words_constraints([1, 2, 3])).toEqual([
    true,
    [1, 2, 3, 4, 5, 6],
  ]);
  expect(s._force_words_constraints([1, 6, 7, 8])).toEqual([
    true,
    [2, 3, 4, 5, 6],
  ]);
  expect(s._force_words_constraints([1, 6, 7])).toEqual([
    true,
    [2, 3, 4, 5, 6],
  ]);
  expect(s._force_words_constraints([3, 7, 8])).toEqual(null);

  s = new Searcher(["cat", "dog", "mouse"], [true, true, true], 3, 3);
  expect(s._force_words_constraints([0, 1, 2])).toEqual([true, [0, 3, 6]]);
  expect(s._force_words_constraints([1, 6, 7])).toEqual([true, [2, 3, 6]]);

  s = new Searcher(["cat", "dog", "mouse"], [true, true, true], 3, 4);
  expect(s._force_words_constraints([0, 1, 2])).toEqual([true, [0, 1, 3, 6]]);
  expect(s._force_words_constraints([1, 6, 7])).toEqual([true, [2, 3, 4, 6]]);

  s = new Searcher(["a", "b", "c", "d"], [true, true, true, true], 4);
  expect(s._force_words_constraints([0, 1, 2, 3])).toEqual([
    false,
    [0, 1, 2, 3],
  ]);

  expect(() => {
    new Searcher(
      ["a", "b", "c", "d", "f"],
      [true, true, true, true, true],
      1,
      4
    );
  }).toThrowError();
});

test("next valid pos", () => {
  let s = new Searcher(["cat", "dog"], [true, true], 2, null, false);
  s.last_pos = [0, 1];
  expect(s._next_valid_candidate()?.[0]).toEqual([0, 1, 2, 3]);
  s.last_pos = [2, 3, 4, 5];
  expect(s._next_valid_candidate()?.[0]).toEqual([2, 3, 5]);
  s.last_pos = [2, 5];
  expect(s._next_valid_candidate()).toEqual(null);

  s = new Searcher(["cat", "dog"], [true, true], 2, 2, false);
  s.last_pos = [0, 1];
  expect(s._next_valid_candidate()?.[0]).toEqual([0, 3]);
  s.last_pos = [1, 3];
  expect(s._next_valid_candidate()?.[0]).toEqual([1, 4]);
  s.last_pos = [2, 5];
  expect(s._next_valid_candidate()).toEqual(null);

  s = new Searcher(["cat", "dog"], [true, true], 3, null, false);
  s.last_pos = [0, 1, 3];
  expect(s._next_valid_candidate()?.[0]).toEqual([0, 1, 3, 4]);

  s = new Searcher(["cute", "dog"], [true, true], 3, null, false);
  s.last_pos = [0, 1, 3];
  expect(s._next_valid_candidate()?.[0]).toEqual([0, 1, 3, 4]);

  s = new Searcher(["cat", "dog", "mouse"], [true, true, true], 3, null, false);
  s.last_pos = [0, 5, 10];
  expect(s._next_valid_candidate()?.[0]).toEqual([1, 2, 3, 4, 5, 6]);

  s.last_pos = [0, 4, 5];
  expect(s._next_valid_candidate()?.[0]).toEqual([0, 4, 5, 6]);

  s.last_pos = [0, 4];
  expect(s._next_valid_candidate()?.[0]).toEqual([0, 4, 5, 6]);
});

test("make initial pos", () => {
  let s = new Searcher(
    ["a", "b", "c", "d"],
    [true, true, true, true],
    4,
    null,
    false
  );
  expect(s._make_initial_candidate()?.[0]).toEqual([0, 1, 2, 3]);

  s = new Searcher(
    ["abc", "def", "ghi", "jkl"],
    [true, true, true, true],
    2,
    null,
    false
  );
  expect(s._make_initial_candidate()?.[0]).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  ]);
});
