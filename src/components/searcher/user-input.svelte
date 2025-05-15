<script lang="ts">
  import { Button } from "$lib/components/ui/button/index";
  import * as Collapsible from "$lib/components/ui/collapsible/index";
  import { Input } from "$lib/components/ui/input/index";
  import { Label } from "$lib/components/ui/label/index";
  import { Switch } from "$lib/components/ui/switch/index";
  import { Toggle } from "$lib/components/ui/toggle/index";

  import Moon from "lucide-svelte/icons/moon";
  import Settings from "lucide-svelte/icons/settings";
  import Sun from "lucide-svelte/icons/sun";
  import Warn from "lucide-svelte/icons/triangle-alert";

  import { toggleMode } from "mode-watcher";

  import type { SearchWorkerInput } from "$lib/searcher/worker";
  import Tooltip from "./tooltip.svelte";

  interface $Props {
    onquery: (input: SearchWorkerInput) => void;
    placeholder: string;
    inputFocus: boolean;
    error?: string | null;
  }
  let {
    onquery,
    placeholder,
    inputFocus = $bindable(),
    error,
  }: $Props = $props();

  let showSettings = $state(false);

  let text = $state("");
  let minLen = $state(3);
  let maxLen = $state<number | null>(null); // Use null for no limit initially
  let useStats = $state(true);
  let greedyStatsPruning = $state(true);
  let useAllWords = $state(true);

  // query when text or settings change
  $effect(() => {
    onquery({
      searchId: 0,
      words: text.split(" ").filter((w) => w.length > 0),
      minLen,
      maxLen,
      useStats,
      greedyStatsPruning,
      useAllWords,
    });
  });

  // disable greedy pruning if stats are disabled
  $effect(() => {
    if (!useStats) {
      greedyStatsPruning = false;
    }
  });
</script>

<div class="flex flex-col gap-2">
  <!-- Input -->
  <div class="flex flex-row gap-1">
    <Input
      bind:value={text}
      {placeholder}
      class="flex-grow"
      on:focusin={() => (inputFocus = true)}
      on:focusout={() => (inputFocus = false)}
    />

    <Toggle
      variant="outline"
      aria-label="Toggle settings panel"
      bind:pressed={showSettings}
    >
      <Settings class="h-5 w-5" />
      <span class="sr-only">Toggle Settings Panel</span>
    </Toggle>

    <Button class="pl-3 pr-3" on:click={toggleMode} variant="outline">
      <Sun
        class="rotate-0 h-5 w-5 scale-100 transition-all dark:-rotate-90 dark:scale-0"
      />
      <Moon
        class="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
      />
      <span class="sr-only">Toggle theme</span>
    </Button>
  </div>

  <Collapsible.Root bind:open={() => !!error, () => {}}>
    <Collapsible.Content>
      <div class="flex flex-row align-middle rounded-md border gap-2 p-2 -mt-1">
        <Warn class="h-5 w-5 text-yellow-700" />
        <p class="w-full text-yellow-700">{error}</p>
      </div>
    </Collapsible.Content>
  </Collapsible.Root>

  <Collapsible.Root bind:open={showSettings}>
    <Collapsible.Content>
      <div class="grid grid-cols-2 gap-4 rounded-md border p-4">
        <div class="flex flex-col gap-2">
          <div class="flex flex-row gap-2">
            <Label for="minLen">Min Length</Label>
            <Tooltip text="Minimum length of the resulting name." />
          </div>
          <Input id="minLen" type="number" bind:value={minLen} min="1" />
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex flex-row gap-2">
            <Label for="maxLen">Max Length (optional)</Label>
            <Tooltip
              text="Maximum length of the resulting name. If omittied, then no limit will be applied."
            />
          </div>
          <Input id="maxLen" type="number" bind:value={maxLen} min="0" />
        </div>
        <div class="flex items-center space-x-2">
          <Switch id="useStats" bind:checked={useStats} />
          <Label for="useStats">Use Bigram Stats</Label>
          <Tooltip
            text="If enabled, the searcher will use letter bigram stats to find better results."
          />
        </div>
        <div class="flex items-center space-x-2">
          <Switch id="greedyStats" bind:checked={greedyStatsPruning} />
          <Label for="greedyStats">Greedy Stats Pruning</Label>
          <Tooltip
            text="If enabled, the searcher will aggressively discard results that are unlikely to be correct, speeding up the search process."
          />
        </div>
        <div class="flex items-center space-x-2 col-span-full">
          <Switch id="useAllWords" bind:checked={useAllWords} />
          <Label for="useAllWords">Use All Words</Label>
          <Tooltip
            text="If enabled, the resulting name will contain at least one letter from each of the input words."
          />
        </div>
      </div>
    </Collapsible.Content>
  </Collapsible.Root>
</div>
