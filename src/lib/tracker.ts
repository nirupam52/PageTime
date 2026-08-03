import browser from 'webextension-polyfill'
import type { TrackerState } from './types'
import { addSeconds, clearAllData, loadTrackerState, saveTrackerState } from './storage'
import { extractHostname } from './utils'

const ALARM_NAME = 'pagetime-flush'

let state: TrackerState = { hostname: null, startTime: null, isTracking: true }
let pending = Promise.resolve()

function queue<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation, operation)
  pending = next.then(() => undefined, () => undefined)
  return next
}

async function flush(): Promise<void> {
  if (!state.isTracking || !state.hostname || state.startTime === null) return
  const elapsed = Math.floor((Date.now() - state.startTime) / 1000)
  if (elapsed > 0) await addSeconds(state.hostname, elapsed)
  state.startTime = Date.now()
  await saveTrackerState(state)
}

async function setActiveHostname(hostname: string | null): Promise<void> {
  if (hostname === state.hostname) return
  await flush()
  state.hostname = hostname
  state.startTime = hostname && state.isTracking ? Date.now() : null
  await saveTrackerState(state)
}

async function pause(): Promise<void> {
  await flush()
  state.isTracking = false
  state.startTime = null
  await saveTrackerState(state)
}

async function resume(hostname: string | null): Promise<void> {
  state.isTracking = true
  state.hostname = hostname
  state.startTime = hostname ? Date.now() : null
  await saveTrackerState(state)
}

async function reset(): Promise<void> {
  await clearAllData()
  state.startTime = state.isTracking && state.hostname ? Date.now() : null
  await saveTrackerState(state)
}

async function getActiveHostname(): Promise<string | null> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab || tab.incognito) return null
    return extractHostname(tab.url)
  } catch {
    return null
  }
}

async function isFocusedTab(tab: browser.Tabs.Tab): Promise<boolean> {
  if (!tab.active || tab.incognito || tab.windowId === undefined) return false
  const window = await browser.windows.get(tab.windowId)
  return window.focused
}

export async function initTracker(): Promise<void> {
  state = await loadTrackerState()
  const hostname = state.isTracking ? await getActiveHostname() : null
  if (hostname === state.hostname && state.startTime !== null) {
    await flush()
  } else {
    state.hostname = hostname
    state.startTime = hostname ? Date.now() : null
    await saveTrackerState(state)
  }

  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
      const tab = await browser.tabs.get(tabId)
      if (await isFocusedTab(tab)) await queue(() => setActiveHostname(extractHostname(tab.url)))
    } catch { /* tab or window closed before we could read it */ }
  })

  browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
    if (!changeInfo.url) return
    try {
      if (await isFocusedTab(tab)) await queue(() => setActiveHostname(extractHostname(changeInfo.url)))
    } catch { /* tab or window closed before we could read it */ }
  })

  browser.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      await queue(pause)
    } else {
      await queue(async () => resume(await getActiveHostname()))
    }
  })

  browser.idle.setDetectionInterval(60)
  browser.idle.onStateChanged.addListener(async (idleState) => {
    if (idleState === 'idle' || idleState === 'locked') {
      await queue(pause)
    } else if (idleState === 'active') {
      await queue(async () => resume(await getActiveHostname()))
    }
  })

  browser.alarms.create(ALARM_NAME, { periodInMinutes: 1 })
  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) await queue(flush)
  })

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!message || typeof message !== 'object' || !('type' in message)) return
    if (message.type === 'flush') return queue(flush)
    if (message.type === 'reset') return queue(reset)
  })
}
