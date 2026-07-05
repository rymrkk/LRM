# Testing Reference

Primary sources: `docs/crm-application-specification.md` and `docs/github-workflow-rules.md`.

## Unit Tests

Cover:

- CSV required-header validation.
- CSV row counting.
- Best-phone derivation.
- Search matching across `name`, `email`, and `company_name`.
- Filter logic: OR within category, AND across categories.
- Company grouping.
- Saved-list serialization.
- Workspace state isolation.
- Supabase path construction.

## Integration Tests

Use mocked Supabase services for:

- Auth gate blocks unauthenticated users.
- Workspace create inserts metadata only after upload succeeds.
- Workspace replacement clears old rows and loads new rows.
- Saved lists restore search and filter state.
- Notes and tags persist by workspace and contact id.
- Column preferences persist by workspace.

## End-to-End Smoke Tests

Against a configured Supabase project or test double:

- Login.
- Create workspace.
- Open workspace.
- Filter contacts.
- Save list.
- Open contact drawer.
- Save notes and tags.
- Switch workspace and verify isolation.
- Delete workspace.

## Security Tests

Verify:

- Logged-out users cannot read application tables.
- One user cannot access another user's workspace rows.
- One user cannot access another user's Storage objects.
- No service-role key is bundled into frontend code.
- Git tracked files do not include private data artifacts.

## Repository Verification

Before commit or handoff:

```powershell
git status --short --ignored
git diff --check
git diff --cached --name-only
```

Existing repository checks:

```powershell
python -m unittest discover tests
node tests/test_organized_workbook_helpers.mjs
```

Skill package checks:

```powershell
python C:\Users\Ray Mark Cervantes\.codex\skills\.system\skill-creator\scripts\quick_validate.py my-skill
node my-skill/scripts/check_supabase_env.mjs my-skill/assets/.env.local.example --allow-placeholders
node my-skill/scripts/validate_workspace_csv.mjs my-skill/assets/workspace-csv-template.csv --strict
```
