import { useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_FILTERS, FILTER_KEYS } from '../lib/constants'
import {
  createWorkspaceEngine,
  reduceWorkspaceWorkerMessage,
  type WorkspaceWorkerOutboundMessage,
  type WorkspaceWorkerState,
  type WorkspaceWorkerStatus,
} from '../lib/data/workspace-engine'
import type { CompanySummary, ContactRecord } from '../types/contact'
import type { ContactFilters, FilterKey } from '../types/workspace'

type UseContactWorkspaceArgs = {
  activeView: string
  contacts: ContactRecord[]
  filters: Partial<Record<FilterKey, string[]>>
  searchQuery: string
  workspaceId: string
}

type UseContactWorkspaceResult = {
  companies: CompanySummary[]
  contacts: ContactRecord[]
  filteredContacts: ContactRecord[]
  filteredCount: number
  filterOptions: ContactFilters
  isFiltering: boolean
  locationIndex: WorkspaceWorkerState['locationIndex']
  searchQuery: string
  totalCount: number
  workerStatus: WorkspaceWorkerStatus
}

const QUERY_DEBOUNCE_MS = 120

const EMPTY_LOCATION_INDEX: WorkspaceWorkerState['locationIndex'] = {
  citiesByCountryState: {},
  countries: [],
  statesByCountry: {},
}

function createInitialState(contacts: readonly ContactRecord[]): WorkspaceWorkerState {
  return {
    filterOptions: EMPTY_FILTERS,
    filteredCount: contacts.length,
    locationIndex: EMPTY_LOCATION_INDEX,
    rowIndexes: Array.from({ length: contacts.length }, (_, index) => index),
    totalCount: contacts.length,
    workerStatus: 'idle',
  }
}

function canUseWorker(): boolean {
  return typeof Worker !== 'undefined'
}

function createFilterSignature(filters: Partial<Record<FilterKey, string[]>>): string {
  return JSON.stringify(
    FILTER_KEYS.reduce((stableFilters, key) => {
      stableFilters[key] = filters[key] ?? []
      return stableFilters
    }, {} as Record<FilterKey, string[]>),
  )
}

export function useContactWorkspace({
  activeView,
  contacts,
  filters,
  searchQuery,
  workspaceId,
}: UseContactWorkspaceArgs): UseContactWorkspaceResult {
  const workerRef = useRef<Worker | null>(null)
  const requestIdRef = useRef(0)
  const engineRef = useRef<ReturnType<typeof createWorkspaceEngine> | null>(null)
  const workerStatusRef = useRef<WorkspaceWorkerStatus>('idle')
  const [state, setState] = useState<WorkspaceWorkerState>(() => createInitialState(contacts))
  const [isFiltering, setIsFiltering] = useState(false)
  const workerEnabled = canUseWorker()
  const filterSignature = createFilterSignature(filters)

  useEffect(() => {
    requestIdRef.current = 0
    setIsFiltering(false)
    const initialWorkerStatus = workerEnabled ? 'initializing' : 'fallback'
    workerStatusRef.current = initialWorkerStatus
    setState({
      ...createInitialState(contacts),
      workerStatus: initialWorkerStatus,
    })

    if (!workerEnabled) {
      const engine = createWorkspaceEngine(contacts)
      engineRef.current = engine
      workerStatusRef.current = 'fallback'
      setState({
        filterOptions: engine.filterOptions,
        filteredCount: contacts.length,
        locationIndex: engine.locationIndex,
        rowIndexes: Array.from({ length: contacts.length }, (_, index) => index),
        totalCount: contacts.length,
        workerStatus: 'fallback',
      })
      return
    }

    const worker = new Worker(new URL('../workers/contactWorkspace.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    engineRef.current = null

    worker.onmessage = (event: MessageEvent<WorkspaceWorkerOutboundMessage>) => {
      if (event.data.type === 'error') {
        workerStatusRef.current = 'error'
        setState((currentState) => ({ ...currentState, workerStatus: 'error' }))
        setIsFiltering(false)
        return
      }

      setState((currentState) => {
        const nextState = reduceWorkspaceWorkerMessage(currentState, requestIdRef.current, event.data)
        workerStatusRef.current = nextState.workerStatus
        return nextState
      })
      setIsFiltering(false)
    }

    worker.onerror = () => {
      worker.terminate()
      workerRef.current = null
      const engine = createWorkspaceEngine(contacts)
      engineRef.current = engine
      workerStatusRef.current = 'fallback'
      setState({
        filterOptions: engine.filterOptions,
        filteredCount: contacts.length,
        locationIndex: engine.locationIndex,
        rowIndexes: Array.from({ length: contacts.length }, (_, index) => index),
        totalCount: contacts.length,
        workerStatus: 'fallback',
      })
      setIsFiltering(false)
    }

    worker.postMessage({ contacts, type: 'init', workspaceId })

    return () => {
      worker.terminate()
      if (workerRef.current === worker) {
        workerRef.current = null
      }
    }
  }, [contacts, workerEnabled, workspaceId])

  useEffect(() => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsFiltering(true)
    const nextWorkerStatus = workerStatusRef.current === 'fallback' ? 'fallback' : 'filtering'
    workerStatusRef.current = nextWorkerStatus
    setState((currentState) => ({
      ...currentState,
      workerStatus: nextWorkerStatus,
    }))

    const timeoutId = window.setTimeout(() => {
      const includeCompanies = activeView === 'companies'
      const queryFilters = JSON.parse(filterSignature) as Record<FilterKey, string[]>

      if (workerRef.current && workerStatusRef.current !== 'fallback') {
        workerRef.current.postMessage({
          activeView,
          filters: queryFilters,
          requestId,
          searchQuery,
          type: 'query',
        })
        return
      }

      const engine = engineRef.current ?? createWorkspaceEngine(contacts)
      engineRef.current = engine
      const result = engine.query({ filters: queryFilters, includeCompanies, searchQuery })
      setState((currentState) => {
        const nextState = reduceWorkspaceWorkerMessage(currentState, requestId, {
          ...result,
          requestId,
          type: 'result',
        })
        workerStatusRef.current = nextState.workerStatus
        return nextState
      })
      setIsFiltering(false)
    }, QUERY_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeView, contacts, filterSignature, searchQuery])

  const filteredContacts = useMemo(
    () => state.rowIndexes.map((index) => contacts[index]).filter(Boolean),
    [contacts, state.rowIndexes],
  )

  return {
    companies: state.companies ?? [],
    contacts,
    filteredContacts,
    filteredCount: state.filteredCount,
    filterOptions: state.filterOptions,
    isFiltering,
    locationIndex: state.locationIndex,
    searchQuery,
    totalCount: state.totalCount,
    workerStatus: state.workerStatus,
  }
}
