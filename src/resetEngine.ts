import type { Entry, TodoList } from './types'

/** Compute when a recurring list's current cycle ends. */
export function computeNextResetDue(list: TodoList): Date | null {
  if (list.list_type !== 'recurring' || !list.last_reset_at || !list.reset_interval) {
    return null
  }
  const base = new Date(list.last_reset_at)
  const next = new Date(base)

  switch (list.reset_interval) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'custom':
      next.setDate(next.getDate() + Math.max(1, list.reset_n_days ?? 1))
      break
  }
  return next
}

export function isResetDue(list: TodoList, now: Date = new Date()): boolean {
  const due = computeNextResetDue(list)
  return due !== null && now >= due
}

/**
 * Snapshot each entry's current done state into completion history, then
 * clear all of them for the new cycle. Returns what needs persisting.
 */
export function performReset(
  list: TodoList,
  entries: Entry[],
  now: Date = new Date()
): {
  updatedList: TodoList
  updatedEntries: Entry[]
  completions: { entry_id: string; done: boolean; recorded_at: string }[]
} {
  const recordedAt = now.toISOString()
  const listEntries = entries.filter((e) => e.list_id === list.id)

  const completions = listEntries.map((e) => ({
    entry_id: e.id,
    done: e.done,
    recorded_at: recordedAt,
  }))

  const updatedEntries = entries.map((e) =>
    e.list_id === list.id ? { ...e, done: false } : e
  )

  const updatedList = { ...list, last_reset_at: recordedAt }

  return { updatedList, updatedEntries, completions }
}

export function describeInterval(list: TodoList): string {
  if (list.list_type !== 'recurring') return ''
  switch (list.reset_interval) {
    case 'daily':
      return 'Resets daily'
    case 'weekly':
      return 'Resets weekly'
    case 'monthly':
      return 'Resets monthly'
    case 'custom':
      return `Resets every ${list.reset_n_days ?? '?'} days`
    default:
      return ''
  }
}
