export interface TodoList {
  id: string
  title: string
  position: number
  created_at: string
}

export interface Entry {
  id: string
  list_id: string
  content: string
  done: boolean
  position: number
  created_at: string
}
