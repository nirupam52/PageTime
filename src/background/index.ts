import browser from 'webextension-polyfill'
import { initTracker, reconcileFocusedTab } from '../lib/tracker'

const STARTUP_RETRY_DELAY_MS = 1_000
// ponytail: retry for 30s while Chrome restores tabs; use a tab-ready lifecycle event if Chrome provides one.
const STARTUP_RETRY_LIMIT = 30

function reconcileAfterStartup(remaining = STARTUP_RETRY_LIMIT): void {
  setTimeout(() => {
    void reconcileFocusedTab().then(reconciled => {
      if (!reconciled && remaining > 1) reconcileAfterStartup(remaining - 1)
    })
  }, STARTUP_RETRY_DELAY_MS)
}

browser.runtime.onStartup.addListener(() => {
  void initTracker()
  reconcileAfterStartup()
})
browser.runtime.onInstalled.addListener(() => { void initTracker() })
