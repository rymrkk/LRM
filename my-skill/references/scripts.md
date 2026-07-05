# Scripts Reference

The scripts are dependency-free Node ESM utilities intended for local verification. They do not print private lead values.

## check_supabase_env.mjs

Validate a Supabase environment file:

```powershell
node my-skill/scripts/check_supabase_env.mjs crm-app/.env.local
```

Validate the included example:

```powershell
node my-skill/scripts/check_supabase_env.mjs my-skill/assets/.env.local.example --allow-placeholders
```

Checks:

- `VITE_SUPABASE_URL` exists and is an HTTP(S) Supabase-style URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` exists.
- `SUPABASE_SERVICE_ROLE_KEY` is not present.
- Placeholder values are rejected unless `--allow-placeholders` is passed.

## validate_workspace_csv.mjs

Validate a workspace CSV header and row count:

```powershell
node my-skill/scripts/validate_workspace_csv.mjs path/to/workspace.csv --strict
```

Useful optional row-count check for the baseline cleaned dataset:

```powershell
node my-skill/scripts/validate_workspace_csv.mjs data/processed/10124-users.cleaned.csv --strict --expect-rows=47613
```

Checks:

- File exists and is non-empty.
- Header row is parseable.
- Duplicate headers are rejected.
- Required CRM headers are present.
- Strict mode requires every expected header from `references/data-contracts.md`.
- Row count excludes the header and trailing blank rows.
