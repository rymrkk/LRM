import { createClient } from '@supabase/supabase-js'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase'

export type LrmSupabaseClient = SupabaseClient<Database>
export type SupabaseEnv = Record<string, string | boolean | undefined>

export type SupabaseServiceErrorCode = 'unconfigured' | 'auth' | 'database' | 'storage' | 'validation'

export type SupabaseServiceError = {
  code: SupabaseServiceErrorCode
  message: string
  cause?: unknown
}

export type SupabaseServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: SupabaseServiceError }

export type SupabaseConfigState =
  | { isConfigured: true; url: string; publishableKey: string }
  | { isConfigured: false; url: null; publishableKey: null }

export type SupabaseClientState =
  | { isConfigured: true; client: LrmSupabaseClient; error: null }
  | { isConfigured: false; client: null; error: SupabaseServiceError }

export type SupabaseAuthSession =
  | {
      status: 'authenticated'
      user: { id: string; email: string | null }
      accessToken: string
      expiresAt: number | null
    }
  | {
      status: 'unauthenticated'
      user: null
      accessToken: null
      expiresAt: null
    }

export function ok<T>(data: T): SupabaseServiceResult<T> {
  return { data, error: null }
}

export function fail<T>(
  code: SupabaseServiceErrorCode,
  message: string,
  cause?: unknown,
): SupabaseServiceResult<T> {
  return { data: null, error: { code, message, cause } }
}

export function missingClient<T = never>(): SupabaseServiceResult<T> {
  return fail('unconfigured', 'Supabase is not configured for this local/demo session.')
}

export function fromSupabaseResponse<T>(
  response: { data: T | null; error: { message?: string } | null },
  code: SupabaseServiceErrorCode,
): SupabaseServiceResult<T> {
  if (response.error) {
    return fail(code, response.error.message ?? 'Supabase request failed.', response.error)
  }

  return ok(response.data as T)
}

export function resolveSupabaseConfig(env: SupabaseEnv = import.meta.env): SupabaseConfigState {
  const url = readEnvString(env, 'VITE_SUPABASE_URL')
  const publishableKey = readEnvString(env, 'VITE_SUPABASE_PUBLISHABLE_KEY')

  if (!url || !publishableKey) {
    return { isConfigured: false, url: null, publishableKey: null }
  }

  return { isConfigured: true, url, publishableKey }
}

export function createSupabaseBrowserClient(env: SupabaseEnv = import.meta.env): SupabaseClientState {
  const config = resolveSupabaseConfig(env)

  if (!config.isConfigured) {
    return {
      isConfigured: false,
      client: null,
      error: {
        code: 'unconfigured',
        message: 'Supabase is not configured for this local/demo session.',
      },
    }
  }

  try {
    const client = createClient<Database>(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })

    return { isConfigured: true, client, error: null }
  } catch (cause) {
    return {
      isConfigured: false,
      client: null,
      error: {
        code: 'validation',
        message: 'Supabase client configuration is invalid.',
        cause,
      },
    }
  }
}

export function normalizeAuthSession(session: Session | null | undefined): SupabaseAuthSession {
  if (!session?.user) {
    return { status: 'unauthenticated', user: null, accessToken: null, expiresAt: null }
  }

  return {
    status: 'authenticated',
    user: { id: session.user.id, email: session.user.email ?? null },
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
  }
}

export function getAuthenticatedUserId(session: SupabaseAuthSession): string | null {
  return session.status === 'authenticated' ? session.user.id : null
}

export async function getCurrentAuthSession(
  client: Pick<LrmSupabaseClient, 'auth'> | null,
): Promise<SupabaseServiceResult<SupabaseAuthSession>> {
  if (!client) return missingClient()

  const response = await client.auth.getSession()

  if (response.error) {
    return fail('auth', response.error.message, response.error)
  }

  return ok(normalizeAuthSession(response.data.session))
}

function readEnvString(env: SupabaseEnv, key: string): string {
  const value = env[key]
  return typeof value === 'string' ? value.trim() : ''
}
