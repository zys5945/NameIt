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

{#if results != null}
  {#if results.length === 0}
    <p class="text-center text-muted-foreground">No results</p>
  {:else}
    <Table.Root>
      <Table.Header>
        <Table.Row>
          {#if results}
            <Table.Head>Name</Table.Head>
            <Table.Head class="text-right">Letters used</Table.Head>
          {/if}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each results as result (result.word)}
          <Table.Row>
            <Table.Cell>{result.word}</Table.Cell>
            <Table.Cell class="text-right">
              {@html highlightLetters(input, result.positions)}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
{/if}
