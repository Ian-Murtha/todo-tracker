export interface TodoList {
  id: string
  title: string
  position: number
  created_at: string
}

export interface Entry {
  id: string
  list_id: string
  parent_entry_id: string | null
  content: string
  done: boolean
  position: number
  collapsed: boolean
  created_at: string
}

export interface FlatEntry extends Entry {
  depth: number
  hasChildren: boolean
}
