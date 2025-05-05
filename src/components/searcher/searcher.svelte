<script lang="ts">
  import type { SearcherInput } from "$lib/searcher/searcher-input.ts";
  import SearcherWorker from "$lib/searcher/worker.ts?worker";

  import UserInput from "./user-input.svelte";

  const worker = new SearcherWorker();

  worker.onmessage = (e) => {
    const result = e.data;
    console.log(result);
  };

  function query(input: SearcherInput) {
    if (input.words.length === 0) {
      return;
    }
    worker.postMessage(input);
  }
</script>

<div class="max-w-[800px]">
  <UserInput onquery={query} />
</div>
