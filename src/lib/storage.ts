import browser from 'webextension-polyfill'
import type { BrowsingData, TrackerState } from './types'
import { todayKey } from './utils'

const DATA_KEY = 'browsingData'
const STATE_KEY = 'trackerState'

const DEFAULT_STATE: TrackerState = {
  hostname: null,
  startTime: null,
  isTracking: true
}

let dataWrite = Promise.resolve()

function queueDataWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = dataWrite.then(operation, operation)
  dataWrite = next.then(() => undefined, () => undefined)
  return next
}

export async function loadBrowsingData(): Promise<BrowsingData> {
  const result = await browser.storage.local.get(DATA_KEY)
  return (result[DATA_KEY] as BrowsingData) ?? {}
}

export async function addSeconds(hostname: string, seconds: number): Promise<void> {
  if (seconds <= 0) return
  await queueDataWrite(async () => {
    const key = todayKey()
    const data = await loadBrowsingData()
    if (!data[key]) data[key] = {}
    data[key][hostname] = (data[key][hostname] ?? 0) + seconds
    await browser.storage.local.set({ [DATA_KEY]: data })
  })
}

export async function clearAllData(): Promise<void> {
  await queueDataWrite(() => browser.storage.local.remove(DATA_KEY))
}

export async function loadTrackerState(): Promise<TrackerState> {
  const result = await browser.storage.session.get(STATE_KEY)
  return (result[STATE_KEY] as TrackerState) ?? DEFAULT_STATE
}

export async function saveTrackerState(state: TrackerState): Promise<void> {
  await browser.storage.session.set({ [STATE_KEY]: state })
}
