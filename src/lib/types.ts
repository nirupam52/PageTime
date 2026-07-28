export type DailyRecord = Record<string, number>

export type BrowsingData = Record<string, DailyRecord>

export type TimeFilter = 'today' | 'week' | 'all'

export interface SiteEntry {
  hostname: string
  seconds: number
}

export interface TrackerState {
  hostname: string | null
  startTime: number | null
  isTracking: boolean
}
