import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import type { Entry } from '../types'

interface Props {
  entry: Entry
  onToggle: (id: string, done: boolean) => void
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
}

export default function SortableEntry({
  entry,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.id })

  const [text, setText] = useState(entry.content)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="entry-row">
      <span className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </span>
      <input
        type="checkbox"
        checked={entry.done}
        onChange={(e) => onToggle(entry.id, e.target.checked)}
      />
      <input
        className={`entry-text ${entry.done ? 'done' : ''}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() && text !== entry.content) onEdit(entry.id, text.trim())
        }}
      />
      <button className="delete-btn" onClick={() => onDelete(entry.id)}>
        ✕
      </button>
    </div>
  )
}
