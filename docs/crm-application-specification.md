# Lead Relationship Manager Application Specification

## Document Control

- Product name: Lead Relationship Manager
- Short name: LRM
- Repository: `https://github.com/rymrkk/LRM.git`
- Local workspace: `C:\Users\Ray Mark Cervantes\Documents\data_leads`
- Document type: Enterprise software specification
- Status: Implementation-ready specification
- Last updated: 2026-07-06
- Primary audience: developers, QA engineers, project managers, stakeholders, and future maintainers

## Executive Summary

Lead Relationship Manager is a lightweight CRM-style application for browsing, filtering, segmenting, and annotating cleaned lead data. The application starts from the verified cleaned Contacts dataset and evolves into a multi-workspace system where each workspace represents one CSV file.

The application is intentionally not a deal pipeline, kanban board, or full sales automation platform. Its core value is fast navigation of contact and company data, reusable filtered lists, and per-contact notes and tags. The app runs as a static React application, while Supabase provides authentication, CSV file storage, workspace metadata, and user-created CRM state.

## Goals

- Provide a dense, searchable, filterable contact database for 47,613 cleaned lead records.
- Support multiple CSV-backed workspaces so future datasets can be uploaded and managed independently.
- Preserve the cleaned lead dataset as trusted input and avoid re-cleaning in the CRM UI.
- Store user-created state such as saved lists, notes, tags, and column preferences by workspace.
- Keep deployment simple through static hosting plus managed Supabase services.
- Maintain a clean, enterprise-grade UI that supports repeated operational use.
- Provide enough documentation and tests for future maintainers to understand and safely extend the system.

## Non-Goals

- No deal pipeline or kanban board.
- No backend server owned by this repository.
- No public lead-data repository storage.
- No data-quality flag review UI.
- No automated lead enrichment.
- No multi-tenant admin console in the first implementation.
- No bulk email, dialer, campaign automation, or CRM synchronization in the first implementation.

## Stakeholder View

### Business Stakeholders

LRM gives the user a practical way to review and segment a large cleaned lead dataset without relying on spreadsheet performance or manual workbook navigation.

### Project Managers

The implementation can be tracked across independent workstreams: Supabase setup, CSV data engine, CRM UI, testing, documentation, and skill packaging.

### Developers

The system is a static React/Vite app with clearly separated modules for Supabase services, CSV parsing, filtering, UI views, and persistent user state.

### QA Engineers

The test strategy covers authentication gates, workspace CRUD, CSV parsing, contact table behavior, saved list persistence, workspace isolation, security policies, responsive UI, and production build readiness.

### Future Maintainers

The repository must keep private lead data out of Git. Sensitive CSV and workbook files remain local unless a separate private storage workflow is explicitly approved.

## Current Source Artifacts

The verified cleaned data and workbook artifacts exist locally and are ignored by Git:

- Cleaned CSV: `data/processed/10124-users.cleaned.csv`
- Organized workbook: `data/processed/10124-users.organized.xlsx`
- Cleaning issue log: `data/processed/10124-users.cleaning-issues.csv`
- Duplicate links: `data/processed/10124-users.duplicate-links.csv`
- Data quality note: `data/processed/10124-users.data-quality-note.md`

Only code, docs, tests, and placeholder data directories are pushed to GitHub.

## Product Capabilities

### Authentication

- Users authenticate through Supabase Auth.
- The first implementation assumes single-user access.
- Unauthenticated users must not load workspace metadata, CSV files, saved lists, notes, tags, or preferences.

### Workspace Management

Each workspace represents one CSV file.

Workspace capabilities:

- Create workspace by uploading a CSV file.
- List available workspaces.
- Open a workspace and load its CSV.
- Rename workspace metadata.
- Replace a workspace CSV with a newer file.
- Delete a workspace and its related persisted user state.

Workspace path convention:

```text
{user_id}/{workspace_id}/{version}.csv
```

### Contacts View

The default view is a dense table modeled after a professional contact database.

Default columns:

- `name`
- `job_title`
- `seniority`
- `company_name`
- `email`
- best available phone
- `city`
- `country`

Toggleable columns:

- `job_function`
- `job_sector`
- `employees`
- `employee_range`
- `state`
- `postal_code`
- LinkedIn profile
- `sources`

Required behaviors:

- Search across `name`, `email`, and `company_name`.
- Sort table columns where appropriate.
- Virtualize rows so 47,613 records remain responsive.
- Show live result count such as `1,204 of 47,613 shown`.
- Preserve blank values as empty display cells, not placeholders.

### Filter Panel

Filters are multi-select and update results live.

Supported filters:

- `seniority`
- `job_function`
- `job_sector`
- `country`
- `state`
- `employee_range`

Filter logic:

- OR within a single filter category.
- AND across different filter categories.
- Search query combines with filters using AND.

### Saved Lists

Users can save the active search and filter combination as a named list.

Saved list requirements:

- Lists are scoped to the active workspace.
- Applying a list restores its search query and filter selections.
- Renaming a workspace must not detach its saved lists.
- Deleting a workspace must remove or orphan-protect related saved lists according to the database policy.

### Contact Detail Drawer

Selecting a contact opens a side drawer.

Sections:

- Contact: name, email, phones, LinkedIn.
- Company: company name, employees, employee range, job fields.
- Address: primary and alternate/executive address values.
- Metadata: id, sources, data source, record path where available.

Interactive links:

- `mailto:` for email.
- `tel:` for phone numbers.
- External LinkedIn link where a valid profile exists.

User-created fields:

- Free-text notes.
- Manual tags.

Notes and tags are persisted by `workspace_id` and contact `id`.

### Companies View

The Companies view groups contacts by `company_name`.

Displayed fields:

- Company name.
- Contact count.
- Available countries or primary country summary.
- Employee range where available.

Users can drill into a company to view its contacts.

### Column Preferences

Users can configure visible columns and column order.

Requirements:

- Preferences persist by workspace.
- Switching workspaces restores that workspace's preferences.
- Resetting preferences returns to the default Contacts table columns.

## Information Architecture

Primary navigation:

- All Contacts
- Companies
- Saved Lists

Global controls:

- Workspace switcher.
- Workspace create/upload action.
- Top search bar.
- User account/logout control.

Secondary controls:

- Filter panel.
- Column picker.
- Save as list.
- Contact detail drawer.

## User Workflows

### First Login And Workspace Selection

1. User opens the static app.
2. App checks Supabase session.
3. If no session exists, login screen is shown.
4. User signs in.
5. App loads workspace metadata from Supabase.
6. User selects an existing workspace or creates one by uploading CSV.

Expected result:

- No workspace data loads before authentication.
- Workspace list appears after successful login.

### Create Workspace

1. User chooses create workspace.
2. User selects a CSV file.
3. App validates file extension and parses headers.
4. App counts data rows.
5. App uploads CSV to Supabase Storage.
6. App inserts a `workspaces` metadata row.
7. New workspace appears in the switcher.

Expected result:

- Initial cleaned dataset reports 47,613 rows.
- Invalid CSVs show clear errors and do not create metadata rows.

### Open Workspace

1. User selects a workspace.
2. App downloads the workspace CSV from Supabase Storage.
3. App parses CSV in the browser.
4. App builds filter options, search index, company groups, and table rows.
5. Contacts table renders with virtualization.

Expected result:

- Active workspace state replaces previous workspace state cleanly.
- Previous workspace rows are not mixed with the new workspace.

### Save Filtered List

1. User searches or filters contacts.
2. User clicks Save as list.
3. User enters a list name.
4. App stores filter state and search query in Supabase.
5. Saved list appears in Saved Lists.

Expected result:

- Applying the saved list later restores the same segment.
- Saved list does not appear in other workspaces.

### Add Notes And Tags

1. User opens a contact detail drawer.
2. User enters notes and tags.
3. App saves the values to Supabase.
4. User reloads or switches views.
5. User reopens the same contact.

Expected result:

- Notes and tags persist for that contact in that workspace only.

### Replace Workspace CSV

1. User chooses replace CSV.
2. App validates the new CSV.
3. App uploads the new file under a new version path.
4. App updates workspace metadata and row count.
5. App clears active rows and loads the new file.

Expected result:

- No old CSV rows remain visible after replacement.
- Workspace identity remains stable so saved state stays attached unless data ids no longer match.

### Delete Workspace

1. User chooses delete workspace.
2. App shows confirmation including workspace name.
3. On confirmation, app deletes or deactivates related state and removes the Storage object.
4. Workspace disappears from the switcher.

Expected result:

- Other workspaces remain unchanged.
- Deleted workspace data is no longer visible.

## System Architecture

### High-Level Components

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

### Frontend Architecture

The app is organized into focused modules:

- `src/types`: shared TypeScript contracts.
- `src/lib/supabase`: Supabase client and service wrappers.
- `src/lib/data`: CSV parsing, validation, search, filters, grouping.
- `src/components`: reusable UI controls.
- `src/pages`: top-level views.
- `src/hooks`: state and data loading hooks.
- `src/tests` or `tests`: unit and browser tests.

### Data Flow

```text
Supabase Auth session
  -> load workspace metadata
  -> select workspace
  -> download CSV from Supabase Storage
  -> parse CSV in browser
  -> normalize display-only row helpers
  -> apply search and filters
  -> render virtualized table
  -> open detail drawer
  -> save notes/tags/lists/preferences to Supabase Postgres
```

### Deployment Architecture

The app is deployable to a static host such as Vercel, Netlify, GitHub Pages, or S3.

Runtime services:

- Static site host serves the compiled React app.
- Supabase Auth manages login.
- Supabase Storage stores CSV workspace files.
- Supabase Postgres stores metadata and user-created CRM state.

No custom backend server is required.

## Technology Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Table
- TanStack Virtual
- Papa Parse or equivalent CSV parser

Backend services:

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Row Level Security

Testing:

- Vitest or equivalent for unit tests.
- Browser automation for end-to-end smoke tests.
- Existing Python and Node tests for cleanup/workbook tooling.

Repository:

- GitHub remote: `https://github.com/rymrkk/LRM.git`
- Sensitive lead data is not pushed.

## Data Model

### Contact Row

The app treats CSV rows as trusted cleaned contact records.

Expected key fields:

- `id`
- `name`
- `job_title`
- `seniority`
- `job_function`
- `job_function_2`
- `job_sector`
- `email`
- `desk_phone`
- `corporate_phone`
- `mobile_phone`
- `executive_linkedin_profile`
- `company_name`
- `employees`
- `employee_range`
- `street`
- `city`
- `state`
- `country`
- `postal_code`
- `executive_street`
- `executive_city`
- `executive_area`
- `executive_state`
- `executive_postal_code`
- `recordPath`
- `sources`
- `data_source`

Display-only helper:

- Best phone is selected from available phone fields using a deterministic priority.

### Workspace

```text
workspaces
- id
- user_id
- name
- storage_path
- original_filename
- row_count
- created_at
- updated_at
```

### Saved List

```text
saved_lists
- id
- workspace_id
- user_id
- name
- filters_json
- search_query
- created_at
- updated_at
```

### Contact Notes

```text
contact_notes
- workspace_id
- contact_id
- user_id
- notes
- tags_json
- updated_at
```

### Column Preferences

```text
column_preferences
- workspace_id
- user_id
- visible_columns_json
- column_order_json
- updated_at
```

## Supabase Requirements

### Auth

- Enable Supabase Auth for single-user login.
- The browser app uses only publishable client configuration.
- No service role key may be included in the frontend.

### Storage

- Bucket name: `lead-workspaces`
- Bucket access: private
- Object path: `{user_id}/{workspace_id}/{version}.csv`

### Row Level Security

RLS must be enabled on all public application tables.

Policy principle:

- A user can select, insert, update, and delete only rows where `user_id = auth.uid()`.
- Storage policies must restrict access to objects under the authenticated user's folder.

### Environment Variables

The app uses:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Do not use:

```text
SUPABASE_SERVICE_ROLE_KEY
```

in the browser app.

## Security And Privacy

### Data Handling

- Lead data is private and must not be committed to GitHub.
- Raw CSVs, cleaned CSVs, workbooks, previews, and inspection logs remain local.
- Supabase is the approved storage destination for CSV workspaces after manual setup.

### Access Control

- Authentication is required before data access.
- RLS protects metadata and CRM state.
- Storage policies protect CSV files.

### Secret Management

- Only publishable browser-safe keys may be present in `.env.local`.
- `.env.local` must not be committed.
- Service-role keys are reserved for server-side or manual administrative use only and are out of scope for the static app.

### Auditability

For every successful update:

- Verify changes.
- Commit intended files.
- Push to GitHub.
- Keep lead data out of Git.

See `docs/github-workflow-rules.md`.

## Design System Direction

The design reference file is:

```text
C:\Users\Ray Mark Cervantes\Downloads\DESIGN-slack.md
```

Use it only as a visual reference.

Allowed adaptations:

- Aubergine accent for selected navigation and primary actions.
- Pill-shaped primary controls where appropriate.
- Soft lavender or cream secondary surfaces.
- Inter-style typography.
- Dense, work-focused CRM layout.

Do not copy:

- Slack branding.
- Slack logos.
- Chat-specific interaction patterns.
- Marketing page composition.

The UI should feel like a polished operational CRM, not a decorative landing page.

## Performance Requirements

Baseline dataset:

- 47,613 contact rows.

Requirements:

- Table rendering must use virtualization.
- Filtering and search must update interactively for the full baseline dataset.
- Opening a workspace should show loading progress or a clear loading state.
- Search and filter state changes should not render all rows into the DOM.
- Large CSV parsing should avoid blocking the UI without feedback.

Target acceptance:

- Initial workspace load should be acceptable on a normal laptop.
- Table scroll should remain smooth with the full baseline dataset.
- UI should remain readable at common desktop and laptop widths.

## Accessibility Requirements

- All interactive controls must be keyboard reachable.
- Buttons and icon buttons must have accessible names.
- Form fields must have labels.
- Filter selections must be perceivable by screen readers.
- Focus states must be visible.
- Drawer open and close behavior must manage focus predictably.
- Color contrast must be sufficient for text, table content, and action controls.

## Error Handling Requirements

### Auth Errors

- Failed login shows a clear error.
- Expired session returns user to login.
- Unauthorized data access does not expose partial workspace content.

### CSV Errors

- Missing required headers block workspace creation.
- Empty files block workspace creation.
- Invalid CSV parse errors show actionable feedback.
- Row-count mismatch shows a clear warning before save.

### Supabase Errors

- Upload failure does not create orphaned workspace metadata.
- Metadata insert failure should not leave the UI showing a successful workspace.
- Delete failure should show what failed: metadata, related state, or Storage object.

### Runtime Errors

- The app should recover from view-level errors without losing the active session.
- Unexpected failures should be logged to the console during development.

## Testing Strategy

### Unit Tests

Test these modules:

- CSV required-header validation.
- CSV row counting.
- Best-phone derivation.
- Search matching across name, email, and company.
- Filter logic: OR within category, AND across categories.
- Company grouping.
- Saved-list serialization.
- Workspace state isolation.
- Supabase path construction.

### Integration Tests

Test these flows with mocked Supabase services:

- Auth gate blocks unauthenticated users.
- Workspace create inserts metadata only after upload succeeds.
- Workspace replacement clears old rows and loads new rows.
- Saved lists restore search and filter state.
- Notes and tags persist by workspace and contact id.
- Column preferences persist by workspace.

### End-to-End Smoke Tests

Test against a configured Supabase project or test double:

- Login.
- Create workspace.
- Open workspace.
- Filter contacts.
- Save list.
- Open contact drawer.
- Save notes and tags.
- Switch workspace and verify isolation.
- Delete workspace.

### Security Tests

Verify:

- Logged-out users cannot read application tables.
- One user cannot access another user's workspace rows.
- One user cannot access another user's Storage objects.
- No service-role key is bundled into the frontend.
- Git tracked files do not include private data artifacts.

### Visual And Responsive Tests

Verify:

- No table header overlap.
- No clipped filter labels.
- Drawer content scrolls correctly.
- Primary actions fit within their containers.
- Left nav remains readable.
- Empty, loading, and error states are polished.

### Repository Verification

Before each commit:

```powershell
git status --short --ignored
git diff --check
git diff --cached --name-only
```

Existing tooling verification:

```powershell
python -m unittest discover tests
node tests/test_organized_workbook_helpers.mjs
```

Use the bundled Python runtime when local Python lacks required packages.

## Acceptance Criteria

The app is acceptable when:

- The static app builds without TypeScript errors.
- Supabase login works.
- A CSV workspace can be created, opened, renamed, replaced, and deleted.
- The initial cleaned Contacts CSV loads as 47,613 rows.
- Contacts table search, filters, sorting, columns, and virtualization work.
- Companies view groups by company name.
- Saved lists persist per workspace.
- Notes and tags persist per contact per workspace.
- Column preferences persist per workspace.
- RLS blocks unauthorized data access.
- No sensitive lead data is committed to GitHub.
- Documentation and tests describe how to maintain the system.

## Operational Procedures

### Local Development

1. Clone or open the repository.
2. Keep local lead data files outside Git tracking.
3. Create `crm-app/.env.local` with Supabase project values.
4. Install frontend dependencies.
5. Run the dev server.
6. Use a local or Supabase-backed test workspace.

### Supabase Setup

1. Create Supabase project.
2. Configure Auth.
3. Create private `lead-workspaces` Storage bucket.
4. Create application tables.
5. Enable RLS.
6. Add table and Storage policies.
7. Add frontend environment variables.
8. Run auth, upload, and RLS smoke tests.

### Release

1. Run unit tests.
2. Run browser smoke tests.
3. Run production build.
4. Verify no secrets or lead files are tracked.
5. Commit.
6. Push to GitHub.
7. Deploy static build to chosen host.

## Maintainability Guidelines

- Keep parsing and filtering logic separate from UI components.
- Keep Supabase queries inside service modules.
- Do not introduce backend server code unless a future requirement demands it.
- Do not re-clean data inside the CRM app.
- Keep workspace state scoped by `workspace_id`.
- Prefer explicit file staging in Git.
- Update this specification when product behavior changes.

## Parallel Implementation Model

Implementation is divided into agent lanes:

- Skill Package Agent: `my-skill/**`
- Supabase Layer Agent: Supabase client, schema, auth, storage, RLS.
- CSV Data Engine Agent: parsing, validation, search, filters, grouping.
- CRM UI Agent: layout, contacts, companies, saved lists, drawer.
- Verification Agent: tests, fixtures, build checks.
- GitHub Environment Validation Agent: repository health, push safety, debugging.

The controller integrates changes, runs verification, commits, and pushes after every successful update.

## Risks And Mitigations

### Risk: Sensitive data pushed to GitHub

Mitigation:

- Ignore lead artifacts.
- Stage explicit files only.
- Inspect staged paths before commit.

### Risk: Browser performance degrades with large CSVs

Mitigation:

- Use table virtualization.
- Memoize derived filter options and grouped company data.
- Show loading states during parsing.

### Risk: RLS misconfiguration exposes data

Mitigation:

- Keep bucket private.
- Enable RLS on all tables.
- Test logged-out and cross-user access.

### Risk: Workspace replacement breaks notes and tags

Mitigation:

- Preserve `workspace_id`.
- Key notes/tags by contact `id`.
- Warn when replacement CSV has missing or changed ids.

### Risk: Scope expands into full CRM

Mitigation:

- Keep non-goals explicit.
- Exclude deal pipeline, campaigns, backend API, and enrichment from the first implementation.

## Open Implementation Items

- Create the React/Vite application.
- Implement Supabase schema and setup assets.
- Implement CSV parsing and workspace loading.
- Build CRM UI views.
- Create `my-skill` project skill.
- Add unit, integration, browser, and security tests.
- Configure static deployment after Supabase is ready.

## Reference Documents

- `README.md`
- `docs/github-workflow-rules.md`
- `docs/lead-cleanup-plan.md`
- `docs/migration-note.md`
- `C:\Users\Ray Mark Cervantes\Downloads\DESIGN-slack.md`
- Supabase documentation:
  - `https://supabase.com/docs/guides/getting-started/quickstarts/reactjs`
  - `https://supabase.com/docs/guides/database/postgres/row-level-security`
  - `https://supabase.com/docs/guides/storage/security/access-control`
  - `https://supabase.com/docs/guides/storage/uploads/standard-uploads`
