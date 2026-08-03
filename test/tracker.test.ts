import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey } from '../src/lib/utils'

const mock = vi.hoisted(() => {
  const state = {
    local: {} as Record<string, unknown>,
    session: {} as Record<string, unknown>,
    tabs: [] as Array<{ incognito?: boolean, url?: string }>
  }
  const event = { addListener: vi.fn() }
  const browser = {
    alarms: { create: vi.fn(), onAlarm: event },
    idle: { onStateChanged: event, setDetectionInterval: vi.fn() },
    runtime: { onMessage: event },
    storage: {
      local: {
        get: vi.fn(async (key: string): Promise<Record<string, unknown>> => ({ [key]: state.local[key] })),
        remove: vi.fn(async (key: string): Promise<void> => { delete state.local[key] }),
        set: vi.fn(async (values: Record<string, unknown>): Promise<void> => { Object.assign(state.local, values) })
      },
      session: {
        get: vi.fn(async (key: string): Promise<Record<string, unknown>> => ({ [key]: state.session[key] })),
        set: vi.fn(async (values: Record<string, unknown>): Promise<void> => { Object.assign(state.session, values) })
      }
    },
    tabs: { get: vi.fn(), onActivated: event, onUpdated: event, query: vi.fn(async () => state.tabs) },
    windows: { WINDOW_ID_NONE: -1, onFocusChanged: event }
  }
  return { browser, state }
})

vi.mock('webextension-polyfill', () => ({ default: mock.browser }))

describe('initTracker', () => {
  beforeEach(() => {
    vi.resetModules()
    mock.state.local = {}
    mock.state.session = {
      trackerState: { hostname: 'example.com', startTime: 1_000, isTracking: true }
    }
    mock.state.tabs = [{ url: 'https://example.com' }]
  })

  it('flushes elapsed time restored after a service-worker restart', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(6_000)
    const { initTracker } = await import('../src/lib/tracker')

    await initTracker()

    expect(mock.state.local).toMatchObject({
      browsingData: { [todayKey()]: { 'example.com': 5 } }
    })
    expect(mock.state.session.trackerState).toMatchObject({ startTime: 6_000 })
    vi.restoreAllMocks()
  })
})
