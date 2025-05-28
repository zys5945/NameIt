import {
  Searcher,
  Candidate,
  SearcherResults,
  SearchProgress,
} from "./searcher";

/**
 * if null is sent, then the existing searcher will stop and get dropped
 */
export interface SearchWorkerInput {
  searchId: number;
  words: string[];
  minLen: number | null;
  maxLen: number | null;
  wordConstraints: boolean[];
  useStats: boolean;
  greedyStatsPruning: boolean;
}

type IncomingMessageEvent = MessageEvent<SearchWorkerInput | null>;
export type ReplyData =
  | { searchId: number; results: Candidate[]; progress: SearchProgress }
  | { error: Error };

const RESPOND_INTERVAL = 200;
const SEARCH_RESULTS_SIZE = 500;
let currentSearchId = 0;

function reply(message: ReplyData) {
  postMessage(message);
}

function scheduleSlice(
  searcher: Searcher,
  results: SearcherResults,
  searchId: number
) {
  setTimeout(() => runSlice(searcher, results, searchId), RESPOND_INTERVAL);
}

function runSlice(
  searcher: Searcher,
  results: SearcherResults,
  searchId: number
) {
  const startTime = Date.now();

  if (searchId !== currentSearchId) {
    return;
  }

  let hasMore = true;

  while (Date.now() - startTime < RESPOND_INTERVAL) {
    const candidate = searcher.nextCandidate();
    if (candidate === null) {
      hasMore = false;
      break;
    }
    results.add(candidate);
  }
  reply({
    searchId,
    results: results.results,
    progress: searcher.calcProgress(),
  });

  if (hasMore) {
    scheduleSlice(searcher, results, searchId);
  }
}

function makeSearcher(input: SearchWorkerInput): Searcher {
  return new Searcher(
    input.words,
    input.wordConstraints,
    input.minLen ?? 0,
    input.maxLen,
    input.useStats,
    input.greedyStatsPruning
  );
}

onmessage = (e: IncomingMessageEvent) => {
  if (e.data == null) {
    return;
  }

  currentSearchId = e.data.searchId;

  try {
    const searcher = makeSearcher(e.data);
    const results = new SearcherResults(SEARCH_RESULTS_SIZE);
    scheduleSlice(searcher, results, currentSearchId);
  } catch (e) {
    reply({ error: e });
  }
};
