import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { FlatList } from '../types'

interface Props {
  list: FlatList
  isSelected: boolean
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onToggleCollapsed: (id: string, collapsed: boolean) => void
  onAddChild: (parentId: string) => void
  activeDropZone: 'before' | 'after' | 'nest' | null
  isDropTarget: boolean
}

export default function ListRow({
  list,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  onToggleCollapsed,
  onAddChild,
  activeDropZone,
  isDropTarget,
}: Props) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({ id: list.id })
  const { setNodeRef: setDropRef } = useDroppable({ id: list.id })

  const setRefs = (node: HTMLElement | null) => {
    setDragRef(node)
    setDropRef(node)
  }

  return (
    <li
      ref={setRefs}
      className={[
        'list-row',
        isSelected ? 'active' : '',
        isDragging ? 'dragging' : '',
        isDropTarget && activeDropZone === 'nest' ? 'drop-nest' : '',
        isDropTarget && activeDropZone === 'before' ? 'drop-before' : '',
        isDropTarget && activeDropZone === 'after' ? 'drop-after' : '',
      ].join(' ')}
      style={{ marginLeft: list.depth * 16 }}
    >
      <span className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </span>

      {list.hasChildren ? (
        <button
          className="chevron-btn"
          onClick={() => onToggleCollapsed(list.id, !list.collapsed)}
          title={list.collapsed ? 'Expand' : 'Collapse'}
        >
          {list.collapsed ? '▸' : '▾'}
        </button>
      ) : (
        <span className="chevron-spacer" />
      )}

      <span className="list-title" onClick={() => onSelect(list.id)}>
        {list.list_type === 'recurring' ? '🔁 ' : ''}
        {list.title}
      </span>

      <span className="list-actions">
        <button title="Add sub-list" onClick={() => onAddChild(list.id)}>
          +
        </button>
        <button
          title="Rename"
          onClick={() => {
            const next = window.prompt('Rename list', list.title)
            if (next && next.trim()) onRename(list.id, next.trim())
          }}
        >
          ✏️
        </button>
        <button
          title="Delete"
          onClick={() => {
            if (window.confirm(`Delete list "${list.title}" and everything in it?`)) {
              onDelete(list.id)
            }
          }}
        >
          🗑️
        </button>
      </span>
    </li>
  )
}
