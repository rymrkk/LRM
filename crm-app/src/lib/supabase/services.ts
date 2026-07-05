import { STORAGE_BUCKET } from '../constants'
import type {
  ColumnPreferencesInsert,
  ContactNoteInsert,
  ContactNoteRow,
  SavedListInsert,
  SavedListUpdate,
  WorkspaceInsert,
  WorkspaceUpdate,
} from '../../types/supabase'
import type { ColumnPreferences, SavedList, Workspace } from '../../types/workspace'
import { fail, fromSupabaseResponse, missingClient, ok, type SupabaseServiceResult } from './client'

export const WORKSPACE_STORAGE_BUCKET = STORAGE_BUCKET

type QueryClient = { from: (table: string) => any } | null
type StorageClient = { storage: { from: (bucket: string) => any } } | null

export type WorkspaceCsvPathInput = {
  userId: string
  workspaceId: string
  version: string
}

export type UploadWorkspaceCsvInput = WorkspaceCsvPathInput & {
  file: Blob
  cacheControl?: string
  upsert?: boolean
}

export function buildWorkspaceCsvPath({ userId, workspaceId, version }: WorkspaceCsvPathInput): string {
  return [userId, workspaceId, version].map(assertSafePathSegment).join('/')
}

export async function uploadWorkspaceCsv(
  client: StorageClient,
  input: UploadWorkspaceCsvInput,
): Promise<SupabaseServiceResult<{ path: string }>> {
  if (!client) return missingClient()

  const path = buildWorkspaceCsvPath(input)
  const response = await client.storage.from(WORKSPACE_STORAGE_BUCKET).upload(path, input.file, {
    cacheControl: input.cacheControl ?? '3600',
    contentType: 'text/csv',
    upsert: input.upsert ?? true,
  })

  if (response.error) {
    return fail('storage', response.error.message ?? 'Unable to upload workspace CSV.', response.error)
  }

  return ok({ path: response.data?.path ?? path })
}

export async function downloadWorkspaceCsv(
  client: StorageClient,
  path: string,
): Promise<SupabaseServiceResult<Blob>> {
  if (!client) return missingClient()

  const response = await client.storage.from(WORKSPACE_STORAGE_BUCKET).download(path)
  return fromSupabaseResponse<Blob>(response, 'storage')
}

export async function deleteWorkspaceCsv(
  client: StorageClient,
  path: string,
): Promise<SupabaseServiceResult<boolean>> {
  if (!client) return missingClient()

  const response = await client.storage.from(WORKSPACE_STORAGE_BUCKET).remove([path])
  if (response.error) {
    return fail('storage', response.error.message ?? 'Unable to delete workspace CSV.', response.error)
  }

  return ok(true)
}

export async function createWorkspace(
  client: QueryClient,
  workspace: WorkspaceInsert,
): Promise<SupabaseServiceResult<Workspace>> {
  if (!client) return missingClient()

  const response = await client.from('workspaces').insert(workspace).select('*').single()
  return fromSupabaseResponse<Workspace>(response, 'database')
}

export async function listWorkspaces(
  client: QueryClient,
  userId: string,
): Promise<SupabaseServiceResult<Workspace[]>> {
  if (!client) return missingClient()

  const response = await client
    .from('workspaces')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return fromSupabaseResponse<Workspace[]>(response, 'database')
}

export async function updateWorkspace(
  client: QueryClient,
  workspaceId: string,
  userId: string,
  changes: WorkspaceUpdate,
): Promise<SupabaseServiceResult<Workspace>> {
  if (!client) return missingClient()

  const response = await client
    .from('workspaces')
    .update(changes)
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .select('*')
    .single()
  return fromSupabaseResponse<Workspace>(response, 'database')
}

export async function deleteWorkspace(
  client: QueryClient,
  workspaceId: string,
  userId: string,
): Promise<SupabaseServiceResult<boolean>> {
  if (!client) return missingClient()

  const response = await client.from('workspaces').delete().eq('id', workspaceId).eq('user_id', userId)
  if (response.error) {
    return fail('database', response.error.message ?? 'Unable to delete workspace.', response.error)
  }

  return ok(true)
}

export async function createSavedList(
  client: QueryClient,
  savedList: SavedListInsert,
): Promise<SupabaseServiceResult<SavedList>> {
  if (!client) return missingClient()

  const response = await client.from('saved_lists').insert(savedList).select('*').single()
  return fromSupabaseResponse<SavedList>(response, 'database')
}

export async function listSavedLists(
  client: QueryClient,
  workspaceId: string,
  userId: string,
): Promise<SupabaseServiceResult<SavedList[]>> {
  if (!client) return missingClient()

  const response = await client
    .from('saved_lists')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return fromSupabaseResponse<SavedList[]>(response, 'database')
}

export async function updateSavedList(
  client: QueryClient,
  savedListId: string,
  userId: string,
  changes: SavedListUpdate,
): Promise<SupabaseServiceResult<SavedList>> {
  if (!client) return missingClient()

  const response = await client
    .from('saved_lists')
    .update(changes)
    .eq('id', savedListId)
    .eq('user_id', userId)
    .select('*')
    .single()
  return fromSupabaseResponse<SavedList>(response, 'database')
}

export async function deleteSavedList(
  client: QueryClient,
  savedListId: string,
  userId: string,
): Promise<SupabaseServiceResult<boolean>> {
  if (!client) return missingClient()

  const response = await client.from('saved_lists').delete().eq('id', savedListId).eq('user_id', userId)
  if (response.error) {
    return fail('database', response.error.message ?? 'Unable to delete saved list.', response.error)
  }

  return ok(true)
}

export async function getContactNote(
  client: QueryClient,
  workspaceId: string,
  contactId: string,
  userId: string,
): Promise<SupabaseServiceResult<ContactNoteRow | null>> {
  if (!client) return missingClient()

  const response = await client
    .from('contact_notes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('user_id', userId)
    .maybeSingle()
  return fromSupabaseResponse<ContactNoteRow | null>(response, 'database')
}

export async function upsertContactNote(
  client: QueryClient,
  note: ContactNoteInsert,
): Promise<SupabaseServiceResult<ContactNoteRow>> {
  if (!client) return missingClient()

  const response = await client
    .from('contact_notes')
    .upsert(note, { onConflict: 'workspace_id,contact_id,user_id' })
    .select('*')
    .single()
  return fromSupabaseResponse<ContactNoteRow>(response, 'database')
}

export async function deleteContactNote(
  client: QueryClient,
  workspaceId: string,
  contactId: string,
  userId: string,
): Promise<SupabaseServiceResult<boolean>> {
  if (!client) return missingClient()

  const response = await client
    .from('contact_notes')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('user_id', userId)
  if (response.error) {
    return fail('database', response.error.message ?? 'Unable to delete contact note.', response.error)
  }

  return ok(true)
}

export async function getColumnPreferences(
  client: QueryClient,
  workspaceId: string,
  userId: string,
): Promise<SupabaseServiceResult<ColumnPreferences | null>> {
  if (!client) return missingClient()

  const response = await client
    .from('column_preferences')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  return fromSupabaseResponse<ColumnPreferences | null>(response, 'database')
}

export async function upsertColumnPreferences(
  client: QueryClient,
  preferences: ColumnPreferencesInsert,
): Promise<SupabaseServiceResult<ColumnPreferences>> {
  if (!client) return missingClient()

  const response = await client
    .from('column_preferences')
    .upsert(preferences, { onConflict: 'workspace_id,user_id' })
    .select('*')
    .single()
  return fromSupabaseResponse<ColumnPreferences>(response, 'database')
}

export async function resetColumnPreferences(
  client: QueryClient,
  workspaceId: string,
  userId: string,
): Promise<SupabaseServiceResult<boolean>> {
  if (!client) return missingClient()

  const response = await client
    .from('column_preferences')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
  if (response.error) {
    return fail('database', response.error.message ?? 'Unable to reset column preferences.', response.error)
  }

  return ok(true)
}

function assertSafePathSegment(value: string): string {
  const trimmed = value.trim()

  if (!trimmed || trimmed === '.' || trimmed === '..' || trimmed.includes('..')) {
    throw new Error('Expected a safe Supabase storage path segment.')
  }

  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('Expected a safe Supabase storage path segment.')
  }

  return trimmed
}
