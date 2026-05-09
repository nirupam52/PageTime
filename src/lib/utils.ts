import type { SiteEntry } from './types'

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
  return new Date().toISOString().slice(0, 10)
}
