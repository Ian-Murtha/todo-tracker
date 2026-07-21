import { useState } from 'react'
import type { TodoList } from '../types'

interface Props {
  lists: TodoList[]
  selectedListId: string | null
  onSelect: (id: string) => void
  onCreate: (title: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export default function ListSidebar({
  lists,
  selectedListId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const [newTitle, setNewTitle] = useState('')

  const handleCreate = () => {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setNewTitle('')
  }

  return (
    <div className="sidebar">
      <h2>Your Lists</h2>
      <div className="new-list-row">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New list title"
        />
        <button onClick={handleCreate}>+ Add</button>
      </div>
      <ul className="list-nav">
        {lists.map((list) => (
          <li
            key={list.id}
            className={list.id === selectedListId ? 'active' : ''}
          >
            <span onClick={() => onSelect(list.id)} className="list-title">
              {list.title}
            </span>
            <span className="list-actions">
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
                  if (window.confirm(`Delete list "${list.title}"?`)) {
                    onDelete(list.id)
                  }
                }}
              >
                🗑️
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
