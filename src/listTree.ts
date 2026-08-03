import type { TodoList, FlatList } from './types'
import { computeDropZone, type DropZone } from './tree'

export { computeDropZone, type DropZone }

/** Group lists by their parent_list_id (null = top-level). */
export function buildChildrenMap(lists: TodoList[]): Map<string | null, TodoList[]> {
  const map = new Map<string | null, TodoList[]>()
  for (const list of lists) {
    const key = list.parent_list_id
    const arr = map.get(key) ?? []
    arr.push(list)
    map.set(key, arr)
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.position - b.position)
  }
  return map
}

/**
 * Flatten the tree into a visible, ordered list for rendering.
 * Children of a collapsed list are excluded.
 */
export function flattenTree(
  lists: TodoList[],
  parentId: string | null = null,
  depth = 0,
  childrenMap?: Map<string | null, TodoList[]>
): FlatList[] {
  const map = childrenMap ?? buildChildrenMap(lists)
  const siblings = map.get(parentId) ?? []
  const result: FlatList[] = []

  for (const list of siblings) {
    const children = map.get(list.id) ?? []
    result.push({ ...list, depth, hasChildren: children.length > 0 })
    if (children.length > 0 && !list.collapsed) {
      result.push(...flattenTree(lists, list.id, depth + 1, map))
    }
  }
  return result
}

/** All descendant ids of a list (not including the list itself). */
export function getDescendantIds(lists: TodoList[], id: string): Set<string> {
  const map = buildChildrenMap(lists)
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

/** Remove a list and all of its descendants from a flat lists array. */
export function filterOutSubtree(lists: TodoList[], id: string): TodoList[] {
  const toRemove = getDescendantIds(lists, id)
  toRemove.add(id)
  return lists.filter((l) => !toRemove.has(l.id))
}

/**
 * Move `draggedId` relative to `overId` according to the drop zone.
 * Handles reparenting, sibling reordering, position renumbering, and
 * cycle prevention (can't drop a list into its own descendant).
 */
export function moveList(
  lists: TodoList[],
  draggedId: string,
  overId: string,
  zone: DropZone
): { lists: TodoList[]; changedIds: string[] } | null {
  if (draggedId === overId) return null

  const dragged = lists.find((l) => l.id === draggedId)
  const over = lists.find((l) => l.id === overId)
  if (!dragged || !over) return null

  const descendantIds = getDescendantIds(lists, draggedId)
  if (descendantIds.has(overId)) return null

  const newParentId = zone === 'nest' ? over.id : over.parent_list_id
  if (newParentId === draggedId) return null

  const byId = new Map(lists.map((l) => [l.id, { ...l }]))
  const changed = new Set<string>()

  const oldParentId = dragged.parent_list_id

  const destSiblings = lists
    .filter((l) => l.parent_list_id === newParentId && l.id !== draggedId)
    .sort((a, b) => a.position - b.position)

  let insertIndex: number
  if (zone === 'nest') {
    insertIndex = destSiblings.length
  } else {
    const overIndex = destSiblings.findIndex((l) => l.id === overId)
    insertIndex = zone === 'before' ? overIndex : overIndex + 1
  }
  destSiblings.splice(insertIndex, 0, dragged)

  destSiblings.forEach((sibling, index) => {
    const list = byId.get(sibling.id)!
    if (list.position !== index) {
      list.position = index
      changed.add(list.id)
    }
    if (sibling.id === draggedId && list.parent_list_id !== newParentId) {
      list.parent_list_id = newParentId
      changed.add(list.id)
    }
  })

  if (oldParentId !== newParentId) {
    const oldSiblings = lists
      .filter((l) => l.parent_list_id === oldParentId && l.id !== draggedId)
      .sort((a, b) => a.position - b.position)
    oldSiblings.forEach((sibling, index) => {
      const list = byId.get(sibling.id)!
      if (list.position !== index) {
        list.position = index
        changed.add(list.id)
      }
    })
  }

  if (zone === 'nest') {
    const target = byId.get(over.id)!
    if (target.collapsed) {
      target.collapsed = false
      changed.add(target.id)
    }
  }

  return {
    lists: lists.map((l) => byId.get(l.id)!),
    changedIds: Array.from(changed),
  }
}
