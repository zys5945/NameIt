<script lang="ts">
  import * as Tooltip from "$lib/components/ui/tooltip/index";
  import CircleHelp from "lucide-svelte/icons/circle-help";

  interface $Props {
    text: string;
  }

  const { text }: $Props = $props();
</script>

<Tooltip.Root openDelay="0">
  <Tooltip.Trigger><CircleHelp class="h-4 w-4" /></Tooltip.Trigger>
  <Tooltip.Content>
    <p>{text}</p>
  </Tooltip.Content>
</Tooltip.Root>
