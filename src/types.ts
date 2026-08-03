export type ListType = 'checkbox' | 'recurring'
export type ResetInterval = 'daily' | 'weekly' | 'monthly' | 'custom'

export interface TodoList {
  id: string
  user_id: string
  parent_list_id: string | null
  title: string
  position: number
  collapsed: boolean
  list_type: ListType
  reset_interval: ResetInterval | null
  reset_n_days: number | null
  last_reset_at: string | null
  created_at: string
}

export interface FlatList extends TodoList {
  depth: number
  hasChildren: boolean
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

export interface EntryCompletion {
  id: string
  entry_id: string
  done: boolean
  recorded_at: string
}
