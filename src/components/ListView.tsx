import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import SortableEntry from './SortableEntry'
import type { Entry, TodoList } from '../types'

interface Props {
  list: TodoList
  entries: Entry[]
  onAddEntry: (content: string) => void
  onToggleEntry: (id: string, done: boolean) => void
  onEditEntry: (id: string, content: string) => void
  onDeleteEntry: (id: string) => void
  onReorder: (newOrder: Entry[]) => void
}

export default function ListView({
  list,
  entries,
  onAddEntry,
  onToggleEntry,
  onEditEntry,
  onDeleteEntry,
  onReorder,
}: Props) {
  const [newEntry, setNewEntry] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const handleAdd = () => {
    const trimmed = newEntry.trim()
    if (!trimmed) return
    onAddEntry(trimmed)
    setNewEntry('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = entries.findIndex((e) => e.id === active.id)
    const newIndex = entries.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(entries, oldIndex, newIndex)
    onReorder(reordered)
  }

  const remaining = entries.filter((e) => !e.done).length

  return (
    <div className="list-view">
      <h1>{list.title}</h1>
      <p className="subtitle">
        {remaining} of {entries.length} remaining
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
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="entries">
            {entries.map((entry) => (
              <SortableEntry
                key={entry.id}
                entry={entry}
                onToggle={onToggleEntry}
                onEdit={onEditEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
