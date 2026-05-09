import { describe, it, expect } from 'vitest'
import { formatTime, getTopSites, todayKey } from './utils'

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
