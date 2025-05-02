<script lang="ts">
  import UserInput from "./user-input.svelte";

  let text = $state("");
</script>

<div class="max-w-[800px]">
  <!-- @ts-ignore -->
  <UserInput bind:text />
</div>
