<script lang="ts">
  import { onMount } from 'svelte'
  import browser from 'webextension-polyfill'
  import type { BrowsingData, TimeFilter } from '../lib/types'
  import {
    browsingDataToCsv,
    filterBrowsingData,
    formatTime,
    getTopSites,
    totalSeconds
  } from '../lib/utils'
  import { loadBrowsingData } from '../lib/storage'

  const filters = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'all', label: 'All time' }
  ] satisfies { value: TimeFilter, label: string }[]

  let data = $state.raw<BrowsingData>({})
  let filter = $state<TimeFilter>('today')
  let loading = $state(true)
  let error = $state('')

  let filteredData = $derived(filterBrowsingData(data, filter))
  let sites = $derived(getTopSites(filteredData))
  let total = $derived(totalSeconds(filteredData))

  async function refresh(): Promise<void> {
    loading = true
    error = ''
    try {
      await browser.runtime.sendMessage({ type: 'flush' })
      data = await loadBrowsingData()
    } catch {
      error = 'Could not load browsing data. Try reopening the popup.'
    } finally {
      loading = false
    }
  }

  async function resetData(): Promise<void> {
    if (!window.confirm('Delete all PageTime data from this browser?')) return
    error = ''
    try {
      await browser.runtime.sendMessage({ type: 'reset' })
      data = {}
    } catch {
      error = 'Could not reset browsing data. Try again.'
    }
  }

  function downloadCsv(): void {
    const blob = new Blob([browsingDataToCsv(data)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pagetime.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  onMount(() => {
    void refresh()
  })
</script>

<main>
  <header>
    <div>
      <h1>PageTime</h1>
      <p>Stored only in this browser</p>
    </div>
    <button class="icon-button" type="button" onclick={refresh} aria-label="Refresh data" title="Refresh data">↻</button>
  </header>

  <nav aria-label="Time range">
    {#each filters as option (option.value)}
      <button
        type="button"
        class={filter === option.value ? 'active' : undefined}
        aria-pressed={filter === option.value}
        onclick={() => filter = option.value}
      >
        {option.label}
      </button>
    {/each}
  </nav>

  <section class="summary" aria-live="polite">
    <span>Total</span>
    <strong>{formatTime(total)}</strong>
  </section>

  <section class="sites" aria-label="Most visited sites" aria-busy={loading}>
    {#if loading}
      <p class="status">Loading…</p>
    {:else if error}
      <p class="status error">{error}</p>
    {:else if sites.length === 0}
      <p class="status">No tracked time yet. Browse an HTTP or HTTPS site, then refresh.</p>
    {:else}
      <ol>
        {#each sites as site (site.hostname)}
          <li>
            <span title={site.hostname}>{site.hostname}</span>
            <strong>{formatTime(site.seconds)}</strong>
          </li>
        {/each}
      </ol>
    {/if}
  </section>

  <footer>
    <button type="button" onclick={downloadCsv} disabled={Object.keys(data).length === 0}>Download CSV</button>
    <button class="danger" type="button" onclick={resetData} disabled={Object.keys(data).length === 0}>Reset data</button>
  </footer>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    min-height: 420px;
  }

  header, footer, nav, .summary, li {
    display: flex;
    align-items: center;
  }

  header {
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  h1 {
    font-size: 17px;
    letter-spacing: -0.02em;
  }

  header p, .summary span {
    color: #6b7280;
    font-size: 12px;
    margin-top: 2px;
  }

  button {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #fff;
    color: #374151;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    padding: 7px 9px;
  }

  button:hover:not(:disabled), button.active {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  button:focus-visible {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: .45;
  }

  .icon-button {
    font-size: 18px;
    line-height: 1;
    padding: 4px 8px 6px;
  }

  nav {
    gap: 6px;
    padding: 12px 16px 0;
  }

  .summary {
    justify-content: space-between;
    margin: 16px;
    padding: 15px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .summary span { margin: 0; }

  .summary strong {
    font-size: 25px;
    letter-spacing: -0.03em;
  }

  .sites {
    flex: 1;
    padding: 0 16px 16px;
  }

  ol {
    list-style: none;
    width: 100%;
  }

  li {
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #f0f0f0;
    padding: 11px 2px;
  }

  li span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  li strong { font-size: 13px; }

  .status {
    color: #6b7280;
    font-size: 13px;
    line-height: 1.45;
    margin: 24px 0;
    text-align: center;
    width: 100%;
  }

  .error { color: #b91c1c; }

  footer {
    border-top: 1px solid #e5e7eb;
    gap: 8px;
    justify-content: flex-end;
    padding: 12px 16px;
  }

  .danger { color: #b91c1c; }
</style>
