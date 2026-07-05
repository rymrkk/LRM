import { useMemo, useState } from 'react'
import {
  Building2,
  Columns3,
  Filter,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Search,
  SlidersHorizontal,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  APP_NAME,
  DEFAULT_VISIBLE_COLUMNS,
  EMPTY_FILTERS,
  FILTER_KEYS,
  INITIAL_EXPECTED_ROW_COUNT,
  OPTIONAL_COLUMNS,
} from './lib/constants'
import type { CompanySummary, ContactColumnKey, ContactRecord } from './types/contact'
import type { FilterKey, SavedList } from './types/workspace'

type ViewKey = 'contacts' | 'companies' | 'saved-lists'

type NavItem = {
  key: ViewKey
  label: string
  icon: typeof Users
}

const NAV_ITEMS: NavItem[] = [
  { key: 'contacts', label: 'All Contacts', icon: Users },
  { key: 'companies', label: 'Companies', icon: Building2 },
  { key: 'saved-lists', label: 'Saved Lists', icon: ListChecks },
]

const FILTER_OPTIONS: Record<FilterKey, string[]> = {
  seniority: ['Executive', 'Director', 'Head', 'Founder'],
  job_function: ['Sales', 'IT', 'Operations', 'Leadership'],
  job_sector: ['Software', 'Consulting', 'Data Services'],
  country: ['United States', 'Canada', 'Singapore'],
  state: ['TX', 'WA', 'MA', 'CO'],
  employee_range: ['51-200', '201-500', '501-1000'],
}

const CONTACTS: ContactRecord[] = [
  {
    id: 'lead-001',
    name: 'Maria Santos',
    job_title: 'VP Sales',
    seniority: 'Executive',
    job_function: 'Sales',
    job_sector: 'Software',
    email: 'maria.santos@example.com',
    mobile_phone: '+1 555 0100',
    executive_linkedin_profile: 'https://linkedin.com/in/maria-santos',
    company_name: 'Northstar Labs',
    employees: '328',
    employee_range: '201-500',
    street: '1200 Congress Ave',
    city: 'Austin',
    state: 'TX',
    country: 'United States',
    postal_code: '78701',
    recordPath: '10124-users.cleaned.csv:124',
    sources: 'LinkedIn, company website',
    data_source: 'cleaned CSV',
  },
  {
    id: 'lead-002',
    name: 'Jordan Lee',
    job_title: 'Director, IT',
    seniority: 'Director',
    job_function: 'IT',
    job_sector: 'Consulting',
    email: 'jordan.lee@example.com',
    desk_phone: '+1 555 0101',
    company_name: 'BrightLayer',
    employees: '190',
    employee_range: '51-200',
    city: 'Seattle',
    state: 'WA',
    country: 'United States',
    postal_code: '98101',
    recordPath: '10124-users.cleaned.csv:511',
    sources: 'Event list',
    data_source: 'cleaned CSV',
  },
  {
    id: 'lead-003',
    name: 'Priya Nair',
    job_title: 'Head of Ops',
    seniority: 'Head',
    job_function: 'Operations',
    job_sector: 'Data Services',
    email: 'priya.nair@example.com',
    corporate_phone: '+1 555 0102',
    company_name: 'Signal Forge',
    employees: '870',
    employee_range: '501-1000',
    city: 'Boston',
    state: 'MA',
    country: 'United States',
    postal_code: '02108',
    recordPath: '10124-users.cleaned.csv:902',
    sources: 'Partner export',
    data_source: 'cleaned CSV',
  },
  {
    id: 'lead-004',
    name: 'Evan Morgan',
    job_title: 'Founder',
    seniority: 'Founder',
    job_function: 'Leadership',
    job_sector: 'Software',
    email: 'evan.morgan@example.com',
    mobile_phone: '+1 555 0103',
    company_name: 'Atlas Desk',
    employees: '74',
    employee_range: '51-200',
    city: 'Denver',
    state: 'CO',
    country: 'United States',
    postal_code: '80202',
    recordPath: '10124-users.cleaned.csv:1118',
    sources: 'Founder list',
    data_source: 'cleaned CSV',
  },
]

const SAVED_LISTS: SavedList[] = [
  {
    id: 'list-001',
    workspace_id: 'workspace-10124',
    user_id: 'single-user',
    name: 'Executive Contacts',
    filters_json: { ...EMPTY_FILTERS, seniority: ['Executive', 'Founder'] },
    search_query: 'vp OR founder',
    created_at: '2026-07-06T08:00:00Z',
    updated_at: '2026-07-06T08:00:00Z',
  },
  {
    id: 'list-002',
    workspace_id: 'workspace-10124',
    user_id: 'single-user',
    name: 'US Software Leads',
    filters_json: { ...EMPTY_FILTERS, country: ['United States'], job_sector: ['Software'] },
    search_query: 'software',
    created_at: '2026-07-06T08:20:00Z',
    updated_at: '2026-07-06T08:20:00Z',
  },
]

const COLUMN_LABELS: Partial<Record<ContactColumnKey, string>> = {
  name: 'Name',
  job_title: 'Job title',
  seniority: 'Seniority',
  company_name: 'Company',
  email: 'Email',
  best_phone: 'Best phone',
  city: 'City',
  country: 'Country',
  job_function: 'Job function',
  job_sector: 'Job sector',
  employees: 'Employees',
  employee_range: 'Employee range',
  state: 'State',
  postal_code: 'Postal code',
  executive_linkedin_profile: 'LinkedIn profile',
  sources: 'Sources',
}

function labelForColumn(column: ContactColumnKey) {
  return COLUMN_LABELS[column] ?? column.replaceAll('_', ' ')
}

function getBestPhone(contact: ContactRecord) {
  return contact.mobile_phone || contact.desk_phone || contact.corporate_phone || ''
}

function getColumnValue(contact: ContactRecord, column: ContactColumnKey) {
  if (column === 'best_phone') {
    return getBestPhone(contact)
  }

  return contact[column] ?? ''
}

function buildCompanySummaries(contacts: ContactRecord[]): CompanySummary[] {
  const companies = new Map<string, ContactRecord[]>()

  contacts.forEach((contact) => {
    const companyName = contact.company_name || 'Unknown company'
    companies.set(companyName, [...(companies.get(companyName) ?? []), contact])
  })

  return Array.from(companies.entries()).map(([company_name, contactsForCompany]) => ({
    company_name,
    contact_count: contactsForCompany.length,
    contacts: contactsForCompany,
    countries: Array.from(new Set(contactsForCompany.map((contact) => contact.country).filter(Boolean) as string[])),
    employee_range: contactsForCompany.find((contact) => contact.employee_range)?.employee_range,
  }))
}

function App() {
  const [activeView, setActiveView] = useState<ViewKey>('contacts')
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null)
  const companies = useMemo(() => buildCompanySummaries(CONTACTS), [])

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="brand-mark">LRM</div>
          <div>
            <p className="eyebrow">Workspace CRM</p>
            <h1>{APP_NAME}</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="CRM views">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.key

            return (
              <a
                aria-current={isActive ? 'page' : undefined}
                className={`nav-item ${isActive ? 'active' : ''}`}
                href={`#${item.key}`}
                key={item.key}
                onClick={(event) => {
                  event.preventDefault()
                  setActiveView(item.key)
                }}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </a>
            )
          })}
        </nav>

        <section className="workspace-panel" aria-labelledby="workspace-title">
          <p className="eyebrow">Active workspace</p>
          <h2 id="workspace-title">10124 Users</h2>
          <label className="workspace-select-control">
            <span className="field-label">Workspace</span>
            <select className="workspace-select" defaultValue="10124 Users" aria-label="Workspace">
              <option>10124 Users</option>
              <option>North America prospects</option>
              <option>Partner leads import</option>
            </select>
          </label>
          <p>{INITIAL_EXPECTED_ROW_COUNT.toLocaleString()} cleaned contacts ready for import.</p>
          <div className="workspace-actions">
            <button className="secondary-action" type="button">
              <UserPlus size={16} aria-hidden="true" />
              Create workspace
            </button>
            <button className="primary-action" type="button">
              <Upload size={16} aria-hidden="true" />
              Upload CSV
            </button>
          </div>
        </section>
      </aside>

      <section className="content" aria-label="CRM workspace">
        <header className="topbar">
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search contacts</span>
            <input placeholder="Search name, email, or company" />
          </label>
          <button className="secondary-action" type="button">
            <Columns3 size={16} aria-hidden="true" />
            Columns
          </button>
        </header>

        <section className="summary-strip" aria-label="Workspace summary">
          <div>
            <p className="metric-value">1,204</p>
            <p className="metric-label">currently shown</p>
          </div>
          <div>
            <p className="metric-value">{INITIAL_EXPECTED_ROW_COUNT.toLocaleString()}</p>
            <p className="metric-label">trusted contacts</p>
          </div>
          <div>
            <p className="metric-value">{FILTER_KEYS.length}</p>
            <p className="metric-label">filter groups</p>
          </div>
          <div>
            <p className="metric-value">{DEFAULT_VISIBLE_COLUMNS.length}</p>
            <p className="metric-label">visible columns</p>
          </div>
        </section>

        {activeView === 'contacts' && <ContactsPage onOpenContact={setSelectedContact} />}
        {activeView === 'companies' && <CompaniesPage companies={companies} />}
        {activeView === 'saved-lists' && <SavedListsPage savedLists={SAVED_LISTS} />}
      </section>

      {selectedContact && <ContactDetailDrawer contact={selectedContact} onClose={() => setSelectedContact(null)} />}
    </main>
  )
}

type ContactsPageProps = {
  onOpenContact: (contact: ContactRecord) => void
}

function ContactsPage({ onOpenContact }: ContactsPageProps) {
  return (
    <section className="workbench" id="contacts" aria-label="All contacts workspace">
      <section className="filter-panel" aria-label="Filters">
        <div className="section-title">
          <Filter size={18} aria-hidden="true" />
          <h2>Filters</h2>
        </div>
        <p className="panel-copy">OR inside each group, AND across groups.</p>
        <div className="filter-stack">
          {FILTER_KEYS.map((filter) => (
            <div className="filter-group" key={filter}>
              <p className="filter-label">{labelForColumn(filter)}</p>
              <div className="filter-list">
                {FILTER_OPTIONS[filter].slice(0, 3).map((option) => (
                  <button className="filter-chip" type="button" key={option}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="save-list-button" type="button">
          <ListChecks size={16} aria-hidden="true" />
          Save as list
        </button>
      </section>

      <section className="table-surface">
        <div className="table-header">
          <div>
            <p className="eyebrow">All Contacts</p>
            <h2>1,204 of {INITIAL_EXPECTED_ROW_COUNT.toLocaleString()} shown</h2>
          </div>
          <p>Virtualized rows will mount here when the CSV data engine is connected.</p>
        </div>
        <div className="mock-table" role="table" aria-label="All Contacts">
          <div className="mock-row mock-head" role="row">
            {DEFAULT_VISIBLE_COLUMNS.map((column) => (
              <span role="columnheader" key={column}>
                {labelForColumn(column)}
              </span>
            ))}
          </div>
          {CONTACTS.map((contact) => (
            <div className="mock-row" role="row" key={contact.id}>
              {DEFAULT_VISIBLE_COLUMNS.map((column) => (
                <span role="cell" key={column}>
                  {column === 'name' ? (
                    <button className="contact-row-button" type="button" onClick={() => onOpenContact(contact)}>
                      <span>{contact.name}</span>
                      <span className="sr-only">Open {contact.name}</span>
                    </button>
                  ) : (
                    getColumnValue(contact, column)
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <fieldset className="detail-drawer column-picker">
        <legend>Column picker</legend>
        <div className="section-title">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <h2>Visible fields</h2>
        </div>
        <p className="panel-copy">Preferences will persist by workspace after the storage layer lands.</p>
        <div className="column-list">
          {[...DEFAULT_VISIBLE_COLUMNS, ...OPTIONAL_COLUMNS].map((column) => (
            <label className="check-row" key={column}>
              <input defaultChecked={DEFAULT_VISIBLE_COLUMNS.includes(column)} type="checkbox" />
              <span>{labelForColumn(column)}</span>
            </label>
          ))}
        </div>
        <button className="secondary-action" type="button">
          Reset columns
        </button>
      </fieldset>
    </section>
  )
}

type CompaniesPageProps = {
  companies: CompanySummary[]
}

function CompaniesPage({ companies }: CompaniesPageProps) {
  return (
    <section className="view-shell" id="companies" aria-labelledby="companies-title">
      <div className="table-header view-header">
        <div>
          <p className="eyebrow">Companies</p>
          <h2 id="companies-title">Companies</h2>
        </div>
        <p>Contacts grouped by company name, with country and employee-range summaries.</p>
      </div>
      <div className="mock-table" role="table" aria-label="Companies">
        <div className="mock-row company-row mock-head" role="row">
          <span role="columnheader">Company</span>
          <span role="columnheader">Contacts</span>
          <span role="columnheader">Countries</span>
          <span role="columnheader">Employee range</span>
        </div>
        {companies.map((company) => (
          <div className="mock-row company-row" role="row" key={company.company_name}>
            <span role="cell">{company.company_name}</span>
            <span role="cell">{company.contact_count}</span>
            <span role="cell">{company.countries.join(', ')}</span>
            <span role="cell">{company.employee_range}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

type SavedListsPageProps = {
  savedLists: SavedList[]
}

function SavedListsPage({ savedLists }: SavedListsPageProps) {
  return (
    <section className="view-shell" id="saved-lists" aria-labelledby="saved-lists-title">
      <div className="table-header view-header">
        <div>
          <p className="eyebrow">Saved Lists</p>
          <h2 id="saved-lists-title">Saved Lists</h2>
        </div>
        <p>Each saved list applies search and filter state within the active workspace.</p>
      </div>
      <div className="saved-list-grid">
        {savedLists.map((list) => {
          const activeFilterCount = Object.values(list.filters_json).filter((values) => values.length > 0).length

          return (
            <article className="saved-list-card" key={list.id}>
              <div>
                <h3>{list.name}</h3>
                <p>{activeFilterCount} filter groups, search query "{list.search_query}"</p>
              </div>
              <button className="secondary-action" type="button">
                Open {list.name}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

type ContactDetailDrawerProps = {
  contact: ContactRecord
  onClose: () => void
}

function ContactDetailDrawer({ contact, onClose }: ContactDetailDrawerProps) {
  return (
    <aside className="detail-drawer drawer-open" role="dialog" aria-label="Contact detail" aria-modal="false">
      <div className="drawer-header">
        <div>
          <p className="eyebrow">Contact Detail</p>
          <h2>{contact.name}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close contact detail" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-block">
        <p className="eyebrow">Contact</p>
        <div className="link-list">
          {contact.email && (
            <a aria-label={`Email ${contact.name}`} href={`mailto:${contact.email}`}>
              <Mail size={16} aria-hidden="true" />
              {contact.email}
            </a>
          )}
          {getBestPhone(contact) && (
            <a href={`tel:${getBestPhone(contact).replaceAll(' ', '')}`}>
              <Phone size={16} aria-hidden="true" />
              {getBestPhone(contact)}
            </a>
          )}
        </div>
      </div>

      <div className="detail-block">
        <p className="eyebrow">Company</p>
        <p>{contact.company_name}</p>
        <p>{contact.job_title} / {contact.job_function} / {contact.employee_range}</p>
      </div>

      <div className="detail-block">
        <p className="eyebrow">Address</p>
        <p className="inline-note">
          <MapPin size={16} aria-hidden="true" />
          {[contact.street, contact.city, contact.state, contact.postal_code, contact.country].filter(Boolean).join(', ')}
        </p>
      </div>

      <div className="detail-block">
        <p className="eyebrow">Metadata</p>
        <p>ID: {contact.id}</p>
        <p>Sources: {contact.sources}</p>
        <p>Record path: {contact.recordPath}</p>
      </div>

      <div className="detail-block drawer-fields">
        <label className="field-stack">
          <span>Notes</span>
          <textarea defaultValue="Follow up after workspace persistence is connected." rows={4} />
        </label>
        <label className="field-stack">
          <span>Tags</span>
          <input defaultValue="priority, sales" />
        </label>
      </div>
    </aside>
  )
}

export default App
