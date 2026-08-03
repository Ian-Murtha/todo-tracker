import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import EntryRow from './EntryRow'
import HistoryGrid from './HistoryGrid'
import { flattenTree, computeDropZone, type DropZone } from '../entryTree'
import { describeInterval, computeNextResetDue } from '../resetEngine'
import type { Entry, EntryCompletion, ListType, ResetInterval, TodoList } from '../types'

interface Props {
  list: TodoList
  entries: Entry[]
  completions: EntryCompletion[]
  onAddEntry: (content: string, parentId?: string | null) => void
  onToggleEntry: (id: string, done: boolean) => void
  onEditEntry: (id: string, content: string) => void
  onDeleteEntry: (id: string) => void
  onToggleCollapsedEntry: (id: string, collapsed: boolean) => void
  onMoveEntry: (draggedId: string, overId: string, zone: DropZone) => void
  onUpdateListSettings: (id: string, patch: Partial<TodoList>) => void
  onManualReset: (list: TodoList) => void
}

export default function ListView({
  list,
  entries,
  completions,
  onAddEntry,
  onToggleEntry,
  onEditEntry,
  onDeleteEntry,
  onToggleCollapsedEntry,
  onMoveEntry,
  onUpdateListSettings,
  onManualReset,
}: Props) {
  const [newEntry, setNewEntry] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overState, setOverState] = useState<{ id: string; zone: DropZone } | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleAdd = () => {
    const trimmed = newEntry.trim()
    if (!trimmed) return
    onAddEntry(trimmed, null)
    setNewEntry('')
  }

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id))

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      setOverState(null)
      return
    }
    const activeRect = active.rect.current.translated
    const overRect = over.rect
    if (!activeRect || !overRect) return
    setOverState({ id: String(over.id), zone: computeDropZone(activeRect, overRect) })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverState(null)
    if (!over || active.id === over.id) return
    const activeRect = active.rect.current.translated
    const overRect = over.rect
    if (!activeRect || !overRect) return
    onMoveEntry(String(active.id), String(over.id), computeDropZone(activeRect, overRect))
  }

  const flat = flattenTree(entries)
  const totalCount = entries.length
  const remaining = entries.filter((e) => !e.done).length

  const nextDue = list.list_type === 'recurring' ? computeNextResetDue(list) : null

  return (
    <div className="list-view">
      <div className="list-view-header">
        <div>
          <h1>{list.title}</h1>
          <p className="subtitle">
            {remaining} of {totalCount} remaining
            {list.list_type === 'recurring' && (
              <>
                {' · '}
                {describeInterval(list)}
                {nextDue && <> · next reset {nextDue.toLocaleDateString()}</>}
              </>
            )}
          </p>
        </div>
        <div className="list-view-actions">
          <button className="ghost-btn" onClick={() => setShowSettings((s) => !s)}>
            ⚙ Settings
          </button>
          {list.list_type === 'recurring' && (
            <button className="ghost-btn" onClick={() => setShowHistory((s) => !s)}>
              📊 History
            </button>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <label>
            Type:{' '}
            <select
              value={list.list_type}
              onChange={(e) => {
                const list_type = e.target.value as ListType
                onUpdateListSettings(list.id, {
                  list_type,
                  reset_interval: list_type === 'recurring' ? 'daily' : null,
                  last_reset_at: list_type === 'recurring' ? new Date().toISOString() : null,
                })
              }}
            >
              <option value="checkbox">Checkbox list</option>
              <option value="recurring">Recurring / resetting list</option>
            </select>
          </label>

          {list.list_type === 'recurring' && (
            <>
              <label>
                Interval:{' '}
                <select
                  value={list.reset_interval ?? 'daily'}
                  onChange={(e) =>
                    onUpdateListSettings(list.id, {
                      reset_interval: e.target.value as ResetInterval,
                    })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom (N days)</option>
                </select>
              </label>
              {list.reset_interval === 'custom' && (
                <label>
                  Every{' '}
                  <input
                    type="number"
                    min={1}
                    className="n-days-input"
                    value={list.reset_n_days ?? 1}
                    onChange={(e) =>
                      onUpdateListSettings(list.id, {
                        reset_n_days: Math.max(1, Number(e.target.value)),
                      })
                    }
                  />{' '}
                  days
                </label>
              )}
              <button className="ghost-btn" onClick={() => onManualReset(list)}>
                Reset now
              </button>
            </>
          )}
        </div>
      )}

      {showHistory && list.list_type === 'recurring' && (
        <div className="history-panel">
          <HistoryGrid entries={entries} completions={completions} />
        </div>
      )}

      <div className="new-entry-row">
        <input
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add an entry…"
        />
        <button onClick={handleAdd}>+ Add</button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="entries">
          {flat.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onToggle={onToggleEntry}
              onEdit={onEditEntry}
              onDelete={onDeleteEntry}
              onToggleCollapsed={onToggleCollapsedEntry}
              onAddChild={(parentId) => {
                const content = window.prompt('Sub-item text')
                if (content && content.trim()) onAddEntry(content.trim(), parentId)
              }}
              activeDropZone={overState?.id === entry.id ? overState.zone : null}
              isDropTarget={activeId !== null && overState?.id === entry.id}
            />
          ))}
          {flat.length === 0 && (
            <p className="empty-message">No entries yet — add one above.</p>
          )}
        </div>
      </DndContext>
    </div>
  )
}
