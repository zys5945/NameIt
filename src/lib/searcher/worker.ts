import { Searcher } from "./searcher";
import { SearcherInput } from "./searcher-input";

type IncomingMessageEvent = MessageEvent<SearcherInput>;
type ReplyData = { results: [string, number[], number][] } | { error: Error };

const RESPOND_INTERVAL = 100;

let currentSearchId = 0;

function reply(message: ReplyData) {
  postMessage(message);
}

function scheduleSlice(searcher: Searcher, searchId: number) {
  setTimeout(() => runSlice(searcher, searchId), RESPOND_INTERVAL);
}

function runSlice(searcher: Searcher, searchId: number) {
  const startTime = Date.now();

  if (searchId !== currentSearchId) {
    return;
  }

  const results = [];
  while (Date.now() - startTime < RESPOND_INTERVAL) {
    results.push(searcher.nextCandidate());
  }
  reply({ results: results });

  scheduleSlice(searcher, searchId);
}

function makeSearcher(input: SearcherInput): Searcher {
  const wordConstraints = input.useAllWords
    ? new Array(input.words.length).fill(true)
    : [];

  return new Searcher(
    input.words,
    wordConstraints,
    input.minLen,
    input.maxLen,
    input.useStats,
    input.greedyStatsPruning
  );
}

onmessage = (e: IncomingMessageEvent) => {
  currentSearchId++;
  const searchId = currentSearchId;

  if (e.data == null) {
    return;
  }

  try {
    const searcher = makeSearcher(e.data);
    scheduleSlice(searcher, searchId);
  } catch (e) {
    reply({ error: e });
  }
};
