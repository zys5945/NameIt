<script lang="ts">
  import type { SearchWorkerInput } from "$lib/searcher/worker";
  import SearcherWorker from "$lib/searcher/worker?worker";

  import UserInput from "./user-input.svelte";
  import ResultsTable from "./results-table.svelte";

  let inputFocus = $state(false);
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

  function query(input: SearchWorkerInput) {
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

<!-- have inputs in the middle if the user is not interacting with it, and there's no user-initiated search results -->
<div
  class="flex flex-col w-full max-w-[800px] absolute ml-auto mr-auto left-1/2 -translate-x-1/2 transition-all
   {inputFocus || displayResultsArray ? 'top-4' : 'top-1/2 -translate-y-1/2'}"
>
  <UserInput onquery={query} bind:inputFocus {error} />
  <ResultsTable input={queryString} results={displayResultsArray} />
</div>
