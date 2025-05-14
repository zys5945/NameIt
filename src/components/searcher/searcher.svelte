<script lang="ts">
  import type { SearcherInput } from "$lib/searcher/searcher-input";
  import SearcherWorker from "$lib/searcher/worker?worker";

  import UserInput from "./user-input.svelte";
  import ResultsTable from "./results-table.svelte";

  let queryString = $state("");
  let error = $state("");
  let displayResultsArray = $state(null);

  let searchId = 0;
  const worker = new SearcherWorker();

  worker.onmessage = (e) => {
    if (e.data.error) {
      error = e.data.error.message;
      return;
    }

    if (e.data.searchId !== searchId) {
      return;
    }

    displayResultsArray = e.data.results;
  };

  function query(input: SearcherInput) {
    queryString = input.words.join("");
    error = "";
    displayResultsArray = null;

    if (input.words.length === 0) {
      return;
    }

    input.words = input.words.map((x) => x.toLowerCase()); // only have bigram logits for lowercase letters

    searchId++;
    input.searchId = searchId;
    worker.postMessage(input);
  }
</script>

<div class="flex flex-col max-w-[800px] ml-auto mr-auto">
  <UserInput onquery={query} {error} />
  <ResultsTable input={queryString} results={displayResultsArray} />
</div>
