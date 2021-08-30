<script>
  import { Router } from 'svelte-hash-router'
  import { Events } from '@wails/runtime'
</script>

<style global>
  @import './style.css';
</style>
<svelte:body class="noselect"></svelte:body>

<div class="flex h-full">
  <Router />
</div>
