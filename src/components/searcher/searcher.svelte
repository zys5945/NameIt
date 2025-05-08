<script lang="ts">
  import _ from "lodash";

  import type { Candidate } from "$lib/searcher/searcher";
  import type { SearcherInput } from "$lib/searcher/searcher-input";
  import SearcherWorker from "$lib/searcher/worker?worker";

  import UserInput from "./user-input.svelte";
  import ResultsTable from "./results-table.svelte";

  let queryString = $state("");
  let displayResultsArray = $state(null);

  let searchId = 0;
  const worker = new SearcherWorker();

  worker.onmessage = (e) => {
    if (e.data.error) {
      // TODO: handle error
      console.error(e.data.error);
      return;
    }

    if (e.data.searchId !== searchId) {
      return;
    }

    displayResultsArray = e.data.results;
  };

  function query(input: SearcherInput) {
    if (input.words.length === 0) {
      return;
    }

    queryString = input.words.join("");
    displayResultsArray = null;

    input.words = input.words.map((x) => x.toLowerCase()); // only have bigram logits for lowercase letters

    searchId++;
    input.searchId = searchId;
    worker.postMessage(input);
  }
</script>

<div class="flex flex-col max-w-[800px]">
  <UserInput onquery={query} />
  <ResultsTable input={queryString} results={displayResultsArray} />
</div>
