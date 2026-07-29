import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import ListSidebar from './components/ListSidebar'
import ListView from './components/ListView'
import { toggleWithCascade, moveEntry as moveEntryInTree, filterOutSubtree, type DropZone } from './entryTree'
import type { Entry, TodoList } from './types'

export default function App() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all lists on mount
  useEffect(() => {
    const loadLists = async () => {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('position', { ascending: true })

      if (error) {
        setError(error.message)
      } else if (data) {
        setLists(data)
        if (data.length > 0) setSelectedListId(data[0].id)
      }
      setLoading(false)
    }
    loadLists()
  }, [])

  // Load entries whenever the selected list changes
  useEffect(() => {
    if (!selectedListId) {
      setEntries([])
      return
    }
    const loadEntries = async () => {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('list_id', selectedListId)
        .order('position', { ascending: true })

      if (error) {
        setError(error.message)
      } else if (data) {
        setEntries(data)
      }
    }
    loadEntries()
  }, [selectedListId])

  const createList = async (title: string) => {
    const position = lists.length
    const { data, error } = await supabase
      .from('lists')
      .insert({ title, position })
      .select()
      .single()

    if (error) return setError(error.message)
    if (data) {
      setLists((prev) => [...prev, data])
      setSelectedListId(data.id)
    }
  }

  const renameList = async (id: string, title: string) => {
    const { error } = await supabase.from('lists').update({ title }).eq('id', id)
    if (error) return setError(error.message)
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, title } : l)))
  }

  const deleteList = async (id: string) => {
    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (error) return setError(error.message)
    setLists((prev) => prev.filter((l) => l.id !== id))
    if (selectedListId === id) {
      const remaining = lists.filter((l) => l.id !== id)
      setSelectedListId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const addEntry = async (content: string, parentId: string | null = null) => {
    if (!selectedListId) return
    const siblingCount = entries.filter((e) => e.parent_entry_id === parentId).length
    const { data, error } = await supabase
      .from('entries')
      .insert({
        list_id: selectedListId,
        parent_entry_id: parentId,
        content,
        position: siblingCount,
      })
      .select()
      .single()

    if (error) return setError(error.message)
    if (data) setEntries((prev) => [...prev, data])
  }

  const toggleEntry = (id: string, done: boolean) => {
    const { entries: updated, changedIds } = toggleWithCascade(entries, id, done)
    setEntries(updated)
    persistChanges(updated, changedIds, ['done'])
  }

  const editEntry = async (id: string, content: string) => {
    const { error } = await supabase
      .from('entries')
      .update({ content })
      .eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content } : e)))
  }

  const deleteEntry = async (id: string) => {
    // The DB cascades deletes to descendants (parent_entry_id references
    // entries.id on delete cascade), so we only need to delete this row.
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => filterOutSubtree(prev, id))
  }

  const toggleCollapsed = async (id: string, collapsed: boolean) => {
    const { error } = await supabase
      .from('entries')
      .update({ collapsed })
      .eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, collapsed } : e)))
  }

  const moveEntry = (draggedId: string, overId: string, zone: DropZone) => {
    const result = moveEntryInTree(entries, draggedId, overId, zone)
    if (!result) return // invalid move (e.g. would create a cycle)
    setEntries(result.entries)
    persistChanges(result.entries, result.changedIds, ['parent_entry_id', 'position', 'collapsed'])
  }

  /** Persist only the fields that changed for the given entry ids. */
  const persistChanges = async (
    updated: Entry[],
    changedIds: string[],
    fields: (keyof Entry)[]
  ) => {
    if (changedIds.length === 0) return
    const byId = new Map(updated.map((e) => [e.id, e]))
    const updates = changedIds.map((id) => {
      const entry = byId.get(id)!
      const patch: Record<string, unknown> = {}
      for (const field of fields) patch[field] = entry[field]
      return supabase.from('entries').update(patch).eq('id', id)
    })
    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) setError(failed.error.message)
  }

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null

  if (loading) return <div className="center-message">Loading…</div>

  return (
    <div className="app">
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}
      <ListSidebar
        lists={lists}
        selectedListId={selectedListId}
        onSelect={setSelectedListId}
        onCreate={createList}
        onRename={renameList}
        onDelete={deleteList}
      />
      <main className="main-content">
        {selectedList ? (
          <ListView
            list={selectedList}
            entries={entries}
            onAddEntry={addEntry}
            onToggleEntry={toggleEntry}
            onEditEntry={editEntry}
            onDeleteEntry={deleteEntry}
            onToggleCollapsed={toggleCollapsed}
            onMoveEntry={moveEntry}
          />
        ) : (
          <div className="center-message">
            Create a list on the left to get started.
          </div>
        )}
      </main>
    </div>
  )
}
