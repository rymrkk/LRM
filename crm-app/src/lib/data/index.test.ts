import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, REQUIRED_CONTACT_HEADERS } from '../constants'
import type { ContactRecord } from '../../types/contact'
import {
  buildContactsWorkspace,
  buildLocationFilterIndex,
  countCsvDataRows,
  deserializeSavedListFilters,
  deriveBestPhone,
  extractFilterOptions,
  filterContacts,
  groupContactsByCompany,
  loadContactsJson,
  normalizeContactRow,
  parseContactsCsv,
  serializeSavedListFilters,
  validateRequiredHeaders,
} from '.'

const csvHeader = REQUIRED_CONTACT_HEADERS.join(',')

const sampleCsv = `${csvHeader},mobile_phone,desk_phone,corporate_phone,employees
1,Ada Lovelace,ada@example.com,Analytical Engines,Chief Scientist,Executive,Engineering,Technology,London,,United Kingdom,1001-5000,+44 7000,,+44 20,1200
2,Grace Hopper,grace@example.com,Compiler Co,Director of R&D,Director,Engineering,Technology,Arlington,VA,United States,501-1000,,+1 555 0101,+1 555 0102,700
3,Lin Chen,lin@example.com,Analytical Engines,Operations Lead,Manager,Operations,Manufacturing,Singapore,,Singapore,1001-5000,,,,
`

const sampleContacts: ContactRecord[] = [
  {
    id: '1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company_name: 'Analytical Engines',
    seniority: 'Executive',
    job_function: 'Engineering',
    job_sector: 'Technology',
    country: 'United Kingdom',
    state: '',
    employee_range: '1001-5000',
    mobile_phone: '+44 7000',
    desk_phone: '',
    corporate_phone: '+44 20',
  },
  {
    id: '2',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    company_name: 'Compiler Co',
    seniority: 'Director',
    job_function: 'Engineering',
    job_sector: 'Technology',
    country: 'United States',
    state: 'VA',
    employee_range: '501-1000',
    mobile_phone: '',
    desk_phone: '+1 555 0101',
    corporate_phone: '+1 555 0102',
  },
  {
    id: '3',
    name: 'Lin Chen',
    email: 'lin@example.com',
    company_name: 'Analytical Engines',
    seniority: 'Manager',
    job_function: 'Operations',
    job_sector: 'Manufacturing',
    country: 'Singapore',
    state: '',
    employee_range: '1001-5000',
    mobile_phone: '',
    desk_phone: '',
    corporate_phone: '',
  },
]

describe('CSV contact data utilities', () => {
  it('validates required headers and reports missing CRM fields', () => {
    expect(validateRequiredHeaders(REQUIRED_CONTACT_HEADERS)).toEqual({
      ok: true,
      missingHeaders: [],
      normalizedHeaders: [...REQUIRED_CONTACT_HEADERS],
    })

    expect(validateRequiredHeaders([' id ', 'name', 'company_name'])).toEqual({
      ok: false,
      missingHeaders: [
        'email',
        'job_title',
        'seniority',
        'job_function',
        'job_sector',
        'city',
        'state',
        'country',
        'employee_range',
      ],
      normalizedHeaders: ['id', 'name', 'company_name'],
    })
  })

  it('counts non-empty CSV data rows without counting the header', () => {
    expect(countCsvDataRows(`${csvHeader}\n\n1,Ada,ada@example.com,Analytical Engines,,,,,,,,\n\n`)).toBe(1)
    expect(countCsvDataRows(`${csvHeader}\n`)).toBe(0)
  })

  it('parses CSV with Papa Parse and preserves blank fields as empty strings', () => {
    const result = parseContactsCsv(sampleCsv)

    expect(result.rowCount).toBe(3)
    expect(result.headers).toContain('mobile_phone')
    expect(result.contacts[0]).toMatchObject({
      id: '1',
      state: '',
      mobile_phone: '+44 7000',
      desk_phone: '',
    })
    expect(result.contacts[2]).toMatchObject({
      id: '3',
      corporate_phone: '',
      employees: '',
    })
  })

  it('normalizes contact rows without replacing blanks with display placeholders', () => {
    expect(
      normalizeContactRow({
        id: 7,
        name: '  Katherine Johnson  ',
        email: undefined,
        company_name: null,
        desk_phone: '',
      }),
    ).toMatchObject({
      id: '7',
      name: 'Katherine Johnson',
      email: '',
      company_name: '',
      desk_phone: '',
    })
  })

  it('derives the best phone using shared priority', () => {
    expect(deriveBestPhone(sampleContacts[0])).toBe('+44 7000')
    expect(deriveBestPhone(sampleContacts[1])).toBe('+1 555 0101')
    expect(deriveBestPhone(sampleContacts[2])).toBe('')
  })

  it('searches name, email, and company while applying category filters', () => {
    expect(filterContacts(sampleContacts, { searchQuery: 'compiler' }).map((contact) => contact.id)).toEqual(['2'])
    expect(filterContacts(sampleContacts, { searchQuery: 'ADA@EXAMPLE.COM' }).map((contact) => contact.id)).toEqual([
      '1',
    ])

    const filtered = filterContacts(sampleContacts, {
      filters: {
        ...EMPTY_FILTERS,
        seniority: ['Executive', 'Manager'],
        country: ['Singapore'],
      },
    })

    expect(filtered.map((contact) => contact.id)).toEqual(['3'])
  })

  it('extracts sorted filter options while omitting blank values', () => {
    expect(extractFilterOptions(sampleContacts)).toEqual({
      seniority: ['Director', 'Executive', 'Manager'],
      job_function: ['Engineering', 'Operations'],
      job_sector: ['Manufacturing', 'Technology'],
      country: ['Singapore', 'United Kingdom', 'United States'],
      state: ['VA'],
      employee_range: ['1001-5000', '501-1000'],
      city: [],
    })
  })

  it('sanitizes state filter options for display without mutating contact rows', () => {
    const contacts = [
      { ...sampleContacts[0], id: 'artifact-1', state: '-' },
      { ...sampleContacts[0], id: 'artifact-2', state: '#NAME?' },
      { ...sampleContacts[0], id: 'artifact-3', state: '2450' },
      { ...sampleContacts[0], id: 'artifact-4', state: '88 Queensway' },
      { ...sampleContacts[0], id: 'artifact-5', state: '\u221A\u00E9le-de-France' },
      { ...sampleContacts[0], id: 'artifact-6', state: '?l?skie' },
      { ...sampleContacts[0], id: 'artifact-7', state: '\u2248\u00C5\u221A\u2265d\u2248\u222B Voivodeship' },
      { ...sampleContacts[0], id: 'valid-1', state: 'Virginia' },
    ]

    expect(extractFilterOptions(contacts).state).toEqual([
      '\u00CEle-de-France',
      '\u0141\u00F3d\u017A Voivodeship',
      '\u015Al\u0105skie',
      'Virginia',
    ])
    expect(contacts[4].state).toBe('\u221A\u00E9le-de-France')
  })

  it('builds cascading location options from valid country, state, and city values', () => {
    const contacts: ContactRecord[] = [
      {
        ...sampleContacts[0],
        id: 'us-1',
        country: 'United States',
        state: 'TX',
        city: 'Austin',
      },
      {
        ...sampleContacts[0],
        id: 'us-2',
        country: 'United States',
        state: 'TX',
        city: 'Dallas',
      },
      {
        ...sampleContacts[0],
        id: 'us-3',
        country: 'United States',
        state: '#NAME?',
        city: 'Austin',
      },
      {
        ...sampleContacts[0],
        id: 'fr-1',
        country: 'France',
        state: '\u221A\u00E9le-de-France',
        city: 'Paris',
      },
      {
        ...sampleContacts[0],
        id: 'blank-1',
        country: '',
        state: 'TX',
        city: 'Hidden City',
      },
    ]

    const index = buildLocationFilterIndex(contacts)

    expect(index.countries).toEqual(['France', 'United States'])
    expect(index.statesByCountry).toEqual({
      France: ['\u00CEle-de-France'],
      'United States': ['TX'],
    })
    expect(index.citiesByCountryState).toEqual({
      France: {
        '\u00CEle-de-France': ['Paris'],
      },
      'United States': {
        TX: ['Austin', 'Dallas'],
      },
    })
  })
  it('groups contacts by company name with country summaries', () => {
    expect(groupContactsByCompany(sampleContacts)).toEqual([
      {
        company_name: 'Analytical Engines',
        contact_count: 2,
        countries: ['Singapore', 'United Kingdom'],
        employee_range: '1001-5000',
        contacts: [sampleContacts[0], sampleContacts[2]],
      },
      {
        company_name: 'Compiler Co',
        contact_count: 1,
        countries: ['United States'],
        employee_range: '501-1000',
        contacts: [sampleContacts[1]],
      },
    ])
  })

  it('round-trips saved-list filters through stable JSON serialization', () => {
    const serialized = serializeSavedListFilters({
      ...EMPTY_FILTERS,
      country: ['Singapore'],
      seniority: ['Manager'],
    })

    expect(serialized).toBe(
      '{"seniority":["Manager"],"job_function":[],"job_sector":[],"employee_range":[],"country":["Singapore"],"state":[],"city":[]}',
    )
    expect(deserializeSavedListFilters(serialized)).toEqual({
      ...EMPTY_FILTERS,
      country: ['Singapore'],
      seniority: ['Manager'],
    })
    expect(deserializeSavedListFilters('not-json')).toEqual(EMPTY_FILTERS)
  })

  it('builds a workspace data view from contacts, search, and filters', () => {
    const workspace = buildContactsWorkspace(sampleContacts, {
      searchQuery: 'analytical',
      filters: { country: ['Singapore'] },
    })

    expect(workspace.totalCount).toBe(3)
    expect(workspace.filteredCount).toBe(1)
    expect(workspace.contacts.map((contact) => contact.id)).toEqual(['3'])
    expect(workspace.filterOptions.country).toEqual(['Singapore', 'United Kingdom', 'United States'])
    expect(workspace.companies).toEqual([
      {
        company_name: 'Analytical Engines',
        contact_count: 1,
        countries: ['Singapore'],
        employee_range: '1001-5000',
        contacts: [sampleContacts[2]],
      },
    ])
  })

  it('loads normalized contacts from static JSON and falls back when the file is unavailable', async () => {
    const okFetch = async () =>
      ({
        ok: true,
        json: async () => [
          {
            id: 10,
            name: '  Mae Jemison  ',
            email: 'mae@example.com',
            company_name: 'Orbit Labs',
          },
        ],
      }) as Response

    await expect(loadContactsJson(okFetch, '/data/contacts.json', sampleContacts)).resolves.toEqual({
      contacts: [
        expect.objectContaining({
          id: '10',
          name: 'Mae Jemison',
          email: 'mae@example.com',
          company_name: 'Orbit Labs',
        }),
      ],
      source: 'static-json',
    })

    const missingFetch = async () => ({ ok: false, status: 404 }) as Response

    await expect(loadContactsJson(missingFetch, '/data/contacts.json', sampleContacts)).resolves.toEqual({
      contacts: sampleContacts,
      source: 'fallback',
    })
  })
})
