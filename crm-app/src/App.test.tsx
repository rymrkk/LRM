import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import {
  DEFAULT_VISIBLE_COLUMNS,
  FILTER_KEYS,
  INITIAL_EXPECTED_ROW_COUNT,
} from './lib/constants'

describe('App shell', () => {
  it('renders the CRM workspace navigation and contact summary', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /lead relationship manager/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all contacts/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /saved lists/i })).toBeInTheDocument()
    expect(screen.getByText(/47,613 cleaned contacts ready for import/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload csv/i })).toBeInTheDocument()
  })

  it('exposes the primary contact workspace controls with accessible names', () => {
    render(<App />)

    expect(screen.getByRole('textbox', { name: /search contacts/i })).toHaveAttribute(
      'placeholder',
      'Search name, email, or company',
    )
    expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save as list/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /contacts preview/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: /contact detail preview/i })).toBeInTheDocument()
  })

  it('renders filter chips and preview columns from shared CRM constants', () => {
    render(<App />)

    for (const filterKey of FILTER_KEYS) {
      expect(
        screen.getByRole('button', { name: filterKey.replaceAll('_', ' ') }),
      ).toBeInTheDocument()
    }

    for (const column of DEFAULT_VISIBLE_COLUMNS) {
      expect(screen.getByRole('columnheader', { name: column.replaceAll('_', ' ') })).toBeInTheDocument()
    }

    expect(screen.getByText(FILTER_KEYS.length.toString())).toBeInTheDocument()
    expect(screen.getByText(DEFAULT_VISIBLE_COLUMNS.length.toString())).toBeInTheDocument()
    expect(screen.getAllByText(INITIAL_EXPECTED_ROW_COUNT.toLocaleString()).length).toBeGreaterThan(0)
  })
})
