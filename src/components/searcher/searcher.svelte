<script lang="ts">
  import UserInput from "./user-input.svelte";
  import { Searcher } from "$lib/searcher/searcher.ts";

  let searcher: Searcher | null = null;

  function query(input: string) {
    if (!input) {
      return;
    }

    const words = input.split(" ");
    const constraints = new Array(words.length).fill(true);
    const minLength = input.length < 3 ? input.length : 3;

    console.log(words, constraints, minLength);

    searcher = new Searcher(words, constraints, minLength);

    const candidate = searcher.next_candidate();
    console.log(candidate);
  }
</script>

<div class="max-w-[800px]">
  <UserInput onquery={query} />
</div>
