<script lang="ts">
  import { Progress } from "$lib/components/ui/progress/index";

  interface $Props {
    value: number;
  }

  let { value }: $Props = $props();
</script>

<div class="flex flex-col gap-2 mx-2 mb-4">
  <div class="flex items-center justify-between text-sm font-medium">
    <span id="progressLabel">Searching...</span>
    <span>{Math.trunc(value * 100) / 100}%</span>
  </div>
  <Progress
    innerClass="{value !== 0 && 'duration-500 ease-in-out'} {value === 100 &&
      'bg-green-500'}"
    aria-labelledby="progressLabel"
    {value}
    max={100}
  />
</div>
