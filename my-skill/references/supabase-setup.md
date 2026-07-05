# Supabase Setup Reference

Use `assets/supabase-schema.sql` as the starting SQL for Postgres tables, triggers, RLS policies, and Storage policies.

## Setup Steps

1. Create or open a Supabase project.
2. Enable Auth for the intended single-user login method.
3. Create the private Storage bucket `lead-workspaces`.
4. Apply `assets/supabase-schema.sql` in the Supabase SQL editor.
5. Confirm RLS is enabled on all application tables.
6. Add `crm-app/.env.local` from `assets/.env.local.example`.
7. Run `scripts/check_supabase_env.mjs` against the local env file.
8. Smoke test login, upload, workspace load, saved list, notes/tags, and delete flows.

## Auth

Unauthenticated users must not read workspace metadata, CSV objects, saved lists, notes, tags, or preferences.

The first implementation assumes single-user access, but policies should still scope every row to `auth.uid()`.

## Storage

Bucket:

```text
lead-workspaces
```

Object path:

```text
{user_id}/{workspace_id}/{version}.csv
```

The bucket should be private. Storage policies should allow authenticated users to select, insert, update, and delete only objects whose first path segment equals their user id.

## Tables

Application tables:

- `public.workspaces`
- `public.saved_lists`
- `public.contact_notes`
- `public.column_preferences`

Each table includes `user_id`, and RLS policies limit access to rows where `user_id = auth.uid()`.

## Secret Safety

Never place a service-role key in frontend code, committed files, `.env.local`, or `VITE_` variables. Service-role keys are out of scope for the static app.
