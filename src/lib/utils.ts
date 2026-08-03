import type { BrowsingData, SiteEntry, TimeFilter } from './types'

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export function getTopSites(
  data: Record<string, number>,
  limit = 5
): SiteEntry[] {
  const entries: SiteEntry[] = Object.entries(data)
    .map(([hostname, seconds]) => ({ hostname, seconds }))
    .sort((a, b) => b.seconds - a.seconds)

  if (entries.length <= limit) return entries

  const top = entries.slice(0, limit)
  const othersSeconds = entries.slice(limit).reduce((sum, e) => sum + e.seconds, 0)
  return [...top, { hostname: 'Others', seconds: othersSeconds }]
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterBrowsingData(
  data: BrowsingData,
  filter: TimeFilter,
  now = new Date()
): Record<string, number> {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const earliest = filter === 'week'
    ? dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() - 6))
    : dateKey(start)

  return Object.entries(data).reduce<Record<string, number>>((sites, [date, record]) => {
    if (filter !== 'all' && date < earliest) return sites
    for (const [rawHostname, seconds] of Object.entries(record)) {
      const hostname = normalizeHostname(rawHostname)
      sites[hostname] = (sites[hostname] ?? 0) + seconds
    }
    return sites
  }, {})
}

export function totalSeconds(data: Record<string, number>): number {
  return Object.values(data).reduce((total, seconds) => total + seconds, 0)
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`
}

export function browsingDataToCsv(data: BrowsingData): string {
  const rows = ['date,site,seconds']
  for (const date of Object.keys(data).sort()) {
    const sites = filterBrowsingData({ [date]: data[date] }, 'all')
    for (const [hostname, seconds] of Object.entries(sites).sort(([a], [b]) => a.localeCompare(b))) {
      rows.push([date, hostname, seconds].map(csvCell).join(','))
    }
  }
  return rows.join('\r\n')
}

export function extractHostname(url: string | undefined): string | null {
  if (!url) return null
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? normalizeHostname(hostname) : null
  } catch {
    return null
  }
}

export function normalizeHostname(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}
