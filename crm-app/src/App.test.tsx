import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the CRM workspace navigation and contact workbench shell', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /lead relationship manager/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all contacts/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /saved lists/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveDisplayValue('10124 Users')
    expect(screen.getByText(/47,613 cleaned contacts ready for import/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload csv/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /filters/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /column picker/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /all contacts/i })).toBeInTheDocument()
    expect(screen.getByText(/4 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getAllByText('Region / State').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /save as list/i })).toBeInTheDocument()
  })

  it('switches between companies and saved lists shells', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('link', { name: /companies/i }))

    expect(screen.getByRole('heading', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByText(/grouped by company name/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /saved lists/i }))

    expect(screen.getByRole('heading', { name: /saved lists/i })).toBeInTheDocument()
    expect(screen.getByText(/applies search and filter state/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open executive contacts/i })).toBeInTheDocument()
  })

  it('virtualizes static JSON contacts instead of mounting every row', async () => {
    const contacts = Array.from({ length: 150 }, (_, index) => ({
      id: `json-${index}`,
      name: `JSON Contact ${index}`,
      email: `contact.${index}@example.com`,
      company_name: index === 149 ? 'Acme Search Target' : 'Acme Corp',
      job_title: 'Manager',
      seniority: 'Manager',
      job_function: 'Operations',
      job_sector: 'Software',
      city: 'Austin',
      state: 'TX',
      country: 'United States',
      employee_range: '51-200',
    }))

    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => contacts }) as Response)

    render(<App />)

    expect(await screen.findByText(/150 of 150 shown/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeLessThan(80))
  })

  it('filters contact rows from search input and filter chips', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(screen.getByRole('textbox', { name: /search contacts/i }), 'signal')

    expect(screen.getByText(/1 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open priya nair/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open maria santos/i })).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: /search contacts/i }))
    await user.click(screen.getByRole('button', { name: 'Executive' }))

    expect(screen.getByText(/1 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open maria santos/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open jordan lee/i })).not.toBeInTheDocument()
  })

  it('applies column picker changes only after clicking Apply columns', async () => {
    const user = userEvent.setup()

    render(<App />)

    const countryToggle = screen.getByRole('checkbox', { name: /country/i })
    expect(countryToggle).toBeChecked()
    expect(screen.getByRole('columnheader', { name: /country/i })).toBeInTheDocument()

    await user.click(countryToggle)

    expect(countryToggle).not.toBeChecked()
    expect(screen.getByRole('columnheader', { name: /country/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /apply columns/i }))

    expect(screen.queryByRole('columnheader', { name: /country/i })).not.toBeInTheDocument()
  })

  it('opens the contact detail drawer from a contact row', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /open maria santos/i }))

    expect(screen.getByRole('dialog', { name: /contact detail/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /maria santos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /email maria santos/i })).toHaveAttribute(
      'href',
      'mailto:maria.santos@example.com',
    )
    expect(screen.getByRole('textbox', { name: /notes/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /tags/i })).toBeInTheDocument()
  })
})
