# GitHub Workflow Rules

## Repository

- Local workspace: `C:\Users\Ray Mark Cervantes\Documents\data_leads`
- Remote: `https://github.com/rymrkk/LRM.git`
- Default branch: `main`

## GitHub Environment Validation Agent

Add one dedicated agent lane named **GitHub Environment Validation Agent** to every implementation cycle.

Responsibilities:

- Validate that the local branch tracks `origin/main` or the active feature branch.
- Verify that sensitive lead data is not tracked before any push.
- Debug remote, auth, branch, and push failures.
- Confirm that each successful implementation checkpoint has a commit and push.
- Report risks before implementation agents continue if GitHub state is unhealthy.

This agent is read-only by default. It may recommend commands, but the controller applies repository changes.

## Commit And Push Rule

Every successful update must follow this gate:

1. Inspect changed files with `git status --short --ignored`.
2. Confirm no ignored or sensitive files are staged:
   - raw CSV exports
   - cleaned CSV outputs
   - generated workbook files
   - inspect logs or NDJSON
   - caches, temp files, or `node_modules`
3. Run the relevant verification for the changed area.
4. Stage explicit safe paths only. Avoid broad `git add .` unless the ignored-status review is complete.
5. Inspect staged paths with `git diff --cached --name-only`.
6. Commit with a concise message.
7. Run `git fetch origin` and confirm the active branch is not behind its upstream.
8. Push the active branch to `origin`.
9. Confirm `git status --short` is clean or contains only intentionally local ignored data.

If verification fails, do not commit. Fix or document the blocker first.

## Parallel Agent Integration

Use these lanes after the repository baseline is healthy:

- Skill Package Agent: owns `my-skill/**`.
- Supabase Layer Agent: owns Supabase client, schema, auth, storage, and RLS files.
- CSV Data Engine Agent: owns CSV parsing, validation, filtering, search, and grouping logic.
- CRM UI Agent: owns React layout, table, drawer, filters, saved lists, and workspace UI.
- Verification Agent: owns tests and fixtures.
- GitHub Environment Validation Agent: owns repository health checks and push debugging.

Agents must not overwrite each other. The controller integrates changes, runs verification, commits, and pushes.

## Debugging Checklist

For failed pushes:

- Run `git remote -v` and confirm `origin` is `https://github.com/rymrkk/LRM.git`.
- Run `git branch -vv` and confirm the active branch tracks the expected upstream.
- Run `git status --short --ignored` and check for accidental tracked data.
- Run `git ls-remote --heads origin` to verify remote reachability.
- If authentication fails, check Git Credential Manager, or run `gh auth status` if GitHub CLI is installed.
- If rejected due remote history, fetch first and inspect before merging or rebasing.
- If rejected due file size or privacy risk, remove the file from the index and amend before pushing.
- Avoid force-pushing to `main`.
- If GitHub CLI is unavailable, rely on `git` plus browser/GitHub UI for repository inspection.

## Data Safety Rules

Do not track or push:

- `data/raw/*.csv`
- `data/processed/*.csv`
- `data/processed/*.xlsx`
- `data/processed/*.json`
- `data/processed/*.ndjson`
- `data/processed/*.log`
- `data/processed/workbook-previews/`
- `node_modules/`
- Python caches and test scratch files

The finalized workbook and cleaned lead data remain local deliverables unless the user explicitly requests a different private storage workflow.
