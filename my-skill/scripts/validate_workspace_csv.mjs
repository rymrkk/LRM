#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";

const REQUIRED_HEADERS = [
  "id",
  "name",
  "job_title",
  "seniority",
  "job_function",
  "job_sector",
  "email",
  "company_name",
  "employee_range",
  "city",
  "state",
  "country",
];

const EXPECTED_HEADERS = [
  "id",
  "name",
  "job_title",
  "seniority",
  "job_function",
  "job_function_2",
  "job_sector",
  "email",
  "desk_phone",
  "corporate_phone",
  "mobile_phone",
  "executive_linkedin_profile",
  "company_name",
  "employees",
  "employee_range",
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
  "recordPath",
  "sources",
  "data_source",
];

function usage() {
  console.log("Usage: node my-skill/scripts/validate_workspace_csv.mjs <csv-file> [--strict] [--expect-rows=N]");
}

function parseArgs(argv) {
  const options = {
    csvPath: null,
    strict: false,
    expectRows: null,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--strict") {
      options.strict = true;
      continue;
    }
    if (arg.startsWith("--expect-rows=")) {
      const value = Number(arg.slice("--expect-rows=".length));
      if (!Number.isInteger(value) || value < 0) {
        throw new Error("--expect-rows must be a non-negative integer.");
      }
      options.expectRows = value;
      continue;
    }
    if (!options.csvPath) {
      options.csvPath = arg;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  if (!options.csvPath) {
    throw new Error("CSV file path is required.");
  }

  return options;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (inQuotes) {
    throw new Error("CSV has an unterminated quoted field.");
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(header) {
  return header.trim().replace(/^\uFEFF/, "");
}

function hasValues(row) {
  return row.some((cell) => cell.trim() !== "");
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

function validateRows(rows, options) {
  const errors = [];
  const warnings = [];

  const nonEmptyRows = rows.filter(hasValues);
  if (nonEmptyRows.length === 0) {
    errors.push("CSV does not contain a header row.");
    return { errors, warnings, rowCount: 0, headers: [] };
  }

  const headers = nonEmptyRows[0].map(normalizeHeader);
  const headerSet = new Set(headers);
  const duplicates = findDuplicates(headers);
  const dataRows = nonEmptyRows.slice(1);
  const rowCount = dataRows.length;

  if (headers.some((header) => header === "")) {
    errors.push("CSV header contains an empty column name.");
  }

  if (duplicates.length > 0) {
    errors.push(`CSV header contains duplicate columns: ${duplicates.join(", ")}`);
  }

  const missingRequired = REQUIRED_HEADERS.filter((header) => !headerSet.has(header));
  if (missingRequired.length > 0) {
    errors.push(`Missing required CRM headers: ${missingRequired.join(", ")}`);
  }

  const missingExpected = EXPECTED_HEADERS.filter((header) => !headerSet.has(header));
  if (missingExpected.length > 0) {
    const message = `Missing expected CRM headers: ${missingExpected.join(", ")}`;
    if (options.strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  const extraHeaders = headers.filter((header) => !EXPECTED_HEADERS.includes(header));
  if (extraHeaders.length > 0) {
    warnings.push(`CSV has extra headers that the app should preserve or ignore intentionally: ${extraHeaders.join(", ")}`);
  }

  if (options.expectRows !== null && rowCount !== options.expectRows) {
    errors.push(`Expected ${options.expectRows} data rows but found ${rowCount}.`);
  }

  return { errors, warnings, rowCount, headers };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(2);
  }

  if (!existsSync(options.csvPath)) {
    console.error(`CSV file not found: ${options.csvPath}`);
    process.exit(1);
  }

  if (statSync(options.csvPath).size === 0) {
    console.error(`CSV file is empty: ${options.csvPath}`);
    process.exit(1);
  }

  let rows;
  try {
    rows = parseCsv(readFileSync(options.csvPath, "utf8"));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }

  const { errors, warnings, rowCount, headers } = validateRows(rows, options);

  for (const warning of warnings) {
    console.warn(`WARN: ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log(`OK: ${options.csvPath} has ${headers.length} headers and ${rowCount} data rows.`);
}

main();
