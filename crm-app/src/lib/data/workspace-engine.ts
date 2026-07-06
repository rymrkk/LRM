import { FILTER_KEYS } from '../constants'
import type { CompanySummary, ContactRecord } from '../../types/contact'
import type { ContactFilters, FilterKey } from '../../types/workspace'
import {
  buildLocationFilterIndex,
  extractFilterOptions,
  groupContactsByCompany,
  type LocationFilterIndex,
} from '.'

export type WorkspaceEngineQuery = {
  filters?: Partial<Record<FilterKey, readonly unknown[]>>
  includeCompanies?: boolean
  searchQuery?: string
}

export type WorkspaceEngineResult = {
  companies?: CompanySummary[]
  filteredCount: number
  rowIndexes: number[]
}

export type WorkspaceWorkerStatus = 'idle' | 'initializing' | 'ready' | 'filtering' | 'fallback' | 'error'

export type WorkspaceWorkerState = {
  companies?: CompanySummary[]
  filterOptions: ContactFilters
  filteredCount: number
  locationIndex: LocationFilterIndex
  rowIndexes: number[]
  totalCount: number
  workerStatus: WorkspaceWorkerStatus
}

export type WorkspaceWorkerInitMessage = {
  contacts: ContactRecord[]
  type: 'init'
  workspaceId: string
}

export type WorkspaceWorkerQueryMessage = {
  activeView?: string
  filters?: Partial<Record<FilterKey, readonly unknown[]>>
  requestId: number
  searchQuery?: string
  type: 'query'
}

export type WorkspaceWorkerReadyMessage = {
  filterOptions: ContactFilters
  locationIndex: LocationFilterIndex
  totalCount: number
  type: 'ready'
  workspaceId: string
}

export type WorkspaceWorkerResultMessage = WorkspaceEngineResult & {
  requestId: number
  type: 'result'
}

export type WorkspaceWorkerErrorMessage = {
  message: string
  requestId?: number
  type: 'error'
}

export type WorkspaceWorkerInboundMessage = WorkspaceWorkerInitMessage | WorkspaceWorkerQueryMessage
export type WorkspaceWorkerOutboundMessage =
  | WorkspaceWorkerReadyMessage
  | WorkspaceWorkerResultMessage
  | WorkspaceWorkerErrorMessage

type IndexedContact = {
  filters: Record<FilterKey, string>
  index: number
  search: string
}

export type WorkspaceEngine = {
  filterOptions: ContactFilters
  locationIndex: LocationFilterIndex
  query: (criteria?: WorkspaceEngineQuery) => WorkspaceEngineResult
  totalCount: number
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLocaleLowerCase()
}

function normalizeRegionValue(value: unknown): string {
  const normalizedValue = value === null || value === undefined ? '' : String(value).trim()

  if (!normalizedValue) return ''

  const overrides = new Map<string, string>([
    ['?l?skie', '\u015Bl\u0105skie'],
    ['wojew\u00F3dztwo ?\u00F3dzkie', '\u0142\u00F3d\u017A voivodeship'],
    ['\u221A\u00E9le-de-France', '\u00EEle-de-france'],
    ['\u2248\u00C5\u221A\u2265d\u2248\u222B Voivodeship', '\u0142\u00F3d\u017A voivodeship'],
    ['\u00C2\u00A0Luzon', 'luzon'],
    ['\u00C3\u201A\u00C2\u00A0Luzon', 'luzon'],
  ])
  const override = overrides.get(normalizedValue)

  if (override) return override

  if (
    normalizedValue === '-' ||
    normalizedValue.toLocaleUpperCase() === '#NAME?' ||
    /^\d+$/.test(normalizedValue) ||
    /^\d+\s+\S+/.test(normalizedValue)
  ) {
    return ''
  }

  return normalizedValue.toLocaleLowerCase()
}

function normalizeCityValue(value: unknown): string {
  const normalizedValue = value === null || value === undefined ? '' : String(value).trim()

  if (!normalizedValue || normalizedValue === '-' || normalizedValue.toLocaleUpperCase() === '#NAME?' || /^\d+$/.test(normalizedValue)) {
    return ''
  }

  return normalizedValue.toLocaleLowerCase()
}

function normalizeFilterValue(key: FilterKey, value: unknown): string {
  if (key === 'state') return normalizeRegionValue(value)
  if (key === 'city') return normalizeCityValue(value)
  return normalizeText(value)
}

function normalizeFilterInput(filters?: Partial<Record<FilterKey, readonly unknown[]>>): Record<FilterKey, string[]> {
  return FILTER_KEYS.reduce((normalizedFilters, key) => {
    const values = filters?.[key] ?? []
    normalizedFilters[key] = Array.from(new Set(values.map((value) => normalizeFilterValue(key, value)).filter(Boolean)))
    return normalizedFilters
  }, {} as Record<FilterKey, string[]>)
}

function createIndexedContact(contact: ContactRecord, index: number): IndexedContact {
  return {
    filters: FILTER_KEYS.reduce((values, key) => {
      values[key] = normalizeFilterValue(key, contact[key])
      return values
    }, {} as Record<FilterKey, string>),
    index,
    search: [contact.name, contact.email, contact.company_name].map(normalizeText).join(' '),
  }
}

export function createWorkspaceEngine(contacts: readonly ContactRecord[]): WorkspaceEngine {
  const indexedContacts = contacts.map(createIndexedContact)

  return {
    filterOptions: extractFilterOptions(contacts),
    locationIndex: buildLocationFilterIndex(contacts),
    query(criteria = {}) {
      const query = normalizeText(criteria.searchQuery)
      const filters = normalizeFilterInput(criteria.filters)
      const rowIndexes = indexedContacts
        .filter((contact) => {
          if (query && !contact.search.includes(query)) return false

          return FILTER_KEYS.every((key) => {
            const selectedValues = filters[key]
            return selectedValues.length === 0 || selectedValues.includes(contact.filters[key])
          })
        })
        .map((contact) => contact.index)
      const filteredContacts = rowIndexes.map((index) => contacts[index])

      return {
        companies: criteria.includeCompanies ? groupContactsByCompany(filteredContacts) : undefined,
        filteredCount: rowIndexes.length,
        rowIndexes,
      }
    },
    totalCount: contacts.length,
  }
}

export function reduceWorkspaceWorkerMessage(
  state: WorkspaceWorkerState,
  currentRequestId: number,
  message: WorkspaceWorkerOutboundMessage,
): WorkspaceWorkerState {
  if (message.type === 'result') {
    if (message.requestId !== currentRequestId) return state

    return {
      ...state,
      companies: message.companies,
      filteredCount: message.filteredCount,
      rowIndexes: message.rowIndexes,
      workerStatus: state.workerStatus === 'fallback' ? 'fallback' : 'ready',
    }
  }

  if (message.type === 'ready') {
    return {
      ...state,
      filterOptions: message.filterOptions,
      locationIndex: message.locationIndex,
      rowIndexes: Array.from({ length: message.totalCount }, (_, index) => index),
      filteredCount: message.totalCount,
      totalCount: message.totalCount,
      workerStatus: 'ready',
    }
  }

  return {
    ...state,
    workerStatus: 'error',
  }
}
