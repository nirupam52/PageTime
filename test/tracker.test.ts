import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey } from '../src/lib/utils'

const mock = vi.hoisted(() => {
  const state = {
    local: {} as Record<string, unknown>,
    session: {} as Record<string, unknown>,
    tabs: [] as Array<{ active?: boolean, incognito?: boolean, url?: string, windowId?: number }>,
    windows: new Map<number, { focused: boolean }>()
  }
  const event = () => ({ addListener: vi.fn() })
  const browser = {
    alarms: { create: vi.fn(), onAlarm: event() },
    idle: { onStateChanged: event(), setDetectionInterval: vi.fn() },
    runtime: { onMessage: event() },
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
    tabs: { get: vi.fn(), onActivated: event(), onUpdated: event(), query: vi.fn(async () => state.tabs) },
    windows: {
      WINDOW_ID_NONE: -1,
      get: vi.fn(async (id: number) => state.windows.get(id)),
      getLastFocused: vi.fn(async () => ({ id: 1, ...state.windows.get(1) })),
      onFocusChanged: event()
    }
  }
  return { browser, state }
})

vi.mock('webextension-polyfill', () => ({ default: mock.browser }))

describe('initTracker', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mock.state.local = {}
    mock.state.session = {
      trackerState: { hostname: 'example.com', startTime: 1_000, isTracking: true }
    }
    mock.state.tabs = [{ active: true, url: 'https://example.com', windowId: 1 }]
    mock.state.windows = new Map([[1, { focused: true }]])
  })

  it('registers tracking listeners before asynchronous startup work', async () => {
    await import('../src/background/index')

    expect(mock.browser.tabs.onActivated.addListener).toHaveBeenCalledOnce()
    expect(mock.browser.tabs.onUpdated.addListener).toHaveBeenCalledOnce()
    expect(mock.browser.windows.onFocusChanged.addListener).toHaveBeenCalledOnce()
    expect(mock.browser.alarms.onAlarm.addListener).toHaveBeenCalledOnce()
    expect(mock.browser.runtime.onMessage.addListener).toHaveBeenCalledOnce()
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

  it('does not start tracking when the last Chrome window is unfocused', async () => {
    mock.state.windows = new Map([[1, { focused: false }]])
    const { initTracker } = await import('../src/lib/tracker')

    await initTracker()

    expect(mock.state.session.trackerState).toMatchObject({ hostname: null, startTime: null })
  })

  it('does not install an idle timeout', async () => {
    const { initTracker } = await import('../src/lib/tracker')

    await initTracker()

    expect(mock.browser.idle.setDetectionInterval).not.toHaveBeenCalled()
    expect(mock.browser.idle.onStateChanged.addListener).not.toHaveBeenCalled()
  })
})
