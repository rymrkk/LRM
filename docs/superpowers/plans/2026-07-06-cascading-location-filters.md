# Cascading Location Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace flat country/state chips with dataset-driven cascading Country -> State / Province -> City filters while preserving business filters, saved lists, and CSV workspace behavior.

**Architecture:** Keep `ContactFilters` backward-compatible, but split UI rendering into location filters and business filters. Add a data helper that builds deduplicated, sorted location option indexes from the active workspace contacts and filters contacts using normalized display values. The CSV/static JSON contacts remain the authoritative source.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing in-memory CSV/static JSON data helpers.

---

### Task 1: Data Model And Index Helpers

**Files:**
- Modify: `crm-app/src/types/workspace.ts`
- Modify: `crm-app/src/lib/constants.ts`
- Modify: `crm-app/src/lib/data/index.ts`
- Test: `crm-app/src/lib/data/index.test.ts`

- [x] Add `city` to `FilterKey` and `EMPTY_FILTERS`.
- [x] Add `BUSINESS_FILTER_KEYS = ['seniority', 'job_function', 'job_sector', 'employee_range']`.
- [x] Add `LOCATION_FILTER_KEYS = ['country', 'state', 'city']`.
- [x] Export `buildLocationFilterIndex(contacts)` returning sorted `countries`, `statesByCountry`, and `citiesByCountryState`.
- [x] Ensure null, blank, duplicate, invalid state artifact, and invalid city values are omitted.
- [x] Write failing tests that prove states are scoped to country and cities are scoped to country/state.
- [x] Run `npm test -- src/lib/data/index.test.ts` and confirm failure before implementation, then pass after implementation.

### Task 2: Cascading Filter UI

**Files:**
- Modify: `crm-app/src/App.tsx`
- Modify: `crm-app/src/index.css`
- Test: `crm-app/src/App.test.tsx`

- [x] Replace country/state chip rendering with a `LocationCascadeFilters` section.
- [x] Use searchable combobox inputs with datalist suggestions for Country, State / Province, and City.
- [x] Disable State / Province until Country is selected.
- [x] Disable City until Country is selected; when a selected country has state values, only enable City after State / Province is selected.
- [x] Reset State and City when Country changes.
- [x] Reset City when State / Province changes.
- [x] Keep business filters as dynamic chip groups using `BUSINESS_FILTER_KEYS`.
- [x] Show no-results copy for empty option searches.
- [x] Write failing App tests for Country combobox, disabled dependent filters, scoped options, and dependent resets.
- [x] Run `npm test -- src/App.test.tsx` red, implement, then run green.

### Task 3: Saved Lists And Existing Behavior

**Files:**
- Modify: `crm-app/src/App.test.tsx`
- Modify: `crm-app/src/App.tsx`

- [x] Preserve saved-list creation with current location and business filters.
- [x] Preserve saved-list reopening by populating cascading fields and business chips.
- [x] Update old tests that expected country/state chips.
- [x] Confirm CSV workspace upload still becomes the authoritative active dataset for cascading options.

### Task 4: Verification And Commit

**Files:**
- All modified files above.

- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Stage only source/test/plan files, not private generated lead data.
- [x] Commit with `feat: add cascading location filters`.
- [x] Push `codex/crm-implementation`.