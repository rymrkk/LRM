import type { ContactColumnKey } from '../types/contact'
import type { ContactFilters, FilterKey } from '../types/workspace'

export const APP_NAME = 'Lead Relationship Manager'
export const STORAGE_BUCKET = 'lead-workspaces'
export const INITIAL_EXPECTED_ROW_COUNT = 47_613

export const REQUIRED_CONTACT_HEADERS = [
  'id',
  'name',
  'email',
  'company_name',
  'job_title',
  'seniority',
  'job_function',
  'job_sector',
  'city',
  'state',
  'country',
  'employee_range',
] as const

export const DEFAULT_VISIBLE_COLUMNS: ContactColumnKey[] = [
  'name',
  'job_title',
  'seniority',
  'company_name',
  'email',
  'best_phone',
  'city',
  'country',
]

export const OPTIONAL_COLUMNS: ContactColumnKey[] = [
  'job_function',
  'job_sector',
  'employees',
  'employee_range',
  'state',
  'postal_code',
  'executive_linkedin_profile',
  'sources',
]

export const FILTER_KEYS: FilterKey[] = [
  'seniority',
  'job_function',
  'job_sector',
  'country',
  'state',
  'employee_range',
]

export const EMPTY_FILTERS: ContactFilters = {
  seniority: [],
  job_function: [],
  job_sector: [],
  country: [],
  state: [],
  employee_range: [],
}

export const PHONE_PRIORITY = [
  'mobile_phone',
  'desk_phone',
  'corporate_phone',
] as const
