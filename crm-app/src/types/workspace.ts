export type Workspace = {
  id: string
  user_id: string
  name: string
  storage_path: string
  original_filename: string
  row_count: number
  created_at: string
  updated_at: string
}

export type WorkspaceDraft = {
  name: string
  file: File
}

export type FilterKey =
  | 'seniority'
  | 'job_function'
  | 'job_sector'
  | 'country'
  | 'state'
  | 'employee_range'

export type ContactFilters = Record<FilterKey, string[]>

export type SavedList = {
  id: string
  workspace_id: string
  user_id: string
  name: string
  filters_json: ContactFilters
  search_query: string
  created_at: string
  updated_at: string
}

export type ColumnPreferences = {
  workspace_id: string
  user_id: string
  visible_columns_json: string[]
  column_order_json: string[]
  updated_at?: string
}
