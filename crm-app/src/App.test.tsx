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

  it('searches filter values and clears active filters', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(screen.getByRole('textbox', { name: /search filter values/i }), 'exec')

    expect(screen.getByRole('button', { name: 'Executive' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Director' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Executive' }))
    expect(screen.getByText(/1 of 4 shown/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(screen.getByText(/4 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Executive' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('scopes Region / State options to the selected country and expands longer option groups', async () => {
    const user = userEvent.setup()
    const contacts = [
      {
        id: 'us-1',
        name: 'US Contact',
        email: 'us@example.com',
        company_name: 'US Company',
        job_title: 'Director',
        seniority: 'Director',
        job_function: 'IT',
        job_sector: 'Software',
        country: 'United States',
        state: 'TX',
        employee_range: '51-200',
      },
      {
        id: 'fr-1',
        name: 'France Contact',
        email: 'fr@example.com',
        company_name: 'France Company',
        job_title: 'Architect',
        seniority: 'Staff',
        job_function: 'Engineering',
        job_sector: 'Software',
        country: 'France',
        state: '\u221A\u00E9le-de-France',
        employee_range: '201-500',
      },
      {
        id: 'pl-1',
        name: 'Poland Contact',
        email: 'pl@example.com',
        company_name: 'Poland Company',
        job_title: 'Manager',
        seniority: 'Manager',
        job_function: 'Operations',
        job_sector: 'Manufacturing',
        country: 'Poland',
        state: '\u2248\u00C5\u221A\u2265d\u2248\u222B Voivodeship',
        employee_range: '501-1000',
      },
      {
        id: 'ca-1',
        name: 'Canada Contact',
        email: 'ca@example.com',
        company_name: 'Canada Company',
        job_title: 'Lead',
        seniority: 'Lead',
        job_function: 'Sales',
        job_sector: 'Consulting',
        country: 'Canada',
        state: 'ON',
        employee_range: '1001-5000',
      },
      {
        id: 'sg-1',
        name: 'Singapore Contact',
        email: 'sg@example.com',
        company_name: 'Singapore Company',
        job_title: 'Head',
        seniority: 'Head',
        job_function: 'Leadership',
        job_sector: 'Services',
        country: 'Singapore',
        state: 'Central Region',
        employee_range: '5001-10000',
      },
      {
        id: 'jp-1',
        name: 'Japan Contact',
        email: 'jp@example.com',
        company_name: 'Japan Company',
        job_title: 'VP',
        seniority: 'Executive',
        job_function: 'IT',
        job_sector: 'Technology',
        country: 'Japan',
        state: 'Tokyo',
        employee_range: '10001+',
      },
    ]

    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => contacts }) as Response)

    render(<App />)

    expect(await screen.findByText(/6 of 6 shown/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'United States' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show all country/i }))
    expect(screen.getByRole('button', { name: 'United States' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'France' }))

    expect(screen.getByRole('button', { name: '\u00CEle-de-France' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'TX' })).not.toBeInTheDocument()
  })

  it('saves the current filter combination as a reusable local list', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(screen.getByRole('textbox', { name: /search contacts/i }), 'northstar')
    await user.click(screen.getByRole('button', { name: 'Executive' }))
    expect(screen.getByText(/1 of 4 shown/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save as list/i }))
    await user.type(screen.getByRole('textbox', { name: /list name/i }), 'Northstar executives')
    await user.click(screen.getByRole('button', { name: /^save list$/i }))

    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    await user.clear(screen.getByRole('textbox', { name: /search contacts/i }))
    expect(screen.getByText(/4 of 4 shown/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /saved lists/i }))

    expect(screen.getByRole('heading', { name: /northstar executives/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('lrm:workspace-10124:saved-lists')).toContain('Northstar executives')

    await user.click(screen.getByRole('button', { name: /open northstar executives/i }))

    expect(screen.getByRole('link', { name: /all contacts/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('textbox', { name: /search contacts/i })).toHaveValue('northstar')
    expect(screen.getByRole('button', { name: 'Executive' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/1 of 4 shown/i)).toBeInTheDocument()
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
