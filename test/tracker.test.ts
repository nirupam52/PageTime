import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKey } from '../src/lib/utils'

type Tab = { active?: boolean, incognito?: boolean, url?: string, windowId?: number }
type OnUpdated = (tabId: number, changeInfo: { url?: string }, tab: Tab) => void
type OnMessage = (message: unknown) => Promise<void> | void

const mock = vi.hoisted(() => {
  const state = {
    local: {} as Record<string, unknown>,
    session: {} as Record<string, unknown>,
    tabs: [] as Tab[],
    windows: new Map<number, { focused: boolean }>()
  }
  const listeners: { onMessage?: OnMessage, onStartup?: () => void, onUpdated?: OnUpdated } = {}
  const event = () => ({ addListener: vi.fn() })
  const browser = {
    alarms: { create: vi.fn(), onAlarm: event() },
    idle: { onStateChanged: event(), setDetectionInterval: vi.fn() },
    runtime: {
      onInstalled: event(),
      onMessage: { addListener: vi.fn((listener: OnMessage) => { listeners.onMessage = listener }) },
      onStartup: { addListener: vi.fn((listener: () => void) => { listeners.onStartup = listener }) }
    },
    storage: {
      local: {
        get: vi.fn((key: string): Promise<Record<string, unknown>> => Promise.resolve({ [key]: state.local[key] })),
        remove: vi.fn((key: string): Promise<void> => { delete state.local[key]; return Promise.resolve() }),
        set: vi.fn((values: Record<string, unknown>): Promise<void> => { Object.assign(state.local, values); return Promise.resolve() })
      },
      session: {
        get: vi.fn((key: string): Promise<Record<string, unknown>> => Promise.resolve({ [key]: state.session[key] })),
        set: vi.fn((values: Record<string, unknown>): Promise<void> => { Object.assign(state.session, values); return Promise.resolve() })
      }
    },
    tabs: {
      get: vi.fn(),
      onActivated: event(),
      onUpdated: { addListener: vi.fn((listener: OnUpdated) => { listeners.onUpdated = listener }) },
      query: vi.fn(() => Promise.resolve(state.tabs))
    },
    windows: {
      WINDOW_ID_NONE: -1,
      get: vi.fn((id: number) => Promise.resolve(state.windows.get(id))),
      getLastFocused: vi.fn(() => Promise.resolve({ id: 1, ...state.windows.get(1) })),
      onFocusChanged: event()
    }
  }
  return { browser, listeners, state }
})

vi.mock('webextension-polyfill', () => ({ default: mock.browser }))

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('initTracker', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mock.listeners.onMessage = undefined
    mock.listeners.onStartup = undefined
    mock.listeners.onUpdated = undefined
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
    expect(mock.browser.runtime.onStartup.addListener).toHaveBeenCalledOnce()
    expect(mock.browser.runtime.onInstalled.addListener).toHaveBeenCalledOnce()
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

  it('records an eligible navigation received while startup is restoring state', async () => {
    mock.state.tabs = [{ active: true, url: 'chrome://newtab', windowId: 1 }]
    mock.state.session = {}
    let now = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const { initTracker } = await import('../src/lib/tracker')

    const initialization = initTracker()
    mock.listeners.onUpdated?.(1, { url: 'https://example.com' }, { active: true, url: 'https://example.com', windowId: 1 })
    await initialization
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledTimes(2))

    now = 6_000
    await mock.listeners.onMessage?.({ type: 'flush' })

    expect(mock.state.local).toMatchObject({
      browsingData: { [todayKey()]: { 'example.com': 5 } }
    })
    vi.restoreAllMocks()
  })

  it('records an interval started at Chrome profile startup', async () => {
    mock.state.session = {}
    let now = 1_000
    vi.useFakeTimers()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    await import('../src/background/index')

    const onStartup = mock.listeners.onStartup
    if (!onStartup) throw new Error('startup listener was not registered')
    onStartup()
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledOnce())

    now = 6_000
    await mock.listeners.onMessage?.({ type: 'flush' })

    expect(mock.state.local).toMatchObject({
      browsingData: { [todayKey()]: { 'example.com': 5 } }
    })
    vi.restoreAllMocks()
  })

  it('reconciles a tab restored after Chrome profile startup', async () => {
    mock.state.session = {}
    mock.state.tabs = []
    mock.state.windows = new Map([[1, { focused: false }]])
    let now = 1_000
    vi.useFakeTimers()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    await import('../src/background/index')

    const onStartup = mock.listeners.onStartup
    if (!onStartup) throw new Error('startup listener was not registered')
    onStartup()
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledOnce())

    now = 2_000
    await vi.advanceTimersByTimeAsync(1_000)
    mock.state.tabs = [{ active: true, url: 'https://example.com', windowId: 1 }]
    mock.state.windows = new Map([[1, { focused: true }]])
    now = 3_000
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledTimes(2))

    now = 8_000
    await mock.listeners.onMessage?.({ type: 'flush' })

    expect(mock.state.local).toMatchObject({
      browsingData: { [todayKey()]: { 'example.com': 5 } }
    })
    vi.restoreAllMocks()
  })

  it('stops startup reconciliation after thirty retries', async () => {
    mock.state.session = {}
    mock.state.tabs = [{ active: true, url: 'chrome://newtab', windowId: 1 }]
    let now = 1_000
    vi.useFakeTimers()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    await import('../src/background/index')

    const onStartup = mock.listeners.onStartup
    if (!onStartup) throw new Error('startup listener was not registered')
    onStartup()
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledOnce())

    now = 31_000
    await vi.runAllTimersAsync()

    expect(mock.browser.tabs.query).toHaveBeenCalledTimes(31)
    vi.restoreAllMocks()
  })

  it('does not credit an unobserved hostname change during startup reconciliation', async () => {
    let now = 1_000
    vi.useFakeTimers()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    await import('../src/background/index')

    const onStartup = mock.listeners.onStartup
    if (!onStartup) throw new Error('startup listener was not registered')
    onStartup()
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledOnce())

    mock.state.tabs = [{ active: true, url: 'https://other.example', windowId: 1 }]
    now = 2_000
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.waitFor(() => expect(mock.browser.storage.session.set).toHaveBeenCalledTimes(2))

    now = 7_000
    await mock.listeners.onMessage?.({ type: 'flush' })

    expect(mock.state.local).toEqual({
      browsingData: { [todayKey()]: { 'other.example': 5 } }
    })
    vi.restoreAllMocks()
  })

  it('does not install an idle timeout', async () => {
    const { initTracker } = await import('../src/lib/tracker')

    await initTracker()

    expect(mock.browser.idle.setDetectionInterval).not.toHaveBeenCalled()
    expect(mock.browser.idle.onStateChanged.addListener).not.toHaveBeenCalled()
  })
})
