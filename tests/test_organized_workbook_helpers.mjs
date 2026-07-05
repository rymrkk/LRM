import assert from "node:assert/strict";

import {
  buildContactsRow,
  buildDuplicateReviewRows,
  CONTACT_COLUMNS,
  employeeRange,
  stateDisplayName,
} from "../tools/build_organized_workbook.mjs";

const cleanedRows = [
  {
    id: "primary-id",
    recordPath: "/primary",
    name: "Alex Smith",
    short_name: "Alex",
    desk_phone: "5551212",
    desk_phone_ext: "",
    corporate_phone: "",
    mobile_phone: "",
    email: "alex@example.com",
    company_name: "Acme Inc",
    employees: "4999",
    job_title: "CRO",
    seniority: "Executive",
    job_function: "Sales",
    job_function_2: "",
    job_sector: "Software",
    sources: "CRM",
    data_source: "GOLD",
    street: "1 Main",
    city: "San Francisco",
    state: "CA",
    country: "United States",
    postal_code: "94105",
    executive_street: "",
    executive_city: "",
    executive_area: "",
    executive_state: "NY",
    executive_postal_code: "10001",
    executive_country_code: "us",
    executive_linkedin_profile: "https://example.com/alex",
    duplicate_group_id: "dup-000001",
    duplicate_status: "primary",
    duplicate_of_id: "",
    duplicate_reason: "same normalized name + company_name",
    row_quality_flags: "",
  },
  {
    id: "duplicate-id",
    name: "Alex Smith",
    company_name: "Acme Inc",
    email: "alex.alt@example.com",
    job_title: "Revenue",
    city: "San Francisco",
    employees: "5001",
    state: "TX",
    country: "United States",
    duplicate_group_id: "dup-000001",
    duplicate_status: "duplicate",
    duplicate_of_id: "primary-id",
  },
  {
    id: "unique-id",
    name: "Morgan Lee",
    company_name: "Northwind",
    email: "morgan@example.com",
    employees: "",
    state: "Ontario",
    country: "Canada",
    duplicate_status: "unique",
  },
];

const duplicateLinks = [
  {
    duplicate_group_id: "dup-000001",
    primary_id: "primary-id",
    duplicate_id: "duplicate-id",
    primary_score: "18",
    duplicate_score: "12",
    primary_uuid_time: "20",
    duplicate_uuid_time: "10",
    reason: "same normalized name + company_name",
  },
];

assert.equal(employeeRange(""), "");
assert.equal(employeeRange("10"), "1-10");
assert.equal(employeeRange("11"), "11-50");
assert.equal(employeeRange("999"), "501-1,000");
assert.equal(employeeRange("4999"), "1,001-5,000");
assert.equal(employeeRange("50000"), "10,001-50,000");
assert.equal(employeeRange("100001"), "100,001+");

assert.equal(stateDisplayName("CA", "United States"), "California");
assert.equal(stateDisplayName("ny", "United States"), "New York");
assert.equal(stateDisplayName("Ontario", "Canada"), "Ontario");

assert.deepEqual(
  CONTACT_COLUMNS.slice(0, 8),
  [
    "name",
    "short_name",
    "job_title",
    "seniority",
    "job_function",
    "job_function_2",
    "job_sector",
    "email",
  ],
);
assert.equal(
  CONTACT_COLUMNS[CONTACT_COLUMNS.indexOf("employees") + 1],
  "employee_range",
);

const contactRow = buildContactsRow(cleanedRows[0]);
assert.equal(contactRow[CONTACT_COLUMNS.indexOf("employees")], "4999");
assert.equal(contactRow[CONTACT_COLUMNS.indexOf("employee_range")], "1,001-5,000");
assert.equal(contactRow[CONTACT_COLUMNS.indexOf("state")], "California");
assert.equal(contactRow[CONTACT_COLUMNS.indexOf("executive_state")], "New York");
assert.equal(contactRow[CONTACT_COLUMNS.indexOf("postal_code")], "94105");

const duplicateRows = buildDuplicateReviewRows(cleanedRows, duplicateLinks);
assert.equal(duplicateRows.length, 2);
assert.equal(duplicateRows[0].duplicate_status, "primary");
assert.equal(duplicateRows[1].duplicate_status, "duplicate");
assert.equal(duplicateRows[1].primary_score, "18");
assert.equal(duplicateRows[1].duplicate_score, "12");
assert.equal(duplicateRows[1].reason, "same normalized name + company_name");

console.log("organized workbook helper tests passed");
