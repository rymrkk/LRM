import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '..')

const inputPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(repoRoot, 'data', 'processed', '10124-users.cleaned.csv')
const outputPath = process.argv[3]
  ? path.resolve(process.cwd(), process.argv[3])
  : path.join(appRoot, 'public', 'data', 'contacts.json')

const contactFields = [
  'id',
  'name',
  'short_name',
  'job_title',
  'seniority',
  'job_function',
  'job_function_2',
  'job_sector',
  'email',
  'desk_phone',
  'desk_phone_ext',
  'corporate_phone',
  'mobile_phone',
  'executive_linkedin_profile',
  'company_name',
  'employees',
  'employee_range',
  'street',
  'city',
  'state',
  'country',
  'postal_code',
  'executive_street',
  'executive_city',
  'executive_area',
  'executive_state',
  'executive_postal_code',
  'executive_country_code',
  'recordPath',
  'sources',
  'data_source',
]

function normalizeCell(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeRow(row) {
  return Object.fromEntries(contactFields.map((field) => [field, normalizeCell(row[field])]))
}

const csv = await readFile(inputPath, 'utf8')
const parsed = Papa.parse(csv, {
  header: true,
  skipEmptyLines: 'greedy',
  transformHeader: normalizeCell,
})

if (parsed.errors.length > 0) {
  const message = parsed.errors.map((error) => error.message).join('; ')
  throw new Error(`Unable to parse contacts CSV: ${message}`)
}

const contacts = parsed.data.map(normalizeRow)
await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(contacts)}\n`, 'utf8')

console.log(`Exported ${contacts.length.toLocaleString()} contacts to ${outputPath}`)