import {
  Building2,
  Columns3,
  Database,
  Filter,
  ListChecks,
  Search,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react'
import {
  APP_NAME,
  DEFAULT_VISIBLE_COLUMNS,
  FILTER_KEYS,
  INITIAL_EXPECTED_ROW_COUNT,
} from './lib/constants'

function App() {
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

        <nav className="nav-list">
          <a className="nav-item active" href="#contacts">
            <Users size={18} aria-hidden="true" />
            All Contacts
          </a>
          <a className="nav-item" href="#companies">
            <Building2 size={18} aria-hidden="true" />
            Companies
          </a>
          <a className="nav-item" href="#saved-lists">
            <ListChecks size={18} aria-hidden="true" />
            Saved Lists
          </a>
        </nav>

        <section className="workspace-panel" aria-labelledby="workspace-title">
          <p className="eyebrow">Active workspace</p>
          <h2 id="workspace-title">10124 Users</h2>
          <p>{INITIAL_EXPECTED_ROW_COUNT.toLocaleString()} cleaned contacts ready for import.</p>
          <button className="primary-action" type="button">
            <Upload size={16} aria-hidden="true" />
            Upload CSV
          </button>
        </section>
      </aside>

      <section className="content" aria-label="Contacts workspace">
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
            <p className="metric-value">{INITIAL_EXPECTED_ROW_COUNT.toLocaleString()}</p>
            <p className="metric-label">trusted contacts</p>
          </div>
          <div>
            <p className="metric-value">{FILTER_KEYS.length}</p>
            <p className="metric-label">filter groups</p>
          </div>
          <div>
            <p className="metric-value">{DEFAULT_VISIBLE_COLUMNS.length}</p>
            <p className="metric-label">default columns</p>
          </div>
          <div>
            <p className="metric-value">1</p>
            <p className="metric-label">CSV per workspace</p>
          </div>
        </section>

        <section className="workbench">
          <div className="filter-panel">
            <div className="section-title">
              <Filter size={18} aria-hidden="true" />
              <h2>Filters</h2>
            </div>
            <div className="filter-list">
              {FILTER_KEYS.map((filter) => (
                <button className="filter-chip" type="button" key={filter}>
                  {filter.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
            <button className="save-list-button" type="button">
              <ListChecks size={16} aria-hidden="true" />
              Save as list
            </button>
          </div>

          <div className="table-surface" id="contacts">
            <div className="table-header">
              <div>
                <p className="eyebrow">All Contacts</p>
                <h2>1,204 of {INITIAL_EXPECTED_ROW_COUNT.toLocaleString()} shown</h2>
              </div>
              <p>Virtualized table, Supabase workspace storage, and browser filtering are next.</p>
            </div>
            <div className="mock-table" role="table" aria-label="Contacts preview">
              <div className="mock-row mock-head" role="row">
                {DEFAULT_VISIBLE_COLUMNS.map((column) => (
                  <span role="columnheader" key={column}>
                    {column.replaceAll('_', ' ')}
                  </span>
                ))}
              </div>
              {['Maria Santos', 'Jordan Lee', 'Priya Nair', 'Evan Morgan'].map((name, index) => (
                <div className="mock-row" role="row" key={name}>
                  <span>{name}</span>
                  <span>{['VP Sales', 'Director, IT', 'Head of Ops', 'Founder'][index]}</span>
                  <span>{['Executive', 'Director', 'Head', 'Founder'][index]}</span>
                  <span>{['Northstar Labs', 'BrightLayer', 'Signal Forge', 'Atlas Desk'][index]}</span>
                  <span>{name.toLowerCase().replace(' ', '.')}@example.com</span>
                  <span>+1 555 010{index}</span>
                  <span>{['Austin', 'Seattle', 'Boston', 'Denver'][index]}</span>
                  <span>United States</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="detail-drawer" aria-label="Contact detail preview">
            <div className="section-title">
              <Database size={18} aria-hidden="true" />
              <h2>Contact Detail</h2>
            </div>
            <p>Grouped contact, company, address, and metadata fields will appear here on row click.</p>
            <div className="detail-block">
              <p className="eyebrow">Persistence</p>
              <p>Notes, tags, saved lists, and column preferences are scoped by workspace.</p>
            </div>
            <div className="detail-block">
              <p className="eyebrow">Security</p>
              <p className="inline-note">
                <ShieldCheck size={16} aria-hidden="true" />
                Supabase Auth and RLS protect CSV workspaces.
              </p>
            </div>
          </aside>
        </section>
      </section>
    </main>
  )
}

export default App
