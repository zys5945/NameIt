<script lang="ts">
  import { fade } from "svelte/transition";

  import * as Table from "$lib/components/ui/table/index";

  interface $Props {
    input: string;
    results: [string, number[], number][];
  }

  let { input, results }: $Props = $props();

  function highlightLetters(text: string, positions: number[]): string {
    let html = "";
    let lastUnusedCharPos = 0;
    for (const pos of positions) {
      if (pos > lastUnusedCharPos) {
        html += text.slice(lastUnusedCharPos, pos);
      }
      html += `<span class="text-primary text-red-600">${text[pos]}</span>`;
      lastUnusedCharPos = pos + 1;
    }
    if (lastUnusedCharPos < text.length) {
      html += text.slice(lastUnusedCharPos);
    }
    return html;
  }
</script>

{#if results && results.length > 0}
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head>Name</Table.Head>
        <Table.Head class="text-right">Letters used</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each results as result (result[0])}
        <Table.Row>
          <Table.Cell>{result[0]}</Table.Cell>
          <Table.Cell class="text-right"
            >{@html highlightLetters(input, result[1])}</Table.Cell
          >
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
{/if}
