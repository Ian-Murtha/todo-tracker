import type { Entry, FlatEntry } from './types'

/** Group entries by their parent_entry_id (null = top-level). */
export function buildChildrenMap(entries: Entry[]): Map<string | null, Entry[]> {
  const map = new Map<string | null, Entry[]>()
  for (const entry of entries) {
    const key = entry.parent_entry_id
    const list = map.get(key) ?? []
    list.push(entry)
    map.set(key, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.position - b.position)
  }
  return map
}

/**
 * Flatten the tree into a visible, ordered list for rendering.
 * Children of a collapsed entry are excluded.
 */
export function flattenTree(
  entries: Entry[],
  parentId: string | null = null,
  depth = 0,
  childrenMap?: Map<string | null, Entry[]>
): FlatEntry[] {
  const map = childrenMap ?? buildChildrenMap(entries)
  const siblings = map.get(parentId) ?? []
  const result: FlatEntry[] = []

  for (const entry of siblings) {
    const children = map.get(entry.id) ?? []
    result.push({ ...entry, depth, hasChildren: children.length > 0 })
    if (children.length > 0 && !entry.collapsed) {
      result.push(...flattenTree(entries, entry.id, depth + 1, map))
    }
  }
  return result
}

/** All descendant ids of an entry (not including the entry itself). */
export function getDescendantIds(entries: Entry[], id: string): Set<string> {
  const map = buildChildrenMap(entries)
  const result = new Set<string>()
  const walk = (parentId: string) => {
    const children = map.get(parentId) ?? []
    for (const child of children) {
      result.add(child.id)
      walk(child.id)
    }
  }
  walk(id)
  return result
}

/** Ordered list of ancestor ids, immediate parent first. */
export function getAncestorIds(entries: Entry[], id: string): string[] {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const result: string[] = []
  let current = byId.get(id)?.parent_entry_id ?? null
  while (current) {
    result.push(current)
    current = byId.get(current)?.parent_entry_id ?? null
  }
  return result
}

/**
 * Toggle an entry's done state, cascading down to all descendants and
 * propagating auto-check/uncheck upward through ancestor folders.
 * Returns a new entries array plus the list of ids whose `done` value
 * changed (so callers know what to persist).
 */
export function toggleWithCascade(
  entries: Entry[],
  id: string,
  done: boolean
): { entries: Entry[]; changedIds: string[] } {
  const byId = new Map(entries.map((e) => [e.id, { ...e }]))
  const changed = new Set<string>()

  const target = byId.get(id)
  if (!target) return { entries, changedIds: [] }

  if (target.done !== done) changed.add(id)
  target.done = done

  // Cascade down to all descendants
  for (const descId of getDescendantIds(entries, id)) {
    const desc = byId.get(descId)!
    if (desc.done !== done) changed.add(descId)
    desc.done = done
  }

  // Propagate up: a folder is done only if it has children and all are done
  const childrenMap = buildChildrenMap(Array.from(byId.values()))
  for (const ancestorId of getAncestorIds(entries, id)) {
    const ancestor = byId.get(ancestorId)!
    const children = childrenMap.get(ancestorId) ?? []
    const newDone = children.length > 0 && children.every((c) => byId.get(c.id)!.done)
    if (ancestor.done !== newDone) {
      changed.add(ancestorId)
      ancestor.done = newDone
    }
  }

  return {
    entries: entries.map((e) => byId.get(e.id)!),
    changedIds: Array.from(changed),
  }
}

/** Remove an entry and all of its descendants from a flat entries array. */
export function filterOutSubtree(entries: Entry[], id: string): Entry[] {
  const toRemove = getDescendantIds(entries, id)
  toRemove.add(id)
  return entries.filter((e) => !toRemove.has(e.id))
}

export type DropZone = 'before' | 'after' | 'nest'

/**
 * Compute the drop zone (before / after / nest) based on where the
 * dragged item's center lands within the hovered row's bounding box.
 */
export function computeDropZone(activeRect: { top: number; height: number }, overRect: { top: number; height: number }): DropZone {
  const activeCenterY = activeRect.top + activeRect.height / 2
  const relative = (activeCenterY - overRect.top) / overRect.height
  if (relative < 0.25) return 'before'
  if (relative > 0.75) return 'after'
  return 'nest'
}

/**
 * Move `draggedId` relative to `overId` according to the drop zone.
 * Handles reparenting, sibling reordering, position renumbering, and
 * cycle prevention (can't drop an entry into its own descendant).
 * Returns the updated entries array plus ids that need persisting, or
 * null if the move is invalid (e.g. would create a cycle).
 */
export function moveEntry(
  entries: Entry[],
  draggedId: string,
  overId: string,
  zone: DropZone
): { entries: Entry[]; changedIds: string[] } | null {
  if (draggedId === overId) return null

  const dragged = entries.find((e) => e.id === draggedId)
  const over = entries.find((e) => e.id === overId)
  if (!dragged || !over) return null

  const descendantIds = getDescendantIds(entries, draggedId)
  if (descendantIds.has(overId)) return null // can't drop onto own descendant

  const newParentId = zone === 'nest' ? over.id : over.parent_entry_id
  if (newParentId === draggedId) return null

  const byId = new Map(entries.map((e) => [e.id, { ...e }]))
  const changed = new Set<string>()

  const oldParentId = dragged.parent_entry_id

  // Siblings of the destination, excluding the dragged entry itself
  const destSiblings = entries
    .filter((e) => e.parent_entry_id === newParentId && e.id !== draggedId)
    .sort((a, b) => a.position - b.position)

  let insertIndex: number
  if (zone === 'nest') {
    insertIndex = destSiblings.length
  } else {
    const overIndex = destSiblings.findIndex((e) => e.id === overId)
    insertIndex = zone === 'before' ? overIndex : overIndex + 1
  }
  destSiblings.splice(insertIndex, 0, dragged)

  // Renumber destination siblings and apply new parent to the dragged entry
  destSiblings.forEach((sibling, index) => {
    const entry = byId.get(sibling.id)!
    if (entry.position !== index) {
      entry.position = index
      changed.add(entry.id)
    }
    if (sibling.id === draggedId && entry.parent_entry_id !== newParentId) {
      entry.parent_entry_id = newParentId
      changed.add(entry.id)
    }
  })

  // If it moved to a different parent, renumber the old sibling group too
  if (oldParentId !== newParentId) {
    const oldSiblings = entries
      .filter((e) => e.parent_entry_id === oldParentId && e.id !== draggedId)
      .sort((a, b) => a.position - b.position)
    oldSiblings.forEach((sibling, index) => {
      const entry = byId.get(sibling.id)!
      if (entry.position !== index) {
        entry.position = index
        changed.add(entry.id)
      }
    })
  }

  // Auto-expand the folder something was nested into
  if (zone === 'nest') {
    const target = byId.get(over.id)!
    if (target.collapsed) {
      target.collapsed = false
      changed.add(target.id)
    }
  }

  return {
    entries: entries.map((e) => byId.get(e.id)!),
    changedIds: Array.from(changed),
  }
}
