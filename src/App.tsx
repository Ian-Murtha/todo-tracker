import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import ListSidebar from './components/ListSidebar'
import ListView from './components/ListView'
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

  const addEntry = async (content: string) => {
    if (!selectedListId) return
    const position = entries.length
    const { data, error } = await supabase
      .from('entries')
      .insert({ list_id: selectedListId, content, position })
      .select()
      .single()

    if (error) return setError(error.message)
    if (data) setEntries((prev) => [...prev, data])
  }

  const toggleEntry = async (id: string, done: boolean) => {
    const { error } = await supabase.from('entries').update({ done }).eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, done } : e)))
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
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const reorderEntries = async (newOrder: Entry[]) => {
    // Optimistic UI update
    setEntries(newOrder)

    // Persist new positions
    const updates = newOrder.map((entry, index) =>
      supabase.from('entries').update({ position: index }).eq('id', entry.id)
    )
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
            onReorder={reorderEntries}
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
