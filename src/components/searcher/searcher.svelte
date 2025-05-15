<script lang="ts">
  import type { SearchWorkerInput } from "$lib/searcher/worker";
  import SearcherWorker from "$lib/searcher/worker?worker";

  import { ANIMATION_DATA } from "./animation-data";
  import UserInput from "./user-input.svelte";
  import ResultsTable from "./results-table.svelte";

  let placeholder = $state("Name");
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

    console.log(JSON.stringify(e.data.results.slice(0, 10)));
    displayResultsArray = e.data.results;
  };

  function query(input: SearchWorkerInput) {
    queryString = input.words.join("");
    error = "";
    displayResultsArray = null;

    searchId++;

    if (input.words.length === 0) {
      return;
    }

    input.words = input.words.map((x) => x.toLowerCase()); // only have bigram logits for lowercase letters

    input.searchId = searchId;
    worker.postMessage(input);
  }

  class Animator {
    data = ANIMATION_DATA;

    forwardFrameDuration = 150;
    backwradFrameDuration = 50;
    forwardChangeDirectionDuration = 3000;
    backwardChangeDirectionDuration = 500;

    currentDataIndex = 0;
    currentLetterEnd = 1;
    currentDirection = 0; // 0 = forward, 1 = backward

    timeoutId = null;

    getCurrentData() {
      return this.data[this.currentDataIndex];
    }

    tick = () => {
      const [aInput, aResults] = this.getCurrentData();

      placeholder = aInput.slice(0, this.currentLetterEnd);

      if (
        this.currentDirection === 0 &&
        this.currentLetterEnd === aInput.length
      ) {
        queryString = aInput.split(" ").join("");
        displayResultsArray = aResults;
      } else {
        queryString = "";
        displayResultsArray = null;
      }

      if (this.currentDirection === 0) {
        if (this.currentLetterEnd < aInput.length) {
          this.currentLetterEnd += 1;
          this.timeoutId = setTimeout(this.tick, this.forwardFrameDuration);
        } else {
          this.currentDirection = 1;
          this.currentLetterEnd -= 1;
          this.timeoutId = setTimeout(
            this.tick,
            this.forwardChangeDirectionDuration
          );
        }
      } else {
        if (this.currentLetterEnd > 0) {
          this.currentLetterEnd -= 1;
          this.timeoutId = setTimeout(this.tick, this.backwradFrameDuration);
        } else {
          this.currentDirection = 0;
          this.currentLetterEnd += 1;
          this.currentDataIndex =
            (this.currentDataIndex + 1) % this.data.length;
          this.timeoutId = setTimeout(
            this.tick,
            this.backwardChangeDirectionDuration
          );
        }
      }
    };

    stop = () => {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
    };
  }

  let animating = $state(true);
  const animator = new Animator();
  animator.tick();

  function stopAnimation() {
    if (!animating) {
      return;
    }

    animator.stop();

    placeholder = "Name";
    queryString = "";
    displayResultsArray = null;

    animating = false;
  }
</script>

<!-- have inputs in the middle if the user is not interacting with it, and there's no user-initiated search results -->
<div
  role="search"
  class="flex flex-col w-full max-w-[800px] absolute ml-auto mr-auto left-1/2 -translate-x-1/2 transition-all
   {inputFocus || (queryString !== '' && !animating)
    ? 'top-4'
    : 'top-1/2 -translate-y-1/2'}"
  onmouseenter={stopAnimation}
>
  <UserInput onquery={query} {placeholder} bind:inputFocus {error} />
  <ResultsTable input={queryString} results={displayResultsArray} />
</div>
