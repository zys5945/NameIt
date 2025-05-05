import { Searcher } from "./searcher";

const RESPOND_INTERVAL = 100;

let currentSearchId = 0;

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
  postMessage(results);

  scheduleSlice(searcher, searchId);
}

onmessage = (e) => {
  currentSearchId++;
  const searchId = currentSearchId;

  if (e.data == null) {
    return;
  }

  const searcher = new Searcher(
    e.data.words,
    e.data.wordConstraints,
    e.data.minLen,
    e.data.maxLen
  );

  scheduleSlice(searcher, searchId);
};
