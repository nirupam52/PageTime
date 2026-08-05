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
        get: vi.fn((key: string): Promise<Record<string, unknown>> => Promise.resolve({ [key]: state.local[key] })),
        remove: vi.fn((key: string): Promise<void> => { delete state.local[key]; return Promise.resolve() }),
        set: vi.fn((values: Record<string, unknown>): Promise<void> => { Object.assign(state.local, values); return Promise.resolve() })
      },
      session: {
        get: vi.fn((key: string): Promise<Record<string, unknown>> => Promise.resolve({ [key]: state.session[key] })),
        set: vi.fn((values: Record<string, unknown>): Promise<void> => { Object.assign(state.session, values); return Promise.resolve() })
      }
    },
    tabs: { get: vi.fn(), onActivated: event(), onUpdated: event(), query: vi.fn(() => Promise.resolve(state.tabs)) },
    windows: {
      WINDOW_ID_NONE: -1,
      get: vi.fn((id: number) => Promise.resolve(state.windows.get(id))),
      getLastFocused: vi.fn(() => Promise.resolve({ id: 1, ...state.windows.get(1) })),
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

  it('starts tracking after an eligible navigation from an ineligible startup page', async () => {
    mock.state.tabs = [{ active: true, url: 'chrome://newtab', windowId: 1 }]
    vi.spyOn(Date, 'now').mockReturnValue(6_000)
    const { initTracker } = await import('../src/lib/tracker')

    await initTracker()
    const onUpdated = mock.browser.tabs.onUpdated.addListener.mock.calls[0][0]
    onUpdated(1, { url: 'https://example.com' }, { active: true, url: 'https://example.com', windowId: 1 })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mock.state.session.trackerState).toMatchObject({
      hostname: 'example.com',
      startTime: 6_000,
      isTracking: true
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
