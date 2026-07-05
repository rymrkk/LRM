# Data Contracts Reference

Primary source: `docs/crm-application-specification.md`.

## Contact CSV

The app treats CSV rows as trusted cleaned contact records. Preserve blank values as empty display cells, not placeholders.

Expected headers:

```text
id
name
job_title
seniority
job_function
job_function_2
job_sector
email
desk_phone
corporate_phone
mobile_phone
executive_linkedin_profile
company_name
employees
employee_range
street
city
state
country
postal_code
executive_street
executive_city
executive_area
executive_state
executive_postal_code
recordPath
sources
data_source
```

Use `scripts/validate_workspace_csv.mjs <csv-path> --strict` when checking a candidate workspace CSV.

## Default Contacts Table

Default columns:

- `name`
- `job_title`
- `seniority`
- `company_name`
- `email`
- best available phone
- `city`
- `country`

Best phone priority:

1. `mobile_phone`
2. `desk_phone`
3. `corporate_phone`

## Search And Filters

Search fields:

- `name`
- `email`
- `company_name`

Filter categories:

- `seniority`
- `job_function`
- `job_sector`
- `country`
- `state`
- `employee_range`

Filter logic is OR within one category and AND across categories. Search query combines with filters using AND.

## Workspace

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

## Saved List

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

Saved lists are scoped to the active workspace. Applying a saved list restores search query and filters.

## Contact Notes

```text
contact_notes
- workspace_id
- contact_id
- user_id
- notes
- tags_json
- updated_at
```

Persist notes and tags by both `workspace_id` and contact `id`.

## Column Preferences

```text
column_preferences
- workspace_id
- user_id
- visible_columns_json
- column_order_json
- updated_at
```

Preferences persist per workspace. Reset returns to the default Contacts table columns.
