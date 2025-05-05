<script lang="ts">
  interface $Props {
    results: string[];
  }
</script>

<div class="mt-4">
  {#if results.length > 0}
    <h2 class="text-lg font-semibold mb-2">Results:</h2>
    <ul class="space-y-1">
      {#each results as result}
        <li class="p-2 border rounded bg-gray-50 dark:bg-gray-800">{result}</li>
      {/each}
    </ul>
  {:else}
    <p class="text-gray-500">No results yet. Type in the search box above.</p>
  {/if}
</div>
