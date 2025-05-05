<script lang="ts">
  import UserInput from "./user-input.svelte";

  import SearcherWorker from "$lib/searcher/worker.ts?worker";

  const worker = new SearcherWorker();

  function query(input: string) {
    if (!input) {
      return;
    }

    const words = input.split(" ");
    const constraints = new Array(words.length).fill(true);
    const minLength = input.length < 3 ? input.length : 3;

    // console.log(words, constraints, minLength);
  }
</script>

<div class="max-w-[800px]">
  <UserInput onquery={query} />
</div>
