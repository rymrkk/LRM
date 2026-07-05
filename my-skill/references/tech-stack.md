# Tech Stack Reference

Primary source: `docs/crm-application-specification.md`.

## Frontend

- React for UI composition.
- Vite for static app development and production builds.
- TypeScript for app contracts.
- Tailwind CSS for styling.
- TanStack Table for contacts table behavior.
- TanStack Virtual for rendering large row counts.
- Papa Parse or equivalent for browser CSV parsing.

The app should remain a static frontend. Do not introduce a custom backend server unless product requirements change.

## Supabase Services

- Supabase Auth for login/session handling.
- Supabase Storage for private workspace CSV objects.
- Supabase Postgres for workspace metadata and user-created CRM state.
- Supabase Row Level Security for per-user isolation.

Frontend code may use only browser-safe publishable configuration.

## Environment Variables

Required in `crm-app/.env.local`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Forbidden in browser app environment files:

```text
SUPABASE_SERVICE_ROLE_KEY
```

## Performance Direction

Baseline data is 47,613 rows. Use virtualization, memoized derived data, clear loading states, and non-blocking CSV parsing feedback. Avoid rendering all rows into the DOM.

## Testing Tools

- Vitest or equivalent for frontend unit tests.
- Browser automation for end-to-end smoke tests.
- Existing Python and Node tests for cleanup/workbook tooling.
- Project-local scripts in `my-skill/scripts` for Supabase env and workspace CSV validation.
