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
import ListRow from './ListRow'
import { flattenTree, computeDropZone, type DropZone } from '../listTree'
import type { TodoList } from '../types'

interface Props {
  lists: TodoList[]
  selectedListId: string | null
  onSelect: (id: string) => void
  onCreate: (title: string, parentId?: string | null) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onToggleCollapsed: (id: string, collapsed: boolean) => void
  onMove: (draggedId: string, overId: string, zone: DropZone) => void
  onSignOut: () => void
  userEmail?: string
}

export default function ListSidebar({
  lists,
  selectedListId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onToggleCollapsed,
  onMove,
  onSignOut,
  userEmail,
}: Props) {
  const [newTitle, setNewTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overState, setOverState] = useState<{ id: string; zone: DropZone } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleCreate = () => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onCreate(trimmed, null)
    setNewTitle('')
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
    onMove(String(active.id), String(over.id), computeDropZone(activeRect, overRect))
  }

  const flat = flattenTree(lists)

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Your Lists</h2>
        <button className="sign-out-btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>
      {userEmail && <p className="signed-in-as">{userEmail}</p>}
      <div className="new-list-row">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New list title"
        />
        <button onClick={handleCreate}>+ Add</button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <ul className="list-nav">
          {flat.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              isSelected={list.id === selectedListId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onToggleCollapsed={onToggleCollapsed}
              onAddChild={(parentId) => {
                const title = window.prompt('Sub-list title')
                if (title && title.trim()) onCreate(title.trim(), parentId)
              }}
              activeDropZone={overState?.id === list.id ? overState.zone : null}
              isDropTarget={activeId !== null && overState?.id === list.id}
            />
          ))}
        </ul>
      </DndContext>
    </div>
  )
}
