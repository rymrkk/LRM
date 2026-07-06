import { describe, expect, it } from 'vitest'
import {
  APP_NAME,
  DEFAULT_VISIBLE_COLUMNS,
  BUSINESS_FILTER_KEYS,
  EMPTY_FILTERS,
  FILTER_KEYS,
  INITIAL_EXPECTED_ROW_COUNT,
  LOCATION_FILTER_KEYS,
  OPTIONAL_COLUMNS,
  PHONE_PRIORITY,
  REQUIRED_CONTACT_HEADERS,
  STORAGE_BUCKET,
} from './constants'

describe('CRM constants', () => {
  it('keeps the public app identity and storage bucket stable', () => {
    expect(APP_NAME).toBe('Lead Relationship Manager')
    expect(STORAGE_BUCKET).toBe('lead-workspaces')
    expect(INITIAL_EXPECTED_ROW_COUNT).toBe(47_613)
  })

  it('matches the contacts table default and optional column contracts', () => {
    expect(DEFAULT_VISIBLE_COLUMNS).toEqual([
      'name',
      'job_title',
      'seniority',
      'company_name',
      'email',
      'best_phone',
      'city',
      'country',
    ])

    expect(OPTIONAL_COLUMNS).toEqual([
      'job_function',
      'job_sector',
      'employees',
      'employee_range',
      'state',
      'postal_code',
      'executive_linkedin_profile',
      'sources',
    ])

    const defaultColumnSet = new Set(DEFAULT_VISIBLE_COLUMNS)
    expect(OPTIONAL_COLUMNS.every((column) => !defaultColumnSet.has(column))).toBe(true)
  })

  it('keeps supported filters aligned with an empty filter state object', () => {
    expect(BUSINESS_FILTER_KEYS).toEqual([
      'seniority',
      'job_function',
      'job_sector',
      'employee_range',
    ])
    expect(LOCATION_FILTER_KEYS).toEqual(['country', 'state', 'city'])
    expect(FILTER_KEYS).toEqual([
      'seniority',
      'job_function',
      'job_sector',
      'employee_range',
      'country',
      'state',
      'city',
    ])

    expect(Object.keys(EMPTY_FILTERS)).toEqual(FILTER_KEYS)

    for (const filterKey of FILTER_KEYS) {
      expect(EMPTY_FILTERS[filterKey]).toEqual([])
    }
  })

  it('lists the required cleaned CSV headers without duplicates', () => {
    expect(REQUIRED_CONTACT_HEADERS).toEqual([
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
    ])

    expect(new Set(REQUIRED_CONTACT_HEADERS).size).toBe(REQUIRED_CONTACT_HEADERS.length)
  })

  it('keeps the deterministic best-phone priority ordered by reachability', () => {
    expect(PHONE_PRIORITY).toEqual(['mobile_phone', 'desk_phone', 'corporate_phone'])
  })
})
