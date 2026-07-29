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
import { flattenTree, computeDropZone, type DropZone } from '../entryTree'
import type { Entry, TodoList } from '../types'

interface Props {
  list: TodoList
  entries: Entry[]
  onAddEntry: (content: string, parentId?: string | null) => void
  onToggleEntry: (id: string, done: boolean) => void
  onEditEntry: (id: string, content: string) => void
  onDeleteEntry: (id: string) => void
  onToggleCollapsed: (id: string, collapsed: boolean) => void
  onMoveEntry: (draggedId: string, overId: string, zone: DropZone) => void
}

export default function ListView({
  list,
  entries,
  onAddEntry,
  onToggleEntry,
  onEditEntry,
  onDeleteEntry,
  onToggleCollapsed,
  onMoveEntry,
}: Props) {
  const [newEntry, setNewEntry] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overState, setOverState] = useState<{ id: string; zone: DropZone } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleAdd = () => {
    const trimmed = newEntry.trim()
    if (!trimmed) return
    onAddEntry(trimmed, null)
    setNewEntry('')
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      setOverState(null)
      return
    }
    const activeRect = active.rect.current.translated
    const overRect = over.rect
    if (!activeRect || !overRect) return
    const zone = computeDropZone(activeRect, overRect)
    setOverState({ id: String(over.id), zone })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverState(null)
    if (!over || active.id === over.id) return

    const activeRect = active.rect.current.translated
    const overRect = over.rect
    if (!activeRect || !overRect) return

    const zone = computeDropZone(activeRect, overRect)
    onMoveEntry(String(active.id), String(over.id), zone)
  }

  const flat = flattenTree(entries)
  const totalCount = entries.length
  const remaining = entries.filter((e) => !e.done).length

  return (
    <div className="list-view">
      <h1>{list.title}</h1>
      <p className="subtitle">
        {remaining} of {totalCount} remaining
      </p>

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
              onToggleCollapsed={onToggleCollapsed}
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
