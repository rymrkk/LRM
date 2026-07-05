import { describe, expect, it } from 'vitest'
import { DEFAULT_VISIBLE_COLUMNS, FILTER_KEYS } from '../lib/constants'
import {
  makeContact,
  makeContactFilters,
  makeWorkspace,
  testColumnPreferences,
  testCompanySummary,
  testContact,
  testContactFilters,
  testContactNote,
  testContactWithoutOptionalData,
  testSavedList,
  testWorkspace,
} from './fixtures'

describe('CRM test fixtures', () => {
  it('uses only synthetic contact data suitable for tests', () => {
    expect(testContact.email).toMatch(/@example\.com$/)
    expect(testContactWithoutOptionalData.email).toMatch(/@example\.com$/)
    expect(testContact.sources).toBe('fixture')
    expect(testContact.data_source).toBe('synthetic-test-fixture')
  })

  it('keeps workspace-scoped records attached to the same synthetic user and workspace', () => {
    expect(testSavedList.workspace_id).toBe(testWorkspace.id)
    expect(testSavedList.user_id).toBe(testWorkspace.user_id)
    expect(testContactNote.workspace_id).toBe(testWorkspace.id)
    expect(testContactNote.contact_id).toBe(testContact.id)
    expect(testColumnPreferences.workspace_id).toBe(testWorkspace.id)
    expect(testColumnPreferences.user_id).toBe(testWorkspace.user_id)
  })

  it('keeps company summary counts aligned with included contacts', () => {
    expect(testCompanySummary.contacts).toEqual([testContact, testContactWithoutOptionalData])
    expect(testCompanySummary.contact_count).toBe(testCompanySummary.contacts.length)
    expect(testWorkspace.row_count).toBe(testCompanySummary.contacts.length)
  })

  it('uses shared filter and column contracts for saved lists and preferences', () => {
    expect(Object.keys(testContactFilters)).toEqual(FILTER_KEYS)
    expect(testSavedList.filters_json).toBe(testContactFilters)
    expect(testColumnPreferences.visible_columns_json).toEqual(DEFAULT_VISIBLE_COLUMNS)
    expect(testColumnPreferences.column_order_json).toEqual(DEFAULT_VISIBLE_COLUMNS)
  })

  it('creates independent filter arrays for tests that mutate filter state', () => {
    const firstFilters = makeContactFilters()
    const secondFilters = makeContactFilters()

    firstFilters.country.push('United States')

    expect(firstFilters.country).toEqual(['United States'])
    expect(secondFilters.country).toEqual([])
  })

  it('offers small factories for future module tests without mutating base fixtures', () => {
    const renamedContact = makeContact({ id: 'contact_override_001', name: 'Jordan Example' })
    const renamedWorkspace = makeWorkspace({ id: 'workspace_override_001', name: 'Override Leads' })

    expect(renamedContact).toMatchObject({
      id: 'contact_override_001',
      name: 'Jordan Example',
      company_name: testContact.company_name,
    })
    expect(testContact.id).toBe('contact_test_001')
    expect(renamedWorkspace).toMatchObject({
      id: 'workspace_override_001',
      name: 'Override Leads',
      user_id: testWorkspace.user_id,
    })
    expect(testWorkspace.id).toBe('workspace_test_001')
  })
})
