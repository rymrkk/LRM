export type ContactRecord = {
  id: string
  name: string
  short_name?: string
  job_title?: string
  seniority?: string
  job_function?: string
  job_function_2?: string
  job_sector?: string
  email?: string
  desk_phone?: string
  desk_phone_ext?: string
  corporate_phone?: string
  mobile_phone?: string
  executive_linkedin_profile?: string
  company_name?: string
  employees?: string
  employee_range?: string
  street?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  executive_street?: string
  executive_city?: string
  executive_area?: string
  executive_state?: string
  executive_postal_code?: string
  executive_country_code?: string
  recordPath?: string
  sources?: string
  data_source?: string
}

export type ContactColumnKey = keyof ContactRecord | 'best_phone'

export type ContactNote = {
  workspace_id: string
  contact_id: string
  notes: string
  tags: string[]
  updated_at?: string
}

export type CompanySummary = {
  company_name: string
  contact_count: number
  countries: string[]
  employee_range?: string
  contacts: ContactRecord[]
}
