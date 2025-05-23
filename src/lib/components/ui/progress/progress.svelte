<script lang="ts">
  import { Progress as ProgressPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  type $$Props = ProgressPrimitive.Props;

  let className: $$Props["class"] = undefined;
  let innerClassName: $$Props["innerClass"] = undefined;
  export let max: $$Props["max"] = 100;
  export let value: $$Props["value"] = undefined;
  export { className as class };
  export { innerClassName as innerClass };
</script>

<ProgressPrimitive.Root
  class={cn(
    "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
    className
  )}
  {...$$restProps}
>
  <div
    class={cn("bg-primary h-full w-full flex-1 transition-all", innerClassName)}
    style={`transform: translateX(-${100 - (100 * (value ?? 0)) / (max ?? 1)}%)`}
  ></div>
</ProgressPrimitive.Root>
