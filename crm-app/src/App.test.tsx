import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
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
    expect(screen.getByText(/1,204 of 47,613 shown/i)).toBeInTheDocument()
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
