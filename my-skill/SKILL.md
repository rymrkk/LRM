---
name: my-skill
description: Use when implementing or verifying the Lead Relationship Manager workspace, Supabase setup, CSV contracts, CRM UI conventions, tests, scripts, or repository safety rules for this project.
---

# Lead Relationship Manager

Use this project-local skill for work on the Lead Relationship Manager repository. Start with `docs/crm-application-specification.md` and `docs/github-workflow-rules.md` when behavior, data handling, verification, or Git safety matters.

Load only the reference files needed for the task:

- `references/architecture.md` for scope, ownership, app structure, and data flow.
- `references/tech-stack.md` for React, Vite, TypeScript, Supabase, CSV, and test tooling.
- `references/supabase-setup.md` for Auth, Storage, Postgres, RLS, and environment setup.
- `references/data-contracts.md` for CSV headers, workspace state, saved lists, notes, tags, and column preferences.
- `references/design-reference.md` for the dense CRM UI direction and Slack-inspired limits.
- `references/testing.md` for unit, integration, browser, security, and Git checks.
- `references/scripts.md` for bundled script usage.
- `references/assets.md` for schema, environment, and CSV template assets.

Guardrails: keep private lead data out of Git, use browser-safe Supabase keys only, preserve workspace isolation by `workspace_id`, and run relevant verification before staging explicit safe paths.
