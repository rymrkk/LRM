# Assets Reference

Assets are templates or setup files. They must not contain private lead data, real Supabase secrets, or local-only user values.

## supabase-schema.sql

Use in the Supabase SQL editor to create:

- `public.workspaces`
- `public.saved_lists`
- `public.contact_notes`
- `public.column_preferences`
- timestamp trigger helper
- table RLS policies
- private `lead-workspaces` bucket entry
- Storage object policies scoped by `{user_id}/...`

Review policies before applying to an existing project with production data.

## .env.local.example

Copy values into `crm-app/.env.local` and replace placeholders with the project's browser-safe values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not add `SUPABASE_SERVICE_ROLE_KEY`.

## workspace-csv-template.csv

Minimal fake CSV template with the expected CRM headers and one non-private example row. Use it for parser smoke tests or as a shape reference only.
