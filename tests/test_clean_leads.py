import csv
import sys
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools import clean_leads


FIELDNAMES = [
    "id",
    "recordPath",
    "name",
    "short_name",
    "desk_phone",
    "desk_phone_ext",
    "corporate_phone",
    "mobile_phone",
    "email",
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


def uuid1_with_time(timestamp):
    time_low = timestamp & 0xFFFFFFFF
    time_mid = (timestamp >> 32) & 0xFFFF
    time_hi_version = ((timestamp >> 48) & 0x0FFF) | 0x1000
    return str(
        uuid.UUID(
            fields=(time_low, time_mid, time_hi_version, 0x80, 0x00, 0x123456789ABC)
        )
    )


def row(**overrides):
    base = {name: "" for name in FIELDNAMES}
    base.update(
        {
            "id": uuid1_with_time(1),
            "name": "Jane Doe",
            "email": "jane@example.com",
            "company_name": "DZ Bank AG",
            "country": "United States",
            "executive_country_code": "us",
        }
    )
    base.update(overrides)
    return base


class CleanLeadsTests(unittest.TestCase):
    def test_scientific_notation_policy_blanks_lossy_values_and_expands_unambiguous_values(self):
        blanked = clean_leads.clean_numeric_identifier("9.18826E+11", "desk_phone")
        recovered = clean_leads.clean_numeric_identifier(
            "9.18826123456E+11", "desk_phone"
        )
        plain = clean_leads.clean_numeric_identifier("918826123456", "desk_phone")

        self.assertEqual(blanked.value, "")
        self.assertEqual(blanked.issue, "desk_phone_scientific_notation_unrecoverable")
        self.assertEqual(recovered.value, "918826123456")
        self.assertEqual(recovered.issue, "desk_phone_scientific_notation_recovered")
        self.assertEqual(plain.value, "918826123456")
        self.assertIsNone(plain.issue)

    def test_us_state_values_are_normalized_to_abbreviations_only_for_us_rows(self):
        self.assertEqual(
            clean_leads.normalize_state("California", "United States", ""), "CA"
        )
        self.assertEqual(clean_leads.normalize_state("ca", "United States", ""), "CA")
        self.assertEqual(clean_leads.normalize_state("California", "", "us"), "CA")
        self.assertEqual(
            clean_leads.normalize_state("California", "Canada", ""), "California"
        )

    def test_company_canonicalization_prefers_most_frequent_trimmed_spelling(self):
        mapping = clean_leads.build_company_canonical_map(
            ["DZ BANK AG", " DZ Bank AG ", "DZ Bank AG", "Dz Bank Ag"]
        )

        self.assertEqual(mapping["DZ BANK AG"], "DZ Bank AG")
        self.assertEqual(mapping[" DZ Bank AG "], "DZ Bank AG")
        self.assertEqual(mapping["Dz Bank Ag"], "DZ Bank AG")

    def test_duplicate_primary_uses_completeness_before_uuid_recency(self):
        older_more_complete = row(
            id=uuid1_with_time(10),
            name="Alex Smith",
            company_name="Acme Inc",
            email="alex@example.com",
            desk_phone="5551212",
            job_title="Chief Revenue Officer",
            street="1 Main St",
        )
        newer_less_complete = row(
            id=uuid1_with_time(20),
            name=" Alex Smith ",
            company_name="ACME INC",
            email="",
            desk_phone="",
        )

        annotated, links = clean_leads.annotate_duplicates(
            [older_more_complete, newer_less_complete]
        )

        self.assertEqual(annotated[0]["duplicate_status"], "primary")
        self.assertEqual(annotated[1]["duplicate_status"], "duplicate")
        self.assertEqual(annotated[1]["duplicate_of_id"], older_more_complete["id"])
        self.assertEqual(links[0]["primary_id"], older_more_complete["id"])
        self.assertEqual(links[0]["duplicate_id"], newer_less_complete["id"])

    def test_run_cleanup_writes_all_expected_outputs_and_preserves_rows(self):
        tmp_path = Path.cwd() / "tests" / ".tmp" / "run_cleanup_fixture"
        output_dir = tmp_path / "processed"
        tmp_path.mkdir(parents=True, exist_ok=True)
        output_dir.mkdir(exist_ok=True)
        for path in tmp_path.glob("sample-users.*"):
            path.unlink()
        for path in output_dir.glob("sample-users.*"):
            path.unlink()

        input_path = tmp_path / "sample-users.csv"
        rows = [
            row(
                id=uuid1_with_time(10),
                name=" Jane Doe ",
                company_name="DZ BANK AG",
                email="jane@example.com",
                desk_phone="9.18826123456E+11",
                state="California",
                city=" San Francisco ",
                data_source=" crm ",
            ),
            row(
                id=uuid1_with_time(20),
                name="Jane Doe",
                company_name=" DZ Bank AG ",
                email="bad-email",
                desk_phone="9.18826E+11",
                state="CA",
                data_source="",
            ),
            row(
                id=uuid1_with_time(30),
                name="Morgan Lee",
                company_name="Northwind",
                email="morgan@example.ca",
                state="Ontario",
                country="Canada",
                executive_country_code="ca",
            ),
        ]
        with input_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
            writer.writeheader()
            writer.writerows(rows)

        summary = clean_leads.run_cleanup(input_path, output_dir)

        cleaned_path = output_dir / "sample-users.cleaned.csv"
        duplicate_path = output_dir / "sample-users.duplicate-links.csv"
        company_map_path = output_dir / "sample-users.company-name-map.csv"
        issues_path = output_dir / "sample-users.cleaning-issues.csv"
        note_path = output_dir / "sample-users.data-quality-note.md"

        for path in [
            cleaned_path,
            duplicate_path,
            company_map_path,
            issues_path,
            note_path,
        ]:
            self.assertTrue(path.exists(), f"missing {path.name}")

        with cleaned_path.open(newline="", encoding="utf-8") as handle:
            cleaned_rows = list(csv.DictReader(handle))

        self.assertEqual(len(cleaned_rows), 3)
        self.assertEqual([r["id"] for r in cleaned_rows], [r["id"] for r in rows])
        self.assertEqual(cleaned_rows[0]["desk_phone"], "918826123456")
        self.assertEqual(cleaned_rows[1]["desk_phone"], "")
        self.assertEqual(cleaned_rows[0]["company_name"], "DZ Bank AG")
        self.assertEqual(cleaned_rows[0]["state"], "CA")
        self.assertEqual(cleaned_rows[2]["state"], "Ontario")
        self.assertEqual(cleaned_rows[1]["duplicate_status"], "duplicate")
        self.assertIn("invalid_email", cleaned_rows[1]["row_quality_flags"])
        self.assertEqual(summary["input_rows"], 3)
        self.assertEqual(summary["output_rows"], 3)
        self.assertIn("Duplicate-person groups", note_path.read_text("utf-8"))


if __name__ == "__main__":
    unittest.main()
