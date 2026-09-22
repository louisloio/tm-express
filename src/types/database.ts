export type OnboardingStatus = 'In Progress' | 'Approved'

export type Client = {
  id: string
  user_id: string
  company_name: string
  ol_number: string | null
  address: string | null
  operating_centre: string | null
  onboarding_status: OnboardingStatus
  created_at: string
}

export type ClientContact = {
  id: string
  client_id: string
  name: string | null
  email: string
  created_at: string
}

export type VolOperator = {
  licence_number: string
  geographic_region: string | null
  licence_type: string | null
  operator_name: string
  operator_type: string | null
  correspondence_address: string | null
  oc_address: string | null
  transport_manager: string | null
  vehicles_authorised: number | null
  trailers_authorised: number | null
  vehicles_specified: number | null
  trailers_specified: number | null
  director_or_partner: string | null
  licence_status: string | null
  continuation_date: string | null
  company_reg_number: string | null
  updated_at: string
}

// Minimal Supabase Database type — only the tables the app queries through
// the typed client today. Extend as more of the schema gets wired up.
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: Client
        Insert: Partial<Client> &
          Pick<Client, 'company_name'> & { user_id?: string }
        Update: Partial<Client>
        Relationships: []
      }
      client_contacts: {
        Row: ClientContact
        Insert: Partial<ClientContact> & Pick<ClientContact, 'client_id' | 'email'>
        Update: Partial<ClientContact>
        Relationships: []
      }
      vol_operators: {
        Row: VolOperator
        Insert: Partial<VolOperator> & Pick<VolOperator, 'licence_number' | 'operator_name'>
        Update: Partial<VolOperator>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
