"""Reproducible cleanup for the 10124-users lead export."""

from __future__ import annotations

import argparse
import csv
import hashlib
import re
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Iterable


PHONE_FIELDS = ["desk_phone", "corporate_phone", "mobile_phone"]
POSTAL_FIELDS = ["postal_code", "executive_postal_code"]
METADATA_FIELDS = [
    "duplicate_group_id",
    "duplicate_status",
    "duplicate_of_id",
    "duplicate_reason",
    "row_quality_flags",
]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SCI_NOTATION_RE = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)[eE][+-]?\d+$")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

US_STATE_TO_ABBR = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "district of columbia": "DC",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new hampshire": "NH",
    "new jersey": "NJ",
    "new mexico": "NM",
    "new york": "NY",
    "north carolina": "NC",
    "north dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode island": "RI",
    "south carolina": "SC",
    "south dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
}
US_ABBRS = set(US_STATE_TO_ABBR.values())

COUNTRY_TO_ISO2 = {
    "argentina": "ar",
    "australia": "au",
    "austria": "at",
    "belgium": "be",
    "brazil": "br",
    "canada": "ca",
    "chile": "cl",
    "china": "cn",
    "colombia": "co",
    "denmark": "dk",
    "finland": "fi",
    "france": "fr",
    "germany": "de",
    "hong kong": "hk",
    "india": "in",
    "indonesia": "id",
    "ireland": "ie",
    "israel": "il",
    "italy": "it",
    "japan": "jp",
    "malaysia": "my",
    "mexico": "mx",
    "netherlands": "nl",
    "new zealand": "nz",
    "norway": "no",
    "philippines": "ph",
    "poland": "pl",
    "portugal": "pt",
    "singapore": "sg",
    "south africa": "za",
    "south korea": "kr",
    "spain": "es",
    "sweden": "se",
    "switzerland": "ch",
    "taiwan": "tw",
    "thailand": "th",
    "turkey": "tr",
    "united arab emirates": "ae",
    "united kingdom": "gb",
    "united states": "us",
    "united states of america": "us",
    "usa": "us",
}

COMPLETENESS_FIELDS = [
    "recordPath",
    "name",
    "company_name",
    "employees",
    "job_title",
    "seniority",
    "job_function",
    "job_function_2",
    "job_sector",
    "sources",
    "data_source",
    "street",
    "city",
    "state",
    "country",
    "postal_code",
    "executive_street",
    "executive_city",
    "executive_area",
    "executive_state",
    "executive_postal_code",
    "executive_country_code",
    "executive_linkedin_profile",
]


@dataclass(frozen=True)
class CleanedValue:
    value: str
    issue: str | None = None


def strip_cell(value) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_space(value) -> str:
    return " ".join(strip_cell(value).split())


def normalize_key(value) -> str:
    return normalize_space(value).casefold()


def is_valid_email(value: str) -> bool:
    value = strip_cell(value)
    return bool(value and EMAIL_RE.match(value))


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _significant_digits_from_scientific(value: str) -> int:
    mantissa = value.lower().split("e", 1)[0]
    digits = re.sub(r"\D", "", mantissa)
    digits = digits.lstrip("0")
    return len(digits)


def _decimal_to_integer_digits(value: str) -> str | None:
    try:
        number = Decimal(value)
    except InvalidOperation:
        return None
    if not number.is_finite() or number < 0:
        return None
    integral = number.to_integral_value()
    if number != integral:
        return None
    digits = format(integral, "f")
    if "." in digits:
        digits = digits.split(".", 1)[0]
    digits = digits.lstrip("+")
    return digits if digits.isdigit() else None


def _looks_padded_from_scientific(digits: str, significant_digits: int) -> bool:
    if significant_digits >= len(digits):
        return False
    inferred_places = len(digits) - significant_digits
    return inferred_places >= 3 and digits.endswith("0" * min(inferred_places, 6))


def clean_numeric_identifier(value, field_name):
    value = strip_cell(value)
    if not value:
        return CleanedValue("")

    if not SCI_NOTATION_RE.match(value):
        return CleanedValue(value)

    issue_prefix = f"{field_name}_scientific_notation"
    digits = _decimal_to_integer_digits(value)
    significant_digits = _significant_digits_from_scientific(value)

    if field_name in PHONE_FIELDS:
        plausible_length = digits is not None and 7 <= len(digits) <= 15
        enough_precision = significant_digits >= min(10, len(digits or ""))
        padded = bool(digits and _looks_padded_from_scientific(digits, significant_digits))
        if plausible_length and enough_precision and not padded:
            return CleanedValue(digits, f"{issue_prefix}_recovered")
        return CleanedValue("", f"{issue_prefix}_unrecoverable")

    return CleanedValue("", f"{issue_prefix}_unrecoverable")


def _is_us_context(country: str, country_code: str) -> bool:
    country_key = normalize_key(country)
    code = strip_cell(country_code).casefold()
    return country_key in {"united states", "united states of america", "usa"} or code == "us"


def normalize_state(value, country, country_code):
    value = strip_cell(value)
    if not value or not _is_us_context(country, country_code):
        return value
    upper = value.upper()
    if upper in US_ABBRS:
        return upper
    return US_STATE_TO_ABBR.get(normalize_key(value), value)


def build_company_canonical_map(values: Iterable[str]) -> dict[str, str]:
    grouped: dict[str, Counter[str]] = defaultdict(Counter)
    originals: list[str] = []
    for original in values:
        original_text = "" if original is None else str(original)
        originals.append(original_text)
        collapsed = normalize_space(original_text)
        if collapsed:
            grouped[normalize_key(collapsed)][collapsed] += 1

    canonical_by_key = {}
    for key, counts in grouped.items():
        def sort_key(item):
            spelling, count = item
            letters = [char for char in spelling if char.isalpha()]
            all_upper = bool(letters) and spelling.upper() == spelling
            all_lower = bool(letters) and spelling.lower() == spelling
            return (-count, all_upper, all_lower, spelling.casefold())

        canonical_by_key[key] = sorted(counts.items(), key=sort_key)[0][0]

    mapping = {}
    for original in originals:
        collapsed = normalize_space(original)
        mapping[original] = canonical_by_key.get(normalize_key(collapsed), collapsed)
    return mapping


def uuid1_time(value: str) -> int:
    try:
        parsed = uuid.UUID(strip_cell(value))
    except ValueError:
        return -1
    return parsed.time if parsed.version == 1 else -1


def completeness_score(row: dict[str, str]) -> int:
    score = 0
    if is_valid_email(row.get("email", "")):
        score += 2
    for field in PHONE_FIELDS:
        if strip_cell(row.get(field, "")):
            score += 1
    for field in COMPLETENESS_FIELDS:
        if strip_cell(row.get(field, "")):
            score += 1
    return score


def duplicate_key(row: dict[str, str]) -> tuple[str, str]:
    return normalize_key(row.get("name", "")), normalize_key(row.get("company_name", ""))


def annotate_duplicates(rows):
    annotated = [dict(row) for row in rows]
    groups: dict[tuple[str, str], list[int]] = defaultdict(list)
    for index, row in enumerate(annotated):
        key = duplicate_key(row)
        if all(key):
            groups[key].append(index)

    links = []
    duplicate_group_number = 0
    for key in sorted(groups):
        indexes = groups[key]
        if len(indexes) < 2:
            continue
        duplicate_group_number += 1
        group_id = f"dup-{duplicate_group_number:06d}"

        def rank(index):
            row = annotated[index]
            return (
                completeness_score(row),
                uuid1_time(row.get("id", "")),
                strip_cell(row.get("id", "")),
            )

        primary_index = max(indexes, key=rank)
        primary = annotated[primary_index]
        primary_score = completeness_score(primary)
        primary_time = uuid1_time(primary.get("id", ""))

        for index in indexes:
            row = annotated[index]
            row["duplicate_group_id"] = group_id
            row["duplicate_reason"] = "same normalized name + company_name"
            if index == primary_index:
                row["duplicate_status"] = "primary"
                row["duplicate_of_id"] = ""
            else:
                row["duplicate_status"] = "duplicate"
                row["duplicate_of_id"] = primary.get("id", "")
                links.append(
                    {
                        "duplicate_group_id": group_id,
                        "primary_id": primary.get("id", ""),
                        "duplicate_id": row.get("id", ""),
                        "primary_score": str(primary_score),
                        "duplicate_score": str(completeness_score(row)),
                        "primary_uuid_time": str(primary_time),
                        "duplicate_uuid_time": str(uuid1_time(row.get("id", ""))),
                        "reason": row["duplicate_reason"],
                    }
                )

    for row in annotated:
        row.setdefault("duplicate_group_id", "")
        row.setdefault("duplicate_status", "unique")
        row.setdefault("duplicate_of_id", "")
        row.setdefault("duplicate_reason", "")
        row.setdefault("row_quality_flags", "")
    return annotated, links


def _append_issue(issues, row, field, issue, original_value, cleaned_value, note=""):
    issues.append(
        {
            "id": row.get("id", ""),
            "field": field,
            "issue": issue,
            "original_value": original_value,
            "cleaned_value": cleaned_value,
            "note": note,
        }
    )


def _add_flag(flags: list[str], flag: str):
    if flag not in flags:
        flags.append(flag)


def _data_source_issue(value: str) -> str | None:
    if not value:
        return "blank_data_source"
    if value.isdigit():
        return "numeric_data_source"
    if len(value) > 120 or CONTROL_RE.search(value):
        return "nonstandard_data_source"
    return None


def _country_mismatch_issue(country: str, country_code: str) -> str | None:
    country = normalize_space(country)
    code = strip_cell(country_code).casefold()
    if not country or not code:
        return None
    expected = COUNTRY_TO_ISO2.get(normalize_key(country))
    if expected and expected != code:
        return f"country_expected_{expected}_but_executive_country_code_is_{code}"
    return None


def _write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _company_mapping_rows(original_values, company_map):
    counts = Counter(original_values)
    rows = []
    for original, count in sorted(counts.items(), key=lambda item: (normalize_key(item[0]), item[0])):
        canonical = company_map.get(original, normalize_space(original))
        if original != canonical:
            rows.append(
                {
                    "original_company_name": original,
                    "canonical_company_name": canonical,
                    "affected_row_count": str(count),
                }
            )
    return rows


def _write_quality_note(path: Path, summary: dict[str, int | str | bool]):
    lines = [
        "# Lead CSV Data Quality Note",
        "",
        f"Input rows: {summary['input_rows']}",
        f"Output rows: {summary['output_rows']}",
        f"Source hash unchanged: {summary['source_hash_unchanged']}",
        "",
        "## Summary",
        "",
        f"- Duplicate-person groups: {summary['duplicate_groups']}",
        f"- Duplicate rows flagged: {summary['duplicate_rows']}",
        f"- Phone numbers recovered from scientific notation: {summary['phone_scientific_recovered']}",
        f"- Phone numbers blanked as unrecoverable scientific notation: {summary['phone_scientific_blanked']}",
        f"- Postal values blanked as unrecoverable scientific notation: {summary['postal_scientific_blanked']}",
        f"- Company-name rows normalized: {summary['company_name_rows_normalized']}",
        f"- Distinct changed company-name values: {summary['company_name_values_normalized']}",
        f"- Invalid emails flagged: {summary['invalid_emails']}",
        f"- Rows missing both email and phone after cleanup: {summary['missing_email_and_phone_rows']}",
        f"- Country/code mismatches flagged: {summary['country_mismatches']}",
        f"- Blank or non-standard data_source values flagged: {summary['data_source_issues']}",
        f"- Total issue records: {summary['issue_records']}",
        "",
        "## Handling Decisions",
        "",
        "- All original rows were retained in the cleaned CSV.",
        "- Original id values were preserved for traceability.",
        "- Likely duplicate people were flagged with duplicate metadata instead of deleted.",
        "- Low-precision scientific-notation phone and postal values were blanked rather than guessed.",
        "- US state values were normalized to USPS abbreviations when the row was clearly US.",
        "- country and executive_country_code were audited but not overwritten.",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_cleanup(input_path, output_dir):
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    source_hash_before = hash_file(input_path)
    with input_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise ValueError(f"Input CSV has no header: {input_path}")
        fieldnames = list(reader.fieldnames)
        raw_rows = [dict(row) for row in reader]

    original_company_values = [row.get("company_name", "") or "" for row in raw_rows]
    company_map = build_company_canonical_map(original_company_values)
    company_mapping_rows = _company_mapping_rows(original_company_values, company_map)

    cleaned_rows = []
    issues = []
    counts = Counter()

    for raw in raw_rows:
        row = {field: strip_cell(raw.get(field, "")) for field in fieldnames}
        flags: list[str] = []

        original_company = raw.get("company_name", "") or ""
        canonical_company = company_map.get(original_company, normalize_space(original_company))
        if row.get("company_name", "") != canonical_company:
            counts["company_name_rows_normalized"] += 1
            _append_issue(
                issues,
                row,
                "company_name",
                "company_name_normalized",
                original_company,
                canonical_company,
            )
        row["company_name"] = canonical_company

        for field in ("state", "executive_state"):
            original = row.get(field, "")
            normalized = normalize_state(
                original,
                row.get("country", ""),
                row.get("executive_country_code", ""),
            )
            if normalized != original:
                _append_issue(issues, row, field, f"{field}_normalized", original, normalized)
            row[field] = normalized

        for field in PHONE_FIELDS + POSTAL_FIELDS:
            original = row.get(field, "")
            cleaned_value = clean_numeric_identifier(original, field)
            row[field] = cleaned_value.value
            if cleaned_value.issue:
                _add_flag(flags, cleaned_value.issue)
                _append_issue(
                    issues,
                    row,
                    field,
                    cleaned_value.issue,
                    original,
                    cleaned_value.value,
                )
                if field in PHONE_FIELDS and cleaned_value.issue.endswith("_recovered"):
                    counts["phone_scientific_recovered"] += 1
                elif field in PHONE_FIELDS and cleaned_value.issue.endswith("_unrecoverable"):
                    counts["phone_scientific_blanked"] += 1
                elif field in POSTAL_FIELDS and cleaned_value.issue.endswith("_unrecoverable"):
                    counts["postal_scientific_blanked"] += 1

        email = row.get("email", "")
        if email and not is_valid_email(email):
            counts["invalid_emails"] += 1
            _add_flag(flags, "invalid_email")
            _append_issue(issues, row, "email", "invalid_email", email, email)

        if not email and not any(row.get(field, "") for field in PHONE_FIELDS):
            counts["missing_email_and_phone_rows"] += 1
            _add_flag(flags, "missing_email_and_phone")
            _append_issue(
                issues,
                row,
                "contact",
                "missing_email_and_phone",
                "",
                "",
                "No email or phone remains after cleanup.",
            )

        data_source = row.get("data_source", "")
        data_source_issue = _data_source_issue(data_source)
        if data_source_issue:
            counts["data_source_issues"] += 1
            _add_flag(flags, data_source_issue)
            _append_issue(issues, row, "data_source", data_source_issue, data_source, data_source)

        mismatch = _country_mismatch_issue(
            row.get("country", ""), row.get("executive_country_code", "")
        )
        if mismatch:
            counts["country_mismatches"] += 1
            _add_flag(flags, "country_executive_country_code_mismatch")
            _append_issue(
                issues,
                row,
                "executive_country_code",
                "country_executive_country_code_mismatch",
                row.get("executive_country_code", ""),
                row.get("executive_country_code", ""),
                mismatch,
            )

        row["row_quality_flags"] = ";".join(flags)
        cleaned_rows.append(row)

    annotated_rows, duplicate_links = annotate_duplicates(cleaned_rows)
    duplicate_groups = len({link["duplicate_group_id"] for link in duplicate_links})

    source_hash_after = hash_file(input_path)
    output_base = input_path.stem
    cleaned_path = output_dir / f"{output_base}.cleaned.csv"
    duplicate_path = output_dir / f"{output_base}.duplicate-links.csv"
    company_map_path = output_dir / f"{output_base}.company-name-map.csv"
    issues_path = output_dir / f"{output_base}.cleaning-issues.csv"
    note_path = output_dir / f"{output_base}.data-quality-note.md"

    _write_csv(cleaned_path, fieldnames + METADATA_FIELDS, annotated_rows)
    _write_csv(
        duplicate_path,
        [
            "duplicate_group_id",
            "primary_id",
            "duplicate_id",
            "primary_score",
            "duplicate_score",
            "primary_uuid_time",
            "duplicate_uuid_time",
            "reason",
        ],
        duplicate_links,
    )
    _write_csv(
        company_map_path,
        ["original_company_name", "canonical_company_name", "affected_row_count"],
        company_mapping_rows,
    )
    _write_csv(
        issues_path,
        ["id", "field", "issue", "original_value", "cleaned_value", "note"],
        issues,
    )

    summary = {
        "input_rows": len(raw_rows),
        "output_rows": len(annotated_rows),
        "source_sha256_before": source_hash_before,
        "source_sha256_after": source_hash_after,
        "source_hash_unchanged": source_hash_before == source_hash_after,
        "duplicate_groups": duplicate_groups,
        "duplicate_rows": len(duplicate_links),
        "phone_scientific_recovered": counts["phone_scientific_recovered"],
        "phone_scientific_blanked": counts["phone_scientific_blanked"],
        "postal_scientific_blanked": counts["postal_scientific_blanked"],
        "company_name_rows_normalized": counts["company_name_rows_normalized"],
        "company_name_values_normalized": len(company_mapping_rows),
        "invalid_emails": counts["invalid_emails"],
        "missing_email_and_phone_rows": counts["missing_email_and_phone_rows"],
        "country_mismatches": counts["country_mismatches"],
        "data_source_issues": counts["data_source_issues"],
        "issue_records": len(issues),
        "cleaned_csv": str(cleaned_path),
        "duplicate_links_csv": str(duplicate_path),
        "company_name_map_csv": str(company_map_path),
        "cleaning_issues_csv": str(issues_path),
        "data_quality_note": str(note_path),
    }
    _write_quality_note(note_path, summary)
    return summary


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Source CSV to clean")
    parser.add_argument(
        "--output-dir", required=True, type=Path, help="Directory for generated outputs"
    )
    args = parser.parse_args(argv)
    summary = run_cleanup(args.input, args.output_dir)
    print(f"Cleaned rows: {summary['output_rows']} / {summary['input_rows']}")
    print(f"Duplicate-person groups: {summary['duplicate_groups']}")
    print(f"Cleaned CSV: {summary['cleaned_csv']}")
    print(f"Data-quality note: {summary['data_quality_note']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
