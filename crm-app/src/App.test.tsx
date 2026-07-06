import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the CRM workspace navigation and contact workbench shell', async () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /lead relationship manager/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all contacts/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /companies/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /saved lists/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveDisplayValue('10124 Users')
    expect(screen.getByText(/47,613 contacts available in this workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload csv/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /filters/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /column picker/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /all contacts/i })).toBeInTheDocument()
    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getAllByText('State / Province').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /save as list/i })).toBeInTheDocument()
  })

  it('keeps workspace CSV actions constrained to the panel layout', () => {
    render(<App />)

    expect(screen.getByLabelText(/csv file/i)).toHaveClass('workspace-file-input')
    expect(screen.getByRole('button', { name: /create workspace/i })).toHaveClass('secondary-action')
    expect(screen.getByRole('button', { name: /upload csv/i })).toHaveClass('primary-action')
  })

  it('copies a best phone value from the contacts table', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: { writeText },
    })
    render(<App />)

    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getByText('+1 555 0100')).toHaveClass('phone-number-text')

    await user.click(screen.getByRole('button', { name: /copy phone number \+1 555 0100/i }))

    expect(writeText).toHaveBeenCalledWith('+1 555 0100')
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
  })

  it('uses wider fixed tracks for company, email, and phone columns', async () => {
    render(<App />)

    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()

    const headerRow = screen.getByRole('columnheader', { name: /company/i }).closest('[role="row"]')

    expect(headerRow).toHaveStyle({
      gridTemplateColumns: '150px 150px 110px 220px 260px 170px 110px 120px',
    })
  })

  it('renders LinkedIn table values as links and missing values as placeholders', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('checkbox', { name: /linkedin profile/i }))
    await user.click(screen.getByRole('button', { name: /apply columns/i }))

    expect(screen.getByRole('link', { name: /open linkedin profile for maria santos/i })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/maria-santos',
    )
    expect(screen.getByRole('link', { name: /open linkedin profile for maria santos/i })).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: /open linkedin profile for maria santos/i })).toHaveAttribute('rel', 'noreferrer noopener')
    expect(screen.getAllByText('\u2014').length).toBeGreaterThan(0)
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


  it('creates, reads, and deletes a local CSV workspace', async () => {
    const user = userEvent.setup()
    const csv = [
      'id,name,email,company_name,job_title,seniority,job_function,job_sector,city,state,country,employee_range',
      'local-001,Avery Chen,avery@example.com,LocalCo,RevOps Lead,Lead,Operations,Consulting,Manila,NCR,Philippines,11-50',
    ].join('\n')
    const file = new File([csv], 'enterprise-leads.csv', { type: 'text/csv' })

    render(<App />)

    await user.upload(screen.getByLabelText(/csv file/i), file)

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveDisplayValue('enterprise-leads.csv')
    expect(await screen.findByText(/1 of 1 shown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open avery chen/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('lrm:workspace-10124:local-workspaces')).toContain('enterprise-leads.csv')

    await user.click(screen.getByRole('button', { name: /delete workspace/i }))

    expect(screen.getByRole('combobox', { name: /workspace/i })).toHaveDisplayValue('10124 Users')
    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()
    expect(window.localStorage.getItem('lrm:workspace-10124:local-workspaces')).not.toContain('enterprise-leads.csv')
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

    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /open priya nair/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open maria santos/i })).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: /search contacts/i }))
    await user.click(screen.getByRole('button', { name: 'Executive' }))

    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /open maria santos/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open jordan lee/i })).not.toBeInTheDocument()
  })

  it('searches filter values and clears active filters', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(screen.getByRole('textbox', { name: /search filter values/i }), 'exec')

    expect(screen.getByRole('button', { name: 'Executive' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Director' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Executive' }))
    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Executive' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('uses cascading location comboboxes for country, state, and city', async () => {
    const user = userEvent.setup()
    const contacts = [
      {
        id: 'us-1',
        name: 'US Austin Contact',
        email: 'austin@example.com',
        company_name: 'US Company',
        job_title: 'Director',
        seniority: 'Director',
        job_function: 'IT',
        job_sector: 'Software',
        country: 'United States',
        state: 'TX',
        city: 'Austin',
        employee_range: '51-200',
      },
      {
        id: 'us-2',
        name: 'US Dallas Contact',
        email: 'dallas@example.com',
        company_name: 'US Company',
        job_title: 'Manager',
        seniority: 'Manager',
        job_function: 'Operations',
        job_sector: 'Software',
        country: 'United States',
        state: 'TX',
        city: 'Dallas',
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
        city: 'Paris',
        employee_range: '201-500',
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
        city: 'Tokyo',
        employee_range: '10001+',
      },
    ]

    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => contacts }) as Response)

    render(<App />)

    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()

    const country = screen.getByPlaceholderText(/search country/i)
    const state = screen.getByPlaceholderText(/select country first/i)
    const city = screen.getByPlaceholderText(/select parent location first/i)

    expect(state).toBeDisabled()
    expect(city).toBeDisabled()

    await user.type(country, 'United States')

    expect(await screen.findByText(/2 of 4 shown/i)).toBeInTheDocument()
    expect(state).toBeEnabled()
    expect(city).toBeDisabled()

    await user.type(state, 'TX')
    expect(city).toBeEnabled()

    await user.type(city, 'Austin')
    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /open us austin contact/i })).toBeInTheDocument()

    await user.clear(country)
    await user.type(country, 'France')

    expect(state).toHaveValue('')
    expect(city).toHaveValue('')
    expect(city).toBeDisabled()
    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()

    await user.type(state, '\u00CEle-de-France')
    await user.type(city, 'Nowhere')

    expect(screen.getByText(/No City results/i)).toBeInTheDocument()
  })

  it('saves the current filter combination as a reusable local list', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.type(screen.getByRole('textbox', { name: /search contacts/i }), 'northstar')
    await user.click(screen.getByRole('button', { name: 'Executive' }))
    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save as list/i }))
    await user.type(screen.getByRole('textbox', { name: /list name/i }), 'Northstar executives')
    await user.click(screen.getByRole('button', { name: /^save list$/i }))

    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    await user.clear(screen.getByRole('textbox', { name: /search contacts/i }))
    expect(await screen.findByText(/4 of 4 shown/i)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /saved lists/i }))

    expect(screen.getByRole('heading', { name: /northstar executives/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('lrm:workspace-10124:saved-lists') ?? '').not.toContain('Northstar executives')
    await waitFor(() => {
      expect(window.localStorage.getItem('lrm:workspace-10124:saved-lists')).toContain('Northstar executives')
    })

    await user.click(screen.getByRole('button', { name: /open northstar executives/i }))

    expect(screen.getByRole('link', { name: /all contacts/i })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('textbox', { name: /search contacts/i })).toHaveValue('northstar')
    expect(screen.getByRole('button', { name: 'Executive' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText(/1 of 4 shown/i)).toBeInTheDocument()
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


  it('saves contact notes tags and status only after Save changes is clicked', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /open maria santos/i }))

    const notes = screen.getByRole('textbox', { name: /notes/i })
    const tags = screen.getByRole('textbox', { name: /tags/i })
    const status = screen.getByRole('combobox', { name: /lead status/i })

    expect(status).toHaveValue('New')

    await user.selectOptions(status, 'Qualified')
    await user.clear(notes)
    await user.type(notes, 'Call after the product demo.')
    await user.clear(tags)
    await user.type(tags, 'priority, demo')

    expect(window.localStorage.getItem('lrm:workspace-10124:contact-annotations') ?? '').not.toContain('Call after the product demo.')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(screen.getByText('Saved')).toBeInTheDocument()
    expect(screen.getByText('priority')).toHaveClass('tag-chip')
    expect(screen.getByText('demo')).toHaveClass('tag-chip')
    await waitFor(() => {
      expect(window.localStorage.getItem('lrm:workspace-10124:contact-annotations')).toContain('Call after the product demo.')
      expect(window.localStorage.getItem('lrm:workspace-10124:contact-annotations')).toContain('Qualified')
    })

    await user.click(screen.getByRole('button', { name: /close contact detail/i }))
    await user.click(screen.getByRole('button', { name: /open maria santos/i }))

    expect(screen.getByRole('textbox', { name: /notes/i })).toHaveValue('Call after the product demo.')
    expect(screen.getByRole('textbox', { name: /tags/i })).toHaveValue('priority, demo')
    expect(screen.getByRole('combobox', { name: /lead status/i })).toHaveValue('Qualified')
  })
  it('opens a complete contact detail drawer with copy actions and no metadata block', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: { writeText },
    })
    window.localStorage.removeItem('lrm:workspace-10124:contact-annotations')

    render(<App />)

    await user.click(screen.getByRole('button', { name: /open maria santos/i }))

    expect(screen.getByRole('dialog', { name: /contact detail/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /maria santos/i })).toBeInTheDocument()
    expect(screen.getAllByText('VP Sales').find((element) => element.classList.contains('drawer-subtitle'))).toBeTruthy()
    expect(screen.getByRole('combobox', { name: /lead status/i })).toHaveValue('New')
    expect(screen.getByRole('link', { name: /email maria santos/i })).toHaveAttribute(
      'href',
      'mailto:maria.santos@example.com',
    )
    expect(screen.getByRole('link', { name: /open linkedin profile for maria santos/i })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/maria-santos',
    )
    expect(screen.getByText('328 (201-500)')).toBeInTheDocument()
    expect(screen.queryByText(/metadata/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /copy email maria.santos@example.com/i }))
    expect(writeText).toHaveBeenCalledWith('maria.santos@example.com')

    await user.click(within(screen.getByRole('dialog', { name: /contact detail/i })).getByRole('button', { name: /copy phone number \+1 555 0100/i }))
    expect(writeText).toHaveBeenCalledWith('+1 555 0100')
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
  })

  it('opens same-company related contacts inside the contact detail drawer', async () => {
    const user = userEvent.setup()
    const contacts = [
      {
        id: 'related-001',
        name: 'Avery Chen',
        email: 'avery@example.com',
        company_name: 'Northstar Labs',
        job_title: 'Revenue Lead',
        seniority: 'Lead',
        job_function: 'Sales',
        job_sector: 'Software',
        mobile_phone: '+1 555 0190',
        executive_linkedin_profile: 'https://linkedin.com/in/avery-chen',
        employees: '328',
        employee_range: '201-500',
        city: 'Austin',
        state: 'TX',
        country: 'United States',
      },
      {
        id: 'related-002',
        name: 'Blake Rivera',
        email: 'blake@example.com',
        company_name: 'Northstar Labs',
        job_title: 'Account Director',
        seniority: 'Director',
        job_function: 'Sales',
        job_sector: 'Software',
        city: 'Austin',
        state: 'TX',
        country: 'United States',
      },
    ]

    vi.stubGlobal('fetch', async () => ({ ok: true, json: async () => contacts }) as Response)

    render(<App />)

    expect(await screen.findByText(/2 of 2 shown/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /open avery chen/i }))

    const relatedButton = screen.getByRole('button', { name: /open related contact blake rivera/i })
    expect(relatedButton).toHaveClass('related-contact-button')

    await user.click(relatedButton)

    expect(screen.getByRole('heading', { name: /blake rivera/i })).toBeInTheDocument()
    expect(screen.getAllByText('Account Director').find((element) => element.classList.contains('drawer-subtitle'))).toBeTruthy()
  })
})
