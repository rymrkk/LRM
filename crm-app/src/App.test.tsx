import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

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
})
