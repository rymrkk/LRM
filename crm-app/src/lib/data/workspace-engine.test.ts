import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from '../constants'
import type { ContactRecord } from '../../types/contact'
import {
  createWorkspaceEngine,
  reduceWorkspaceWorkerMessage,
  type WorkspaceWorkerState,
} from './workspace-engine'

const contacts: ContactRecord[] = [
  {
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company_name: 'Analytical Engines',
    job_title: 'Chief Scientist',
    seniority: 'Executive',
    job_function: 'Engineering',
    job_sector: 'Technology',
    country: 'United Kingdom',
    state: '',
    city: 'London',
    employee_range: '1001-5000',
  },
  {
    id: '2',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    company_name: 'Compiler Co',
    job_title: 'Director of R&D',
    seniority: 'Director',
    job_function: 'Engineering',
    job_sector: 'Technology',
    country: 'United States',
    state: 'VA',
    city: 'Arlington',
    employee_range: '501-1000',
  },
  {
    id: '3',
    name: 'Lin Chen',
    email: 'lin@example.com',
    company_name: 'Analytical Engines',
    job_title: 'Operations Lead',
    seniority: 'Manager',
    job_function: 'Operations',
    job_sector: 'Manufacturing',
    country: 'Singapore',
    state: '',
    city: 'Singapore',
    employee_range: '1001-5000',
  },
]

describe('workspace engine', () => {
  it('returns filtered row indexes matching search and filters without rebuilding contact rows', () => {
    const engine = createWorkspaceEngine(contacts)

    const result = engine.query({
      searchQuery: 'analytical',
      filters: {
        ...EMPTY_FILTERS,
        country: ['Singapore'],
      },
      includeCompanies: false,
    })

    expect(result.rowIndexes).toEqual([2])
    expect(result.filteredCount).toBe(1)
    expect(result.companies).toBeUndefined()
  })

  it('builds static filter options and cascading locations once per workspace', () => {
    const engine = createWorkspaceEngine(contacts)

    expect(engine.filterOptions.country).toEqual(['Singapore', 'United Kingdom', 'United States'])
    expect(engine.locationIndex).toMatchObject({
      countries: ['Singapore', 'United Kingdom', 'United States'],
      statesByCountry: {
        'United States': ['VA'],
      },
      citiesByCountryState: {
        Singapore: {
          '': ['Singapore'],
        },
        'United Kingdom': {
          '': ['London'],
        },
        'United States': {
          VA: ['Arlington'],
        },
      },
    })
  })

  it('only groups companies when query requests company data', () => {
    const engine = createWorkspaceEngine(contacts)

    expect(engine.query({ includeCompanies: false }).companies).toBeUndefined()
    expect(engine.query({ includeCompanies: true }).companies).toEqual([
      expect.objectContaining({ company_name: 'Analytical Engines', contact_count: 2 }),
      expect.objectContaining({ company_name: 'Compiler Co', contact_count: 1 }),
    ])
  })

  it('ignores stale worker results by request id', () => {
    const initialState: WorkspaceWorkerState = {
      filterOptions: EMPTY_FILTERS,
      filteredCount: 0,
      locationIndex: {
        citiesByCountryState: {},
        countries: [],
        statesByCountry: {},
      },
      rowIndexes: [],
      totalCount: 0,
      workerStatus: 'ready',
    }

    const current = reduceWorkspaceWorkerMessage(initialState, 3, {
      requestId: 2,
      type: 'result',
      rowIndexes: [0],
      filteredCount: 1,
    })

    expect(current).toBe(initialState)
  })
})
