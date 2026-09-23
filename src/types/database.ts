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

export type Vehicle = {
  id: string
  client_id: string
  registration: string
  type: string | null
  created_at: string
}

export type Driver = {
  id: string
  client_id: string
  name: string
  created_at: string
}

export type Visit = {
  id: string
  client_id: string
  date: string
  notes: string | null
  created_at: string
}

export type InfringementCategory =
  | 'Driver Hours & Tachograph'
  | 'Vehicle Roadworthiness & Maintenance'
  | 'Operational Loading & Weight'
  | 'Licence & Operator Infrastructure'

export type Infringement = {
  id: string
  client_id: string
  category: InfringementCategory
  type: string
  driver_id: string | null
  vehicle_id: string | null
  date: string
  notes: string | null
  resolved: boolean
  created_at: string
}

export type DocParentType = 'vehicle' | 'driver' | 'visit' | 'client'
export type DocType =
  | 'PMI'
  | 'Brake test'
  | 'MOT'
  | 'VED'
  | 'Insurance'
  | 'Licence check'
  | 'CPC'
  | 'Infringement report'
  | 'Depot visit note'
  | 'Other'

export type Document = {
  id: string
  client_id: string
  parent_type: DocParentType
  parent_id: string
  doc_type: DocType
  file_path: string | null
  expiry_date: string | null
  reminder_days_before: number | null
  uploaded_at: string
}

export type TodoSourceType = 'document' | 'infringement'
export type TodoStatus = 'open' | 'resolved'

export type Todo = {
  id: string
  client_id: string
  source_type: TodoSourceType
  source_id: string
  description: string
  status: TodoStatus
  snoozed_until: string | null
  created_at: string
  resolved_at: string | null
}

export type EmailChaseScope = 'single_todo' | 'all_outstanding'

export type EmailChase = {
  id: string
  client_id: string
  scope: EmailChaseScope
  todo_id: string | null
  recipients: string[]
  subject: string
  body: string
  sent_at: string
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
      vehicles: {
        Row: Vehicle
        Insert: Partial<Vehicle> & Pick<Vehicle, 'client_id' | 'registration'>
        Update: Partial<Vehicle>
        Relationships: []
      }
      drivers: {
        Row: Driver
        Insert: Partial<Driver> & Pick<Driver, 'client_id' | 'name'>
        Update: Partial<Driver>
        Relationships: []
      }
      visits: {
        Row: Visit
        Insert: Partial<Visit> & Pick<Visit, 'client_id' | 'date'>
        Update: Partial<Visit>
        Relationships: []
      }
      infringements: {
        Row: Infringement
        Insert: Partial<Infringement> &
          Pick<Infringement, 'client_id' | 'category' | 'type' | 'date'>
        Update: Partial<Infringement>
        Relationships: []
      }
      documents: {
        Row: Document
        Insert: Partial<Document> &
          Pick<Document, 'client_id' | 'parent_type' | 'parent_id' | 'doc_type'>
        Update: Partial<Document>
        Relationships: []
      }
      todos: {
        Row: Todo
        Insert: Partial<Todo> &
          Pick<Todo, 'client_id' | 'source_type' | 'source_id' | 'description'>
        Update: Partial<Todo>
        Relationships: []
      }
      email_chases: {
        Row: EmailChase
        Insert: Partial<EmailChase> & Pick<EmailChase, 'client_id' | 'scope' | 'subject' | 'body'>
        Update: Partial<EmailChase>
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
    Functions: {
      reconcile_todos: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
  }
}
