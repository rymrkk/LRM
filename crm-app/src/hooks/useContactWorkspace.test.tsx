import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContactRecord } from '../types/contact'
import { useContactWorkspace } from './useContactWorkspace'

const contacts: ContactRecord[] = [
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
    city: 'London',
    employee_range: '1001-5000',
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
    city: 'Arlington',
    employee_range: '501-1000',
  },
]

describe('useContactWorkspace', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('falls back to the main-thread engine when Worker is unavailable', async () => {
    vi.stubGlobal('Worker', undefined)
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useContactWorkspace({
        activeView: 'contacts',
        contacts,
        filters: {},
        searchQuery: 'compiler',
        workspaceId: 'test-workspace',
      }),
    )

    expect(result.current.searchQuery).toBe('compiler')
    expect(result.current.workerStatus).toBe('fallback')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })

    expect(result.current.filteredContacts.map((contact) => contact.id)).toEqual(['2'])
    expect(result.current.filterOptions.country).toEqual(['United Kingdom', 'United States'])
    expect(result.current.locationIndex.statesByCountry).toEqual({
      'United States': ['VA'],
    })
  })

  it('keeps previous results while a debounced query is pending', async () => {
    vi.stubGlobal('Worker', undefined)
    vi.useFakeTimers()

    const { result, rerender } = renderHook(
      ({ searchQuery }) =>
        useContactWorkspace({
          activeView: 'contacts',
          contacts,
          filters: {},
          searchQuery,
          workspaceId: 'test-workspace',
        }),
      { initialProps: { searchQuery: '' } },
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })
    expect(result.current.filteredCount).toBe(2)

    rerender({ searchQuery: 'compiler' })

    expect(result.current.searchQuery).toBe('compiler')
    expect(result.current.isFiltering).toBe(true)
    expect(result.current.filteredCount).toBe(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150)
    })

    expect(result.current.filteredContacts.map((contact) => contact.id)).toEqual(['2'])
  })
  it('falls back to main-thread filtering when the worker errors', async () => {
    vi.useFakeTimers()

    class FailingWorker {
      onerror: (() => void) | null = null
      onmessage: (() => void) | null = null

      postMessage() {
        window.setTimeout(() => this.onerror?.(), 0)
      }

      terminate() {}
    }

    vi.stubGlobal('Worker', FailingWorker)

    const { result } = renderHook(() =>
      useContactWorkspace({
        activeView: 'contacts',
        contacts,
        filters: {},
        searchQuery: 'compiler',
        workspaceId: 'test-workspace',
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await vi.advanceTimersByTimeAsync(150)
    })

    expect(result.current.workerStatus).toBe('fallback')
    expect(result.current.filteredContacts.map((contact) => contact.id)).toEqual(['2'])
  })

})
