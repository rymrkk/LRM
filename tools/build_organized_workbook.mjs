import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_INPUTS = {
  cleanedCsv: path.join(ROOT, "data", "processed", "10124-users.cleaned.csv"),
  duplicateLinksCsv: path.join(
    ROOT,
    "data",
    "processed",
    "10124-users.duplicate-links.csv",
  ),
  issuesCsv: path.join(ROOT, "data", "processed", "10124-users.cleaning-issues.csv"),
  qualityNote: path.join(ROOT, "data", "processed", "10124-users.data-quality-note.md"),
  outputXlsx: path.join(ROOT, "data", "processed", "10124-users.organized.xlsx"),
  previewDir: path.join(ROOT, "data", "processed", "workbook-previews"),
};

export const CONTACT_COLUMNS = [
  "name",
  "short_name",
  "job_title",
  "seniority",
  "job_function",
  "job_function_2",
  "job_sector",
  "email",
  "desk_phone",
  "desk_phone_ext",
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
  "executive_country_code",
  "id",
  "recordPath",
  "sources",
  "data_source",
  "duplicate_group_id",
  "duplicate_status",
  "duplicate_of_id",
  "duplicate_reason",
  "row_quality_flags",
];

const DUPLICATE_COLUMNS = [
  "duplicate_group_id",
  "duplicate_status",
  "duplicate_of_id",
  "id",
  "name",
  "company_name",
  "email",
  "job_title",
  "city",
  "primary_score",
  "duplicate_score",
  "primary_uuid_time",
  "duplicate_uuid_time",
  "reason",
];

const ISSUE_COLUMNS = ["id", "field", "issue", "original_value", "cleaned_value", "note"];

const US_STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const TEXT_COLUMNS = new Set([
  "id",
  "recordPath",
  "desk_phone",
  "desk_phone_ext",
  "corporate_phone",
  "mobile_phone",
  "postal_code",
  "executive_postal_code",
  "original_value",
  "cleaned_value",
]);

function isUsCountry(country) {
  const value = String(country ?? "").trim().toLowerCase();
  return value === "united states" || value === "united states of america" || value === "usa";
}

export function employeeRange(rawValue) {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";
  const parsed = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return "";
  if (parsed <= 10) return "1-10";
  if (parsed <= 50) return "11-50";
  if (parsed <= 200) return "51-200";
  if (parsed <= 500) return "201-500";
  if (parsed <= 1000) return "501-1,000";
  if (parsed <= 5000) return "1,001-5,000";
  if (parsed <= 10000) return "5,001-10,000";
  if (parsed <= 50000) return "10,001-50,000";
  if (parsed <= 100000) return "50,001-100,000";
  return "100,001+";
}

export function stateDisplayName(state, country) {
  const value = String(state ?? "").trim();
  if (!value || !isUsCountry(country)) return value;
  return US_STATE_NAMES[value.toUpperCase()] ?? value;
}

function cellValue(value) {
  const text = String(value ?? "");
  return text === "" ? null : text;
}

export function buildContactsRow(row) {
  const expanded = {
    ...row,
    employee_range: employeeRange(row.employees),
    state: stateDisplayName(row.state, row.country),
    executive_state: stateDisplayName(row.executive_state, row.country),
  };
  return CONTACT_COLUMNS.map((column) => cellValue(expanded[column]));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function readCsvObjects(filePath) {
  const text = await fs.readFile(filePath, "utf8");
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift() ?? [];
  return rows.map((values) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = values[index] ?? "";
    });
    return object;
  });
}

function duplicateLinkIndexes(duplicateLinks) {
  const byDuplicateId = new Map();
  const byPrimaryGroup = new Map();
  for (const link of duplicateLinks) {
    byDuplicateId.set(link.duplicate_id, link);
    if (!byPrimaryGroup.has(link.duplicate_group_id)) {
      byPrimaryGroup.set(link.duplicate_group_id, link);
    }
  }
  return { byDuplicateId, byPrimaryGroup };
}

export function buildDuplicateReviewRows(cleanedRows, duplicateLinks) {
  const { byDuplicateId, byPrimaryGroup } = duplicateLinkIndexes(duplicateLinks);
  const duplicateRows = cleanedRows
    .filter((row) => row.duplicate_group_id)
    .sort((left, right) => {
      const groupCompare = left.duplicate_group_id.localeCompare(right.duplicate_group_id);
      if (groupCompare !== 0) return groupCompare;
      const leftRank = left.duplicate_status === "primary" ? 0 : 1;
      const rightRank = right.duplicate_status === "primary" ? 0 : 1;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return String(left.id ?? "").localeCompare(String(right.id ?? ""));
    });

  return duplicateRows.map((row) => {
    const duplicateLink = byDuplicateId.get(row.id);
    const primaryLink = byPrimaryGroup.get(row.duplicate_group_id);
    const link = duplicateLink ?? primaryLink ?? {};
    return {
      duplicate_group_id: row.duplicate_group_id ?? "",
      duplicate_status: row.duplicate_status ?? "",
      duplicate_of_id: row.duplicate_of_id ?? "",
      id: row.id ?? "",
      name: row.name ?? "",
      company_name: row.company_name ?? "",
      email: row.email ?? "",
      job_title: row.job_title ?? "",
      city: row.city ?? "",
      primary_score: link.primary_score ?? "",
      duplicate_score: duplicateLink?.duplicate_score ?? "",
      primary_uuid_time: link.primary_uuid_time ?? "",
      duplicate_uuid_time: duplicateLink?.duplicate_uuid_time ?? "",
      reason: row.duplicate_reason || link.reason || "",
    };
  });
}

function parseQualityNote(noteText) {
  const values = {};
  const patterns = {
    inputRows: /Input rows:\s*([0-9,]+)/,
    outputRows: /Output rows:\s*([0-9,]+)/,
    sourceHashUnchanged: /Source hash unchanged:\s*(\w+)/,
    duplicateGroups: /Duplicate-person groups:\s*([0-9,]+)/,
    duplicateRows: /Duplicate rows flagged:\s*([0-9,]+)/,
    phoneBlanked: /Phone numbers blanked as unrecoverable scientific notation:\s*([0-9,]+)/,
    postalBlanked: /Postal values blanked as unrecoverable scientific notation:\s*([0-9,]+)/,
    companyRowsNormalized: /Company-name rows normalized:\s*([0-9,]+)/,
    issueRecords: /Total issue records:\s*([0-9,]+)/,
  };
  for (const [key, pattern] of Object.entries(patterns)) {
    values[key] = noteText.match(pattern)?.[1] ?? "";
  }
  return values;
}

function qualityRows(noteText, generatedAt) {
  const parsed = parseQualityNote(noteText);
  return [
    ["Metric", "Value"],
    ["Rows in", parsed.inputRows],
    ["Rows out", parsed.outputRows],
    ["Source hash unchanged", parsed.sourceHashUnchanged],
    ["Original id order preserved", "True"],
    ["Duplicate-person groups", parsed.duplicateGroups],
    ["Duplicate rows flagged", parsed.duplicateRows],
    ["Phone values blanked", parsed.phoneBlanked],
    ["Postal values blanked", parsed.postalBlanked],
    ["Company-name rows normalized", parsed.companyRowsNormalized],
    ["Issue records", parsed.issueRecords],
    ["Generated workbook timestamp", generatedAt],
    ["Cleaned source", "data/processed/10124-users.cleaned.csv"],
    ["Duplicate source", "data/processed/10124-users.duplicate-links.csv"],
    ["Audit source", "data/processed/10124-users.cleaning-issues.csv"],
    ["Quality-note source", "data/processed/10124-users.data-quality-note.md"],
  ];
}

function colName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function tableRange(rowCount, columnCount) {
  return `A1:${colName(columnCount - 1)}${rowCount}`;
}

function chunkedWrite(sheet, rows, columnCount, chunkSize = 2000) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    sheet.getRangeByIndexes(start, 0, chunk.length, columnCount).values = chunk;
  }
}

function setColumnWidths(sheet, columns) {
  columns.forEach((column, index) => {
    const width =
      {
        id: 34,
        recordPath: 44,
        name: 24,
        short_name: 18,
        email: 32,
        company_name: 28,
        job_title: 34,
        street: 34,
        city: 20,
        state: 18,
        country: 20,
        executive_linkedin_profile: 40,
        row_quality_flags: 40,
        duplicate_reason: 36,
        reason: 36,
        note: 44,
        original_value: 28,
        cleaned_value: 28,
      }[column] ?? 18;
    sheet.getRangeByIndexes(0, index, 1, 1).format.columnWidth = width;
  });
}

function applyTableStyle(sheet, tableName, rowCount, columns, textColumns = TEXT_COLUMNS) {
  const columnCount = columns.length;
  const used = sheet.getRange(tableRange(rowCount, columnCount));
  used.format.font = { name: "Arial", size: 10 };
  used.format.borders = { preset: "outside", style: "thin", color: "#D9DEE8" };

  const header = sheet.getRangeByIndexes(0, 0, 1, columnCount);
  header.format = {
    fill: "#17324D",
    font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 },
  };
  header.format.rowHeight = 24;

  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  setColumnWidths(sheet, columns);
  const table = sheet.tables.add(tableRange(rowCount, columnCount), true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;

  columns.forEach((column, index) => {
    if (textColumns.has(column)) {
      sheet.getRangeByIndexes(1, index, Math.max(rowCount - 1, 1), 1).format.numberFormat = "@";
    }
  });
}

function addWorksheetWithTable(workbook, sheetName, tableName, columns, dataRows) {
  const sheet = workbook.worksheets.add(sheetName);
  const values = [columns, ...dataRows];
  chunkedWrite(sheet, values, columns.length);
  applyTableStyle(sheet, tableName, values.length, columns);
  return sheet;
}

function addQualitySheet(workbook, noteText, generatedAt) {
  const sheet = workbook.worksheets.add("Data Quality Notes");
  const rows = qualityRows(noteText, generatedAt);
  chunkedWrite(sheet, rows, 2);
  sheet.getRange("A1:B1").format = {
    fill: "#17324D",
    font: { name: "Arial", bold: true, color: "#FFFFFF", size: 10 },
  };
  sheet.getRange(`A1:B${rows.length}`).format.font = { name: "Arial", size: 10 };
  sheet.getRange(`A1:B${rows.length}`).format.borders = {
    preset: "outside",
    style: "thin",
    color: "#D9DEE8",
  };
  sheet.getRange("A:A").format.columnWidth = 34;
  sheet.getRange("B:B").format.columnWidth = 56;
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
  sheet.tables.add(`A1:B${rows.length}`, true, "DataQualityNotesTable");
  return sheet;
}

export async function buildWorkbook(options = {}) {
  const inputs = { ...DEFAULT_INPUTS, ...options };
  const { SpreadsheetFile, Workbook } = await import("@oai/artifact-tool");
  const [cleanedRows, duplicateLinks, issueRows, noteText] = await Promise.all([
    readCsvObjects(inputs.cleanedCsv),
    readCsvObjects(inputs.duplicateLinksCsv),
    readCsvObjects(inputs.issuesCsv),
    fs.readFile(inputs.qualityNote, "utf8"),
  ]);

  const workbook = Workbook.create();
  const generatedAt = new Date().toISOString();
  addWorksheetWithTable(
    workbook,
    "Contacts",
    "ContactsTable",
    CONTACT_COLUMNS,
    cleanedRows.map(buildContactsRow),
  );
  addQualitySheet(workbook, noteText, generatedAt);

  const duplicateReview = buildDuplicateReviewRows(cleanedRows, duplicateLinks);
  addWorksheetWithTable(
    workbook,
    "Possible Duplicate People",
    "PossibleDuplicatePeopleTable",
    DUPLICATE_COLUMNS,
    duplicateReview.map((row) => DUPLICATE_COLUMNS.map((column) => cellValue(row[column]))),
  );
  addWorksheetWithTable(
    workbook,
    "Audit Log",
    "AuditLogTable",
    ISSUE_COLUMNS,
    issueRows.map((row) => ISSUE_COLUMNS.map((column) => cellValue(row[column]))),
  );

  await fs.mkdir(path.dirname(inputs.outputXlsx), { recursive: true });
  await fs.mkdir(inputs.previewDir, { recursive: true });

  for (const sheetName of [
    "Contacts",
    "Data Quality Notes",
    "Possible Duplicate People",
    "Audit Log",
  ]) {
    const preview = await workbook.render({
      sheetName,
      range: sheetName === "Contacts" ? "A1:L25" : "A1:N25",
      scale: 1,
      format: "png",
    });
    await fs.writeFile(
      path.join(inputs.previewDir, `${sheetName.replaceAll(" ", "-").toLowerCase()}.png`),
      new Uint8Array(await preview.arrayBuffer()),
    );
  }

  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(inputs.outputXlsx);

  return {
    outputXlsx: inputs.outputXlsx,
    counts: {
      contacts: cleanedRows.length,
      duplicateReview: duplicateReview.length,
      duplicateGroups: new Set(duplicateReview.map((row) => row.duplicate_group_id)).size,
      duplicateRows: duplicateReview.filter((row) => row.duplicate_status === "duplicate").length,
      auditLog: issueRows.length,
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await buildWorkbook();
  console.log(JSON.stringify(result, null, 2));
}
