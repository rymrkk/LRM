import type { ContactFilters, SavedList, Workspace } from './workspace'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type WorkspaceInsert = {
  user_id: string
  name: string
  storage_path: string
  original_filename: string
  row_count: number
}

export type WorkspaceUpdate = Partial<Pick<Workspace, 'name' | 'storage_path' | 'original_filename' | 'row_count'>>

export type SavedListInsert = {
  workspace_id: string
  user_id: string
  name: string
  filters_json: ContactFilters
  search_query: string
}

export type SavedListUpdate = Partial<Pick<SavedList, 'name' | 'filters_json' | 'search_query'>>

export type ContactNoteRow = {
  workspace_id: string
  contact_id: string
  user_id: string
  notes: string
  tags_json: string[]
  updated_at: string
}

export type ContactNoteInsert = Omit<ContactNoteRow, 'updated_at'>

export type ColumnPreferencesRow = {
  workspace_id: string
  user_id: string
  visible_columns_json: string[]
  column_order_json: string[]
  updated_at: string
}

export type ColumnPreferencesInsert = Omit<ColumnPreferencesRow, 'updated_at'>

export type Database = {
  public: {
    Tables: {
      workspaces: {
        Row: Workspace
        Insert: WorkspaceInsert
        Update: WorkspaceUpdate
        Relationships: []
      }
      saved_lists: {
        Row: SavedList
        Insert: SavedListInsert
        Update: SavedListUpdate
        Relationships: []
      }
      contact_notes: {
        Row: ContactNoteRow
        Insert: ContactNoteInsert
        Update: Partial<ContactNoteInsert>
        Relationships: []
      }
      column_preferences: {
        Row: ColumnPreferencesRow
        Insert: ColumnPreferencesInsert
        Update: Partial<ColumnPreferencesInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
