# Data Leads Cleanup Project

This folder is now the dedicated workspace for cleaning and later browsing the
`10124-users.csv` CRM export.

## Migrated Context

- Previous Codex thread: `019f2df3-dd02-7320-bac6-fa5e5289ebf0`
- Previous working folder: `C:\Users\Ray Mark Cervantes\Documents\otits-portfolio`
- New working folder: `C:\Users\Ray Mark Cervantes\Documents\data_leads`
- Source export: `C:\Users\Ray Mark Cervantes\Downloads\10124-users.csv`
- Raw project copy: `data\raw\10124-users.csv`
- Migrated on: `2026-07-05` Asia/Manila

The old folder was a portfolio site repo, so this workspace intentionally keeps
the lead-list cleanup separate from that unrelated project.

## Project Layout

- `data\raw\`: untouched source data copied into this project.
- `data\processed\`: cleaned CSVs and generated audit reports.
- `docs\`: cleanup plan, migration notes, and data-quality decisions.
- `tools\`: reproducible scripts for profiling and cleaning.
- `tests\`: checks for cleanup rules and regression coverage.

## Current Status

The source CSV has been copied into `data\raw\10124-users.csv`, cleaned outputs
have been generated in `data\processed\`, and the final organized workbook is:

`data\processed\10124-users.organized.xlsx`

## Rebuild Commands

To regenerate the organized workbook from the verified cleaned CSV and audit
files, run:

```powershell
tools\build_organized_workbook.ps1
```

That runner uses Node with `--max-old-space-size=8192` for the large workbook
export, then runs the workbook finalizer that restores frozen header rows.


## GitHub Workflow

Repository commits and pushes follow the rules in `docs/github-workflow-rules.md`.
After every verified successful update, commit the intended files and push the active branch to `origin`.
