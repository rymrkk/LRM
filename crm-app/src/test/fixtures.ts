import type { CompanySummary, ContactNote, ContactRecord } from '../types/contact'
import type { ColumnPreferences, ContactFilters, SavedList, Workspace } from '../types/workspace'
import { DEFAULT_VISIBLE_COLUMNS } from '../lib/constants'

export const testWorkspace = {
  id: 'workspace_test_001',
  user_id: 'user_test_001',
  name: 'Synthetic Leads',
  storage_path: 'user_test_001/workspace_test_001/1.csv',
  original_filename: 'synthetic-leads.csv',
  row_count: 2,
  created_at: '2026-07-06T00:00:00.000Z',
  updated_at: '2026-07-06T00:00:00.000Z',
} satisfies Workspace

export const testContact = {
  id: 'contact_test_001',
  name: 'Avery Johnson',
  short_name: 'Avery',
  job_title: 'VP Sales',
  seniority: 'Executive',
  job_function: 'Sales',
  job_function_2: 'Revenue',
  job_sector: 'Software',
  email: 'avery.johnson@example.com',
  desk_phone: '+1 555 0101',
  corporate_phone: '+1 555 0199',
  mobile_phone: '+1 555 0111',
  executive_linkedin_profile: 'https://www.linkedin.com/in/example-avery-johnson',
  company_name: 'Example Systems',
  employees: '250',
  employee_range: '201-500',
  street: '100 Example Way',
  city: 'Austin',
  state: 'TX',
  country: 'United States',
  postal_code: '78701',
  executive_street: '200 Example Plaza',
  executive_city: 'Austin',
  executive_area: 'Travis County',
  executive_state: 'TX',
  executive_postal_code: '78702',
  executive_country_code: 'US',
  recordPath: 'fixtures/synthetic-leads/contact_test_001',
  sources: 'fixture',
  data_source: 'synthetic-test-fixture',
} satisfies ContactRecord

export const testContactWithoutOptionalData = {
  id: 'contact_test_002',
  name: 'Sam Rivera',
  email: 'sam.rivera@example.com',
  company_name: 'Example Systems',
  city: 'Seattle',
  country: 'United States',
} satisfies ContactRecord

export const testCompanySummary = {
  company_name: 'Example Systems',
  contact_count: 2,
  countries: ['United States'],
  employee_range: '201-500',
  contacts: [testContact, testContactWithoutOptionalData],
} satisfies CompanySummary

export const testContactNote = {
  workspace_id: testWorkspace.id,
  contact_id: testContact.id,
  notes: 'Follow up after the product webinar.',
  tags: ['warm-lead', 'webinar'],
  updated_at: '2026-07-06T00:00:00.000Z',
} satisfies ContactNote

export function makeContactFilters(overrides: Partial<ContactFilters> = {}): ContactFilters {
  return {
    seniority: [],
    job_function: [],
    job_sector: [],
    country: [],
    state: [],
    employee_range: [],
    ...overrides,
  }
}

export const testContactFilters = makeContactFilters({
  seniority: ['Executive'],
  country: ['United States'],
})

export const testSavedList = {
  id: 'saved_list_test_001',
  workspace_id: testWorkspace.id,
  user_id: testWorkspace.user_id,
  name: 'US Executives',
  filters_json: testContactFilters,
  search_query: 'example systems',
  created_at: '2026-07-06T00:00:00.000Z',
  updated_at: '2026-07-06T00:00:00.000Z',
} satisfies SavedList

export const testColumnPreferences = {
  workspace_id: testWorkspace.id,
  user_id: testWorkspace.user_id,
  visible_columns_json: [...DEFAULT_VISIBLE_COLUMNS],
  column_order_json: [...DEFAULT_VISIBLE_COLUMNS],
  updated_at: '2026-07-06T00:00:00.000Z',
} satisfies ColumnPreferences

export function makeContact(overrides: Partial<ContactRecord> = {}): ContactRecord {
  return {
    ...testContact,
    ...overrides,
  }
}

export function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    ...testWorkspace,
    ...overrides,
  }
}
