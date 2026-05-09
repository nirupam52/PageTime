<script lang="ts">
</script>

<main>
  <header>
    <h1>PageTime</h1>
    <p>Browsing time tracker</p>
  </header>

  <section>
    <p class="empty">Tracking engine loading in Phase 2...</p>
  </section>

  <footer>
    <p>Phase 1 — Foundation ✓</p>
  </footer>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    min-height: 480px;
  }

  header {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  h1 {
    font-size: 15px;
    font-weight: 600;
    color: #111;
    letter-spacing: -0.01em;
  }

  header p {
    font-size: 11px;
    color: #aaa;
    margin-top: 2px;
  }

  section {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .empty {
    font-size: 13px;
    color: #bbb;
  }

  footer {
    padding: 8px 16px 12px;
    border-top: 1px solid #f0f0f0;
  }

  footer p {
    font-size: 11px;
    color: #ddd;
    text-align: center;
  }
</style>
