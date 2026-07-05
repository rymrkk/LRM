import { parse } from 'papaparse'
import { EMPTY_FILTERS, FILTER_KEYS, PHONE_PRIORITY, REQUIRED_CONTACT_HEADERS } from '../constants'
import type { CompanySummary, ContactRecord } from '../../types/contact'
import type { ContactFilters, FilterKey } from '../../types/workspace'

export type HeaderValidationResult = {
  ok: boolean
  missingHeaders: string[]
  normalizedHeaders: string[]
}

export type ContactsCsvParseResult = {
  contacts: ContactRecord[]
  headers: string[]
  rowCount: number
}

export type ContactFilterCriteria = {
  filters?: Partial<Record<FilterKey, readonly unknown[]>>
  searchQuery?: string
}

export type ContactsWorkspace = {
  contacts: ContactRecord[]
  companies: CompanySummary[]
  filterOptions: ContactFilters
  filteredCount: number
  totalCount: number
}

export type ContactsJsonLoadResult = {
  contacts: ContactRecord[]
  source: 'static-json' | 'fallback'
}

export type ContactsJsonFetcher = (url: string) => Promise<Pick<Response, 'ok' | 'json' | 'status'>>

const CONTACT_FIELD_KEYS = [
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
] as const satisfies readonly (keyof ContactRecord)[]

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function normalizeSearchText(value: unknown): string {
  return normalizeCell(value).toLocaleLowerCase()
}

function sortText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

function createEmptyFilters(): ContactFilters {
  return {
    seniority: [],
    job_function: [],
    job_sector: [],
    country: [],
    state: [],
    employee_range: [],
  }
}

function uniqueNonBlank(values: readonly unknown[], sorted = false): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  values.forEach((value) => {
    const normalizedValue = normalizeCell(value)
    const lookupValue = normalizedValue.toLocaleLowerCase()

    if (!normalizedValue || seen.has(lookupValue)) {
      return
    }

    seen.add(lookupValue)
    unique.push(normalizedValue)
  })

  return sorted ? unique.sort(sortText) : unique
}

function normalizeFilters(filters?: Partial<Record<FilterKey, readonly unknown[]>>): ContactFilters {
  const normalizedFilters = createEmptyFilters()

  FILTER_KEYS.forEach((key) => {
    normalizedFilters[key] = uniqueNonBlank(filters?.[key] ?? [])
  })

  return normalizedFilters
}

function contactMatchesSearch(contact: ContactRecord, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return true
  }

  return [contact.name, contact.email, contact.company_name].some((value) =>
    normalizeSearchText(value).includes(normalizedQuery),
  )
}

function contactMatchesFilters(contact: ContactRecord, filters: ContactFilters): boolean {
  return FILTER_KEYS.every((key) => {
    const selectedValues = filters[key]

    if (selectedValues.length === 0) {
      return true
    }

    const contactValue = normalizeSearchText(contact[key])
    return selectedValues.some((value) => normalizeSearchText(value) === contactValue)
  })
}

export function validateRequiredHeaders(headers: readonly string[]): HeaderValidationResult {
  const normalizedHeaders = headers.map((header) => normalizeCell(header))
  const headerSet = new Set(normalizedHeaders)
  const missingHeaders = REQUIRED_CONTACT_HEADERS.filter((header) => !headerSet.has(header))

  return {
    ok: missingHeaders.length === 0,
    missingHeaders,
    normalizedHeaders,
  }
}

export function countCsvDataRows(csv: string): number {
  const parsed = parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeCell,
  })

  return parsed.data.length
}

export function parseContactsCsv(csv: string): ContactsCsvParseResult {
  const parsed = parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeCell,
  })
  const headers = parsed.meta.fields ?? []

  if (parsed.errors.length > 0) {
    throw new Error(`Invalid CSV: ${parsed.errors.map((error) => error.message).join('; ')}`)
  }

  const validation = validateRequiredHeaders(headers)

  if (!validation.ok) {
    throw new Error(`Missing required CSV headers: ${validation.missingHeaders.join(', ')}`)
  }

  const contacts = parsed.data.map((row) => normalizeContactRow(row))

  return {
    contacts,
    headers,
    rowCount: contacts.length,
  }
}

export function normalizeContactRow(row: Record<string, unknown>): ContactRecord {
  const contact = {} as Partial<Record<keyof ContactRecord, string>>

  CONTACT_FIELD_KEYS.forEach((key) => {
    contact[key] = normalizeCell(row[key])
  })

  return contact as ContactRecord
}

export function deriveBestPhone(contact: ContactRecord): string {
  for (const phoneKey of PHONE_PRIORITY) {
    const phone = normalizeCell(contact[phoneKey])

    if (phone) {
      return phone
    }
  }

  return ''
}

export function filterContacts(
  contacts: readonly ContactRecord[],
  criteria: ContactFilterCriteria = {},
): ContactRecord[] {
  const filters = normalizeFilters(criteria.filters)

  return contacts.filter(
    (contact) => contactMatchesSearch(contact, criteria.searchQuery ?? '') && contactMatchesFilters(contact, filters),
  )
}

export function extractFilterOptions(contacts: readonly ContactRecord[]): ContactFilters {
  const options = createEmptyFilters()

  FILTER_KEYS.forEach((key) => {
    options[key] = uniqueNonBlank(
      contacts.map((contact) => contact[key]),
      true,
    )
  })

  return options
}

export function groupContactsByCompany(contacts: readonly ContactRecord[]): CompanySummary[] {
  const groupedContacts = new Map<string, ContactRecord[]>()

  contacts.forEach((contact) => {
    const companyName = normalizeCell(contact.company_name)
    const companyContacts = groupedContacts.get(companyName) ?? []
    companyContacts.push(contact)
    groupedContacts.set(companyName, companyContacts)
  })

  return Array.from(groupedContacts.entries())
    .map(([companyName, companyContacts]) => ({
      company_name: companyName,
      contact_count: companyContacts.length,
      countries: uniqueNonBlank(
        companyContacts.map((contact) => contact.country),
        true,
      ),
      employee_range: companyContacts.map((contact) => normalizeCell(contact.employee_range)).find(Boolean) ?? '',
      contacts: companyContacts,
    }))
    .sort((a, b) => sortText(a.company_name, b.company_name))
}

export function buildContactsWorkspace(
  contacts: readonly ContactRecord[],
  criteria: ContactFilterCriteria = {},
): ContactsWorkspace {
  const filteredContacts = filterContacts(contacts, criteria)

  return {
    contacts: filteredContacts,
    companies: groupContactsByCompany(filteredContacts),
    filterOptions: extractFilterOptions(contacts),
    filteredCount: filteredContacts.length,
    totalCount: contacts.length,
  }
}

export async function loadContactsJson(
  fetcher: ContactsJsonFetcher,
  url = '/data/contacts.json',
  fallbackContacts: readonly ContactRecord[] = [],
): Promise<ContactsJsonLoadResult> {
  try {
    const response = await fetcher(url)

    if (!response.ok) {
      return { contacts: [...fallbackContacts], source: 'fallback' }
    }

    const rows = await response.json()

    if (!Array.isArray(rows)) {
      return { contacts: [...fallbackContacts], source: 'fallback' }
    }

    return {
      contacts: rows.map((row) => normalizeContactRow(row as Record<string, unknown>)),
      source: 'static-json',
    }
  } catch {
    return { contacts: [...fallbackContacts], source: 'fallback' }
  }
}
export function serializeSavedListFilters(filters: Partial<Record<FilterKey, readonly unknown[]>>): string {
  return JSON.stringify(normalizeFilters(filters))
}

export function deserializeSavedListFilters(serialized: string | Partial<ContactFilters> | null | undefined): ContactFilters {
  if (!serialized) {
    return { ...EMPTY_FILTERS }
  }

  if (typeof serialized !== 'string') {
    return normalizeFilters(serialized)
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<Record<FilterKey, readonly unknown[]>>
    return normalizeFilters(parsed)
  } catch {
    return { ...EMPTY_FILTERS }
  }
}