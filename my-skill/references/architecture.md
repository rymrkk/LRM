# Architecture Reference

Primary source: `docs/crm-application-specification.md`. Git safety source: `docs/github-workflow-rules.md`.

## Product Scope

Lead Relationship Manager is a static React CRM for browsing, filtering, segmenting, and annotating cleaned lead records. It is intentionally not a deal pipeline, kanban board, campaign tool, enrichment workflow, or backend service.

The first implementation supports authenticated single-user access, multiple CSV-backed workspaces, saved lists, notes, tags, companies grouping, and column preferences.

## Runtime Architecture

```text
Browser
  React/Vite App
    Auth Gate
    Workspace Shell
    CSV Data Engine
    Contacts Table
    Companies View
    Saved Lists View
    Contact Drawer
    Persistence Services

Supabase
  Auth
  Postgres
  Storage
  Row Level Security
```

## Data Flow

```text
Supabase Auth session
  -> load workspace metadata
  -> select workspace
  -> download private CSV from Storage
  -> parse CSV in browser
  -> derive filter options, search matches, best phone, company groups
  -> render virtualized contacts table
  -> persist lists, notes, tags, and column preferences in Postgres
```

No workspace metadata, CSV files, saved lists, notes, tags, or preferences should load before authentication.

## Workspace Ownership

Each workspace represents one CSV file. Storage objects use this path:

```text
{user_id}/{workspace_id}/{version}.csv
```

Use stable `workspace_id` values for saved lists, notes, tags, and column preferences. Replacing a CSV changes the storage path/version but should not detach workspace-scoped state.

## Repository Ownership

This skill lane owns `my-skill/**`. Other lanes may edit `crm-app/**`, `docs/**`, tests, or tooling. Do not overwrite parallel work. Read surrounding files before editing any shared area and prefer scoped changes.

Sensitive local artifacts must not be tracked:

- `data/raw/*.csv`
- `data/processed/*.csv`
- `data/processed/*.xlsx`
- `data/processed/*.json`
- `data/processed/*.ndjson`
- `data/processed/*.log`
- `data/processed/workbook-previews/`
- `node_modules/`
- caches and scratch files
