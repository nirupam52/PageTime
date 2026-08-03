import { describe, it, expect } from 'vitest'
import {
  browsingDataToCsv,
  dateKey,
  extractHostname,
  filterBrowsingData,
  formatTime,
  getTopSites,
  todayKey,
  totalSeconds
} from './utils'

describe('formatTime', () => {
  it('formats seconds under a minute', () => {
    expect(formatTime(40)).toBe('40s')
    expect(formatTime(0)).toBe('0s')
  })

  it('formats whole minutes', () => {
    expect(formatTime(60)).toBe('1m')
    expect(formatTime(119)).toBe('1m')
    expect(formatTime(3599)).toBe('59m')
  })

  it('formats hours without remainder', () => {
    expect(formatTime(3600)).toBe('1h')
    expect(formatTime(7200)).toBe('2h')
  })

  it('formats hours with remaining minutes', () => {
    expect(formatTime(3660)).toBe('1h 1m')
    expect(formatTime(7270)).toBe('2h 1m')
  })
})

describe('getTopSites', () => {
  const data = {
    'a.com': 600,
    'b.com': 500,
    'c.com': 400,
    'd.com': 300,
    'e.com': 200,
    'f.com': 100
  }

  it('sorts by time descending', () => {
    const result = getTopSites(data)
    expect(result[0].hostname).toBe('a.com')
    expect(result[0].seconds).toBe(600)
  })

  it('aggregates beyond limit into Others', () => {
    const result = getTopSites(data, 5)
    expect(result).toHaveLength(6)
    expect(result[5].hostname).toBe('Others')
    expect(result[5].seconds).toBe(100)
  })

  it('returns all entries when at or under limit', () => {
    const small = { 'x.com': 100, 'y.com': 200 }
    expect(getTopSites(small, 5)).toHaveLength(2)
  })
})

describe('todayKey', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('dateKey', () => {
  it('uses the local calendar date', () => {
    expect(dateKey(new Date(2026, 6, 28, 23, 59))).toBe('2026-07-28')
  })
})

describe('filterBrowsingData', () => {
  const data = {
    '2026-07-21': { 'old.example': 10 },
    '2026-07-22': { 'week.example': 20 },
    '2026-07-28': { 'today.example': 30, 'week.example': 40 }
  }
  const now = new Date(2026, 6, 28, 12)

  it('returns only today for the today view', () => {
    expect(filterBrowsingData(data, 'today', now)).toEqual({
      'today.example': 30,
      'week.example': 40
    })
  })

  it('uses a rolling seven-day window for the week view', () => {
    expect(filterBrowsingData(data, 'week', now)).toEqual({
      'week.example': 60,
      'today.example': 30
    })
  })

  it('groups www hosts with their root host', () => {
    expect(filterBrowsingData({
      '2026-07-28': { 'youtube.com': 30, 'www.youtube.com': 40 }
    }, 'all', now)).toEqual({ 'youtube.com': 70 })
  })

  it('returns every stored day for the all-time view', () => {
    const sites = filterBrowsingData(data, 'all', now)
    expect(totalSeconds(sites)).toBe(100)
  })
})

describe('browsingDataToCsv', () => {
  it('sorts rows and escapes quoted site names', () => {
    expect(browsingDataToCsv({
      '2026-07-28': { 'z.example': 2, 'a"site.example': 1 }
    })).toBe('date,site,seconds\r\n"2026-07-28","a""site.example","1"\r\n"2026-07-28","z.example","2"')
  })
})

describe('extractHostname', () => {
  it('extracts hostname from http URLs', () => {
    expect(extractHostname('http://github.com/some/path')).toBe('github.com')
  })

  it('extracts hostname from https URLs', () => {
    expect(extractHostname('https://www.youtube.com/watch?v=123')).toBe('youtube.com')
  })

  it('returns null for chrome internal pages', () => {
    expect(extractHostname('chrome://extensions')).toBeNull()
    expect(extractHostname('chrome://newtab/')).toBeNull()
  })

  it('returns null for about pages', () => {
    expect(extractHostname('about:blank')).toBeNull()
    expect(extractHostname('about:newtab')).toBeNull()
  })

  it('returns null for extension pages', () => {
    expect(extractHostname('moz-extension://abc123/popup.html')).toBeNull()
    expect(extractHostname('chrome-extension://abc123/popup.html')).toBeNull()
  })

  it('returns null for undefined or empty input', () => {
    expect(extractHostname(undefined)).toBeNull()
    expect(extractHostname('')).toBeNull()
  })

  it('returns null for malformed URLs', () => {
    expect(extractHostname('not a url')).toBeNull()
  })
})
