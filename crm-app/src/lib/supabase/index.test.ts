import { describe, expect, it } from 'vitest'
import { STORAGE_BUCKET } from '../constants'
import {
  createSupabaseBrowserClient,
  getAuthenticatedUserId,
  missingClient,
  normalizeAuthSession,
  resolveSupabaseConfig,
} from './client'
import { WORKSPACE_STORAGE_BUCKET, buildWorkspaceCsvPath, uploadWorkspaceCsv } from './services'

describe('Supabase client configuration', () => {
  it('reports unconfigured state without throwing during local/demo imports', () => {
    expect(resolveSupabaseConfig({})).toEqual({ isConfigured: false, url: null, publishableKey: null })

    const clientState = createSupabaseBrowserClient({})

    expect(clientState).toMatchObject({
      isConfigured: false,
      client: null,
      error: {
        code: 'unconfigured',
      },
    })
  })

  it('resolves browser-safe Supabase environment keys', () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: ' https://project.supabase.co ',
        VITE_SUPABASE_PUBLISHABLE_KEY: ' publishable-key ',
      }),
    ).toEqual({
      isConfigured: true,
      url: 'https://project.supabase.co',
      publishableKey: 'publishable-key',
    })
  })

  it('normalizes Supabase sessions into the app auth shape', () => {
    expect(normalizeAuthSession(null)).toEqual({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      expiresAt: null,
    })
    expect(normalizeAuthSession({ access_token: 'orphaned-token', user: null } as never)).toEqual({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      expiresAt: null,
    })

    const session = normalizeAuthSession({
      access_token: 'access-token',
      expires_at: 123,
      user: { id: 'user-1', email: 'owner@example.com' },
    } as never)

    expect(session).toEqual({
      status: 'authenticated',
      user: { id: 'user-1', email: 'owner@example.com' },
      accessToken: 'access-token',
      expiresAt: 123,
    })
    expect(getAuthenticatedUserId(session)).toBe('user-1')
  })
})

describe('Supabase workspace services', () => {
  it('builds safe storage paths using one CSV per workspace version', () => {
    expect(WORKSPACE_STORAGE_BUCKET).toBe(STORAGE_BUCKET)
    expect(
      buildWorkspaceCsvPath({
        userId: 'user_123',
        workspaceId: 'workspace_456',
        version: 'v1.csv',
      }),
    ).toBe('user_123/workspace_456/v1.csv')
  })

  it('rejects unsafe storage path segments', () => {
    expect(() =>
      buildWorkspaceCsvPath({ userId: 'user_123', workspaceId: '../workspace', version: 'v1' }),
    ).toThrow(/safe Supabase storage path segment/i)
  })

  it('returns typed unconfigured errors when a service receives no client', async () => {
    expect(missingClient()).toEqual({
      data: null,
      error: {
        code: 'unconfigured',
        message: 'Supabase is not configured for this local/demo session.',
      },
    })

    await expect(
      uploadWorkspaceCsv(null, {
        userId: 'user_123',
        workspaceId: 'workspace_456',
        version: 'v1',
        file: new Blob(['id,name'], { type: 'text/csv' }),
      }),
    ).resolves.toMatchObject({
      data: null,
      error: { code: 'unconfigured' },
    })
  })
})
