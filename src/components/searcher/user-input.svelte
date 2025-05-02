<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Toggle } from "$lib/components/ui/toggle/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import Moon from "lucide-svelte/icons/moon";
  import Settings from "lucide-svelte/icons/settings";
  import Sun from "lucide-svelte/icons/sun";
  import { toggleMode } from "mode-watcher";

  interface $Props {
    text: string;
  }

  let { text = $bindable("") } = $props() as $Props;
</script>

<div class="flex flex-row gap-1">
  <Input bind:value={text} />

  <Toggle variant="outline" aria-label="Toggle settings panel">
    <Settings class="h-5 w-5" />
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
