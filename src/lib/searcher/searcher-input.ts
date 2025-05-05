export interface SearcherInput {
  words: string[];
  minLen: number;
  maxLen: number | null;
  useStats: boolean;
  greedyStatsPruning: boolean;
  useAllWords: boolean;
}
