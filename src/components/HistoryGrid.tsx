import type { Entry, EntryCompletion } from '../types'
import { flattenTree } from '../entryTree'

interface Props {
  entries: Entry[]
  completions: EntryCompletion[]
  maxCycles?: number
}

export default function HistoryGrid({ entries, completions, maxCycles = 14 }: Props) {
  if (completions.length === 0) {
    return (
      <p className="history-empty">
        No completion history yet — it'll fill in after the first reset.
      </p>
    )
  }

  // Group completions into cycles by their recorded_at timestamp
  const cycleMap = new Map<string, Map<string, boolean>>()
  for (const c of completions) {
    const cycle = cycleMap.get(c.recorded_at) ?? new Map<string, boolean>()
    cycle.set(c.entry_id, c.done)
    cycleMap.set(c.recorded_at, cycle)
  }

  const cycles = Array.from(cycleMap.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-maxCycles)

  const rows = flattenTree(entries)

  return (
    <div className="history-grid-wrapper">
      <table className="history-grid">
        <thead>
          <tr>
            <th className="history-entry-col">Entry</th>
            {cycles.map(([recordedAt]) => (
              <th key={recordedAt} title={new Date(recordedAt).toLocaleString()}>
                {new Date(recordedAt).toLocaleDateString(undefined, {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td className="history-entry-col" style={{ paddingLeft: entry.depth * 14 }}>
                {entry.content}
              </td>
              {cycles.map(([recordedAt, cycle]) => {
                const done = cycle.get(entry.id)
                return (
                  <td key={recordedAt} className={done ? 'history-done' : 'history-missed'}>
                    {done === undefined ? '' : done ? '✓' : '·'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
