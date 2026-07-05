# Lead List CSV Cleanup Plan

## Summary

Create a reproducible cleanup script for `10124-users.csv` that leaves the
source file unchanged, writes a cleaned all-rows CSV, and emits audit files for
duplicates, company canonicalization, and data-quality notes.

The previous profiling pass found:

- `47,613` rows and `30` columns.
- `811` likely duplicate person groups by normalized `name + company_name`.
- `14,895` scientific-notation cells across phone fields.
- `2` scientific-notation postal-code cells.
- All `id` values looked like UUIDv1 values, giving a defensible recency
  tie-breaker.

## Command Shape

```powershell
python tools\clean_leads.py --input data\raw\10124-users.csv --output-dir data\processed
```

## Expected Outputs

- `data\processed\10124-users.cleaned.csv`
- `data\processed\10124-users.duplicate-links.csv`
- `data\processed\10124-users.company-name-map.csv`
- `data\processed\10124-users.cleaning-issues.csv`
- `data\processed\10124-users.data-quality-note.md`

## Cleanup Rules

- Read every field as text.
- Trim leading and trailing whitespace in text fields.
- Preserve the original `id` column unchanged.
- Do not invent missing emails, phones, addresses, companies, cities, states, or
  countries.
- Normalize US `state` and `executive_state` values to USPS two-letter
  abbreviations only when the row is clearly US.
- Normalize `company_name` by grouping case and spacing variants, choosing the
  most frequent trimmed/collapsed spelling as canonical.
- Keep `country` as a full country name and `executive_country_code` as a
  lowercase ISO-2 code; flag mismatches rather than overwriting either field.
- Trim `data_source`, leave blanks blank, and flag blank or non-standard-looking
  values.
- Validate email format after trimming. Leave invalid emails as-is but flag them.

## Duplicate Handling

- Define likely duplicate people as rows with the same normalized `name` and
  canonicalized `company_name`.
- Keep every row in the cleaned CSV.
- Add metadata columns such as `duplicate_group_id`, `duplicate_status`,
  `duplicate_of_id`, `duplicate_reason`, and `row_quality_flags`.
- Choose one primary row per duplicate group by highest completeness score, then
  newest UUIDv1 timestamp from `id`, then lexical `id`.
- Do not merge values across duplicate rows.
- List secondary records in the duplicate-links report.

## Phone And Postal Recovery

- Parse scientific notation with `Decimal`.
- Recover only when the expanded value is a plausible full identifier and does
  not look rounded or padded.
- Blank low-precision or suspicious scientific-notation phone values and flag
  them.
- Blank scientific-notation postal codes unless they pass a country-specific
  plausibility check.
- Keep existing digit-only phone values as strings.
- Do not add formatting, country codes, inferred prefixes, or guessed digits.

## Test Plan

- Scientific notation: low-precision values like `9.18826E+11` are blanked and
  flagged; high-precision unambiguous values are expanded.
- Duplicate ranking: completeness wins first, UUIDv1 recency breaks ties, and all
  duplicate IDs are listed.
- State normalization: `California` and `CA` both become `CA` for US rows;
  non-US regions are not rewritten.
- Company canonicalization: casing and spacing variants map to one canonical
  value and appear in the mapping report.
- End-to-end: row count remains `47,613`, source hash is unchanged, original `id`
  values are preserved, and quality-note counts match issue flags.

## Assumptions

- The cleaned CSV should retain all rows, not produce a deduplicated-only lead
  file yet.
- USPS abbreviations are preferred for CRM and frontend filtering.
- `data_source` should be audited and lightly trimmed, not aggressively
  normalized, because its code system is not defined.
- Lead data is sensitive; generated data files should not be committed or exposed
  by a future static frontend until explicitly approved.
