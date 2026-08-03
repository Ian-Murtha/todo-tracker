import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import AuthGate from './components/AuthGate'
import ListSidebar from './components/ListSidebar'
import ListView from './components/ListView'
import {
  toggleWithCascade,
  moveEntry as moveEntryInTree,
  filterOutSubtree as filterOutEntrySubtree,
} from './entryTree'
import {
  moveList as moveListInTree,
  filterOutSubtree as filterOutListSubtree,
  getDescendantIds as getListDescendantIds,
  type DropZone,
} from './listTree'
import { isResetDue, performReset } from './resetEngine'
import type { Entry, EntryCompletion, TodoList } from './types'

export default function App() {
  return <AuthGate>{(session) => <Dashboard session={session} />}</AuthGate>
}

function Dashboard({ session }: { session: Session }) {
  const [lists, setLists] = useState<TodoList[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [completions, setCompletions] = useState<EntryCompletion[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load everything on mount, running any due resets along the way.
  useEffect(() => {
    const loadAll = async () => {
      const [listsRes, entriesRes] = await Promise.all([
        supabase.from('lists').select('*').order('position', { ascending: true }),
        supabase.from('entries').select('*').order('position', { ascending: true }),
      ])
      if (listsRes.error) setError(listsRes.error.message)
      if (entriesRes.error) setError(entriesRes.error.message)

      let currentLists: TodoList[] = listsRes.data ?? []
      let currentEntries: Entry[] = entriesRes.data ?? []

      const now = new Date()
      const dueLists = currentLists.filter((l) => isResetDue(l, now))

      if (dueLists.length > 0) {
        const listUpdates: TodoList[] = []
        const completionInserts: { entry_id: string; done: boolean; recorded_at: string }[] = []

        for (const list of dueLists) {
          const result = performReset(list, currentEntries, now)
          currentEntries = result.updatedEntries
          listUpdates.push(result.updatedList)
          completionInserts.push(...result.completions)
        }
        currentLists = currentLists.map(
          (l) => listUpdates.find((u) => u.id === l.id) ?? l
        )

        await Promise.all(
          listUpdates.map((l) =>
            supabase.from('lists').update({ last_reset_at: l.last_reset_at }).eq('id', l.id)
          )
        )
        const clearedEntryIds = new Set(completionInserts.map((c) => c.entry_id))
        await Promise.all(
          Array.from(clearedEntryIds).map((id) =>
            supabase.from('entries').update({ done: false }).eq('id', id)
          )
        )
        if (completionInserts.length > 0) {
          const { error } = await supabase.from('entry_completions').insert(completionInserts)
          if (error) setError(error.message)
        }
      }

      setLists(currentLists)
      setEntries(currentEntries)
      if (currentLists.length > 0) {
        const firstTopLevel = currentLists.find((l) => !l.parent_list_id) ?? currentLists[0]
        setSelectedListId(firstTopLevel.id)
      }
      setLoading(false)
    }
    loadAll()
  }, [])

  // Load completion history whenever the selected recurring list changes.
  useEffect(() => {
    const list = lists.find((l) => l.id === selectedListId)
    if (!list || list.list_type !== 'recurring') {
      setCompletions([])
      return
    }
    const entryIds = entries.filter((e) => e.list_id === selectedListId).map((e) => e.id)
    if (entryIds.length === 0) {
      setCompletions([])
      return
    }
    supabase
      .from('entry_completions')
      .select('*')
      .in('entry_id', entryIds)
      .order('recorded_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCompletions(data ?? [])
      })
  }, [selectedListId, lists, entries])

  // --- Lists ---------------------------------------------------------

  const createList = async (title: string, parentId: string | null = null) => {
    const siblingCount = lists.filter((l) => l.parent_list_id === parentId).length
    const { data, error } = await supabase
      .from('lists')
      .insert({ title, parent_list_id: parentId, position: siblingCount })
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
    const removedIds = getListDescendantIds(lists, id)
    removedIds.add(id)

    const { error } = await supabase.from('lists').delete().eq('id', id)
    if (error) return setError(error.message)

    setLists((prev) => filterOutListSubtree(prev, id))
    setEntries((prev) => prev.filter((e) => !removedIds.has(e.list_id)))

    if (selectedListId && removedIds.has(selectedListId)) {
      const remaining = lists.filter((l) => !removedIds.has(l.id))
      setSelectedListId(remaining[0]?.id ?? null)
    }
  }

  const toggleListCollapsed = async (id: string, collapsed: boolean) => {
    const { error } = await supabase.from('lists').update({ collapsed }).eq('id', id)
    if (error) return setError(error.message)
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, collapsed } : l)))
  }

  const moveList = (draggedId: string, overId: string, zone: DropZone) => {
    const result = moveListInTree(lists, draggedId, overId, zone)
    if (!result) return
    setLists(result.lists)
    persistListChanges(result.lists, result.changedIds, [
      'parent_list_id',
      'position',
      'collapsed',
    ])
  }

  const updateListSettings = async (id: string, patch: Partial<TodoList>) => {
    const { error } = await supabase.from('lists').update(patch).eq('id', id)
    if (error) return setError(error.message)
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  const manualReset = async (list: TodoList) => {
    const now = new Date()
    const result = performReset(list, entries, now)

    setLists((prev) => prev.map((l) => (l.id === list.id ? result.updatedList : l)))
    setEntries(result.updatedEntries)

    const { error: listErr } = await supabase
      .from('lists')
      .update({ last_reset_at: result.updatedList.last_reset_at })
      .eq('id', list.id)
    if (listErr) setError(listErr.message)

    const clearedIds = result.completions.map((c) => c.entry_id)
    await Promise.all(
      clearedIds.map((id) => supabase.from('entries').update({ done: false }).eq('id', id))
    )

    if (result.completions.length > 0) {
      const { data, error } = await supabase
        .from('entry_completions')
        .insert(result.completions)
        .select()
      if (error) setError(error.message)
      else if (data) setCompletions((prev) => [...prev, ...data])
    }
  }

  /** Persist only the given fields for the given list ids. */
  const persistListChanges = async (
    updated: TodoList[],
    changedIds: string[],
    fields: (keyof TodoList)[]
  ) => {
    if (changedIds.length === 0) return
    const byId = new Map(updated.map((l) => [l.id, l]))
    const updates = changedIds.map((id) => {
      const list = byId.get(id)!
      const patch: Record<string, unknown> = {}
      for (const field of fields) patch[field] = list[field]
      return supabase.from('lists').update(patch).eq('id', id)
    })
    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) setError(failed.error.message)
  }

  // --- Entries ---------------------------------------------------------

  const addEntry = async (content: string, parentId: string | null = null) => {
    if (!selectedListId) return
    const siblingCount = entries.filter(
      (e) => e.list_id === selectedListId && e.parent_entry_id === parentId
    ).length
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
    persistEntryChanges(updated, changedIds, ['done'])
  }

  const editEntry = async (id: string, content: string) => {
    const { error } = await supabase.from('entries').update({ content }).eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, content } : e)))
  }

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => filterOutEntrySubtree(prev, id))
  }

  const toggleEntryCollapsed = async (id: string, collapsed: boolean) => {
    const { error } = await supabase.from('entries').update({ collapsed }).eq('id', id)
    if (error) return setError(error.message)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, collapsed } : e)))
  }

  const moveEntry = (draggedId: string, overId: string, zone: DropZone) => {
    const result = moveEntryInTree(entries, draggedId, overId, zone)
    if (!result) return
    setEntries(result.entries)
    persistEntryChanges(result.entries, result.changedIds, [
      'parent_entry_id',
      'position',
      'collapsed',
    ])
  }

  const persistEntryChanges = async (
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null
  const selectedListEntries = selectedListId
    ? entries.filter((e) => e.list_id === selectedListId)
    : []

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
        onToggleCollapsed={toggleListCollapsed}
        onMove={moveList}
        onSignOut={handleSignOut}
        userEmail={session.user.email}
      />
      <main className="main-content">
        {selectedList ? (
          <ListView
            list={selectedList}
            entries={selectedListEntries}
            completions={completions}
            onAddEntry={addEntry}
            onToggleEntry={toggleEntry}
            onEditEntry={editEntry}
            onDeleteEntry={deleteEntry}
            onToggleCollapsedEntry={toggleEntryCollapsed}
            onMoveEntry={moveEntry}
            onUpdateListSettings={updateListSettings}
            onManualReset={manualReset}
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
