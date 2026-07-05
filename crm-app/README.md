# Lead Relationship Manager CRM App

Static React/Vite frontend for browsing CSV-backed lead workspaces.

## Stack

- React + TypeScript
- Vite 5
- Tailwind CSS 3 through PostCSS
- TanStack Table and TanStack Virtual
- Supabase JS
- Papa Parse
- Vitest and Testing Library

## Scripts

```powershell
npm run dev
npm test
npm run build
```

The app uses browser-safe Supabase variables only:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Do not add service-role keys to this frontend project.
