<script lang="ts">
  import { ModeWatcher } from "mode-watcher";
  import "./app.css";
  import Searcher from "./components/searcher/searcher.svelte";
</script>

<ModeWatcher disableTransitions={false} defaultMode="system" />

<Searcher />
