import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AddDriverDialog } from '../components/AddDriverDialog'
import { AddInfringementDialog } from '../components/AddInfringementDialog'
import { AddVehicleDialog } from '../components/AddVehicleDialog'
import { AddVisitDialog } from '../components/AddVisitDialog'
import { DocumentRow } from '../components/company/DocumentRow'
import { DriverRow } from '../components/company/DriverRow'
import { InfringementRow } from '../components/company/InfringementRow'
import { LastVisitRow } from '../components/company/LastVisitRow'
import { TodoRow } from '../components/company/TodoRow'
import { VehicleRow } from '../components/company/VehicleRow'
import { EditClientDialog } from '../components/EditClientDialog'
import { EmailChaseModal } from '../components/EmailChaseModal'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { OnboardingBadge } from '../components/OnboardingBadge'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { latestDocsByParent } from '../lib/documents'
import { supabase } from '../lib/supabase'
import { fetchOpenTodos, reconcileTodos, resolveTodoTargets } from '../lib/todos'
import type {
  Client,
  ClientContact,
  Document,
  Driver,
  Infringement,
  Todo,
  Vehicle,
  Visit,
} from '../types/database'

interface CompanyData {
  client: Client
  contacts: ClientContact[]
  vehicles: Vehicle[]
  drivers: Driver[]
  latestVisit: Visit | null
  infringements: Infringement[]
  documents: Document[]
  todos: Todo[]
  todoTargets: Map<string, { href: string }>
}

type DialogState =
  | { type: 'client-edit' }
  | { type: 'vehicle'; vehicle?: Vehicle }
  | { type: 'driver'; driver?: Driver }
  | { type: 'visit'; visit?: Visit }
  | { type: 'infringement'; infringement?: Infringement }
  | { type: 'chase-single'; todo: Todo }
  | { type: 'chase-all' }
  | null

export function CompanyPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [todoWarning, setTodoWarning] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  const load = useCallback(async () => {
    if (!clientId) return
    setLoading(true)

    try {
      await reconcileTodos()
      setTodoWarning(null)
    } catch (err) {
      // Non-fatal — the rest of the page still works with whatever todos
      // already exist, but surface it: a silent failure here means new
      // todos quietly stop appearing, which is easy to miss otherwise.
      setTodoWarning(
        err instanceof Error ? `Todo sync failed: ${err.message}` : 'Todo sync failed.',
      )
    }

    const [clientRes, contactsRes, vehiclesRes, driversRes, visitsRes, infringementsRes, documentsRes, todos] =
      await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).is('archived_at', null).maybeSingle(),
        supabase.from('client_contacts').select('*').eq('client_id', clientId),
        supabase
          .from('vehicles')
          .select('*')
          .eq('client_id', clientId)
          .is('archived_at', null)
          .order('registration'),
        supabase
          .from('drivers')
          .select('*')
          .eq('client_id', clientId)
          .is('archived_at', null)
          .order('name'),
        supabase
          .from('visits')
          .select('*')
          .eq('client_id', clientId)
          .is('archived_at', null)
          .order('date', { ascending: false })
          .limit(1),
        supabase
          .from('infringements')
          .select('*')
          .eq('client_id', clientId)
          .is('archived_at', null)
          .order('date', { ascending: false }),
        supabase
          .from('documents')
          .select('*')
          .eq('client_id', clientId)
          .is('archived_at', null)
          .order('uploaded_at', { ascending: false }),
        fetchOpenTodos(clientId),
      ])

    const firstError = [
      clientRes.error,
      contactsRes.error,
      vehiclesRes.error,
      driversRes.error,
      visitsRes.error,
      infringementsRes.error,
      documentsRes.error,
    ].find(Boolean)

    if (firstError || !clientRes.data) {
      setError(firstError?.message ?? 'Client not found.')
      setLoading(false)
      return
    }

    const todoTargets = resolveTodoTargets(todos)

    setData({
      client: clientRes.data,
      contacts: contactsRes.data ?? [],
      vehicles: vehiclesRes.data ?? [],
      drivers: driversRes.data ?? [],
      latestVisit: visitsRes.data?.[0] ?? null,
      infringements: infringementsRes.data ?? [],
      documents: documentsRes.data ?? [],
      todos,
      todoTargets,
    })
    setError(null)
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleArchiveClient() {
    if (!clientId) return
    await archiveRow('clients', clientId)
    navigate('/')
  }

  async function handleArchiveVehicle(id: string) {
    await archiveRow('vehicles', id)
    void load()
  }

  async function handleArchiveDriver(id: string) {
    await archiveRow('drivers', id)
    void load()
  }

  async function handleArchiveVisit(id: string) {
    await archiveRow('visits', id)
    void load()
  }

  async function handleArchiveInfringement(id: string) {
    await archiveRow('infringements', id)
    void load()
  }

  async function handleArchiveDocument(id: string) {
    await archiveRow('documents', id)
    void load()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <p className="px-6 py-8 text-[14px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <div className="px-6 py-8">
          <p className="text-[14px] text-danger-text">{error ?? 'Client not found.'}</p>
          <Link to="/" className="mt-2 inline-block text-[14px] font-medium text-[#0060e3]">
            Back to clients
          </Link>
        </div>
      </div>
    )
  }

  const { client, contacts, vehicles, drivers, latestVisit, infringements, documents, todos, todoTargets } =
    data

  const vehicleDocs = latestDocsByParent(documents.filter((d) => d.parent_type === 'vehicle'))
  const driverDocs = latestDocsByParent(documents.filter((d) => d.parent_type === 'driver'))
  const documentTodos = todos.filter((t) => t.source_type === 'document')

  const vehiclesById = new Map(vehicles.map((v) => [v.id, v]))
  const driversById = new Map(drivers.map((d) => [d.id, d]))

  const infringementCountByDriver = new Map<string, number>()
  for (const inf of infringements) {
    if (inf.driver_id) {
      infringementCountByDriver.set(
        inf.driver_id,
        (infringementCountByDriver.get(inf.driver_id) ?? 0) + 1,
      )
    }
  }

  function linkedToLabel(inf: Infringement) {
    const parts: string[] = []
    if (inf.driver_id) parts.push(driversById.get(inf.driver_id)?.name ?? 'Unknown driver')
    if (inf.vehicle_id) parts.push(vehiclesById.get(inf.vehicle_id)?.registration ?? 'Unknown vehicle')
    return parts.length > 0 ? parts.join(' · ') : client.company_name
  }

  function parentLabel(doc: Document) {
    if (doc.parent_type === 'vehicle') return vehiclesById.get(doc.parent_id)?.registration ?? 'Vehicle'
    if (doc.parent_type === 'driver') return driversById.get(doc.parent_id)?.name ?? 'Driver'
    if (doc.parent_type === 'client') return client.company_name
    return 'Visit'
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />
      <TopSubPage
        backTo="/"
        title={client.company_name}
        onEdit={() => setDialog({ type: 'client-edit' })}
        onArchive={handleArchiveClient}
        archiveLabel="Archive client"
        extraAction={
          documentTodos.length > 0
            ? { label: 'Chase all outstanding', onClick: () => setDialog({ type: 'chase-all' }) }
            : undefined
        }
      />

      <div className="mx-auto w-full max-w-[600px] flex-1">
        {/* CompanyDetails */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">OL number</span>
            <span className="text-[14px] font-medium text-text-primary">
              {client.ol_number ?? '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Contact(s)</span>
            {contacts.length > 0 ? (
              contacts.map((c) => (
                <a
                  key={c.id}
                  href={`mailto:${c.email}`}
                  title={c.email}
                  className="block truncate text-[14px] font-medium text-[#0060e3]"
                >
                  {c.email}
                </a>
              ))
            ) : (
              <span className="text-[14px] font-medium text-text-primary">—</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Onboarding status</span>
            <OnboardingBadge status={client.onboarding_status} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Vehicles</span>
            <span className="text-[14px] font-medium text-text-primary">{vehicles.length}</span>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Transport manager</span>
            <span className="text-[14px] font-medium text-text-primary">
              {client.transport_manager ?? '—'}
            </span>
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Operating centre</span>
            <span className="text-[14px] font-medium text-text-primary">
              {client.operating_centre ?? '—'}
            </span>
          </div>
        </div>

        {/* Todo */}
        <SectionTitle title={`Todo (${todos.length})`} />
        {todoWarning && <p className="px-6 pb-2 text-[14px] text-danger-text">{todoWarning}</p>}
        {todos.length === 0 ? (
          <p className="px-6 pb-4 text-[14px] text-text-secondary">No open items.</p>
        ) : (
          todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              href={todoTargets.get(todo.id)?.href ?? `/clients/${client.id}`}
              onOpenChase={(t) => setDialog({ type: 'chase-single', todo: t })}
            />
          ))
        )}

        {/* Vehicles */}
        <SectionTitle
          title={`Vehicles (${vehicles.length})`}
          addLabel="Add vehicle"
          onAdd={() => setDialog({ type: 'vehicle' })}
        />
        {vehicles.length === 0 ? (
          <p className="px-6 pb-4 text-[14px] text-text-secondary">No vehicles yet.</p>
        ) : (
          vehicles.map((v) => (
            <VehicleRow
              key={v.id}
              clientId={client.id}
              vehicle={v}
              docsByType={vehicleDocs.get(v.id) ?? new Map()}
              onEdit={() => setDialog({ type: 'vehicle', vehicle: v })}
              onArchive={() => handleArchiveVehicle(v.id)}
            />
          ))
        )}

        {/* Drivers */}
        <SectionTitle
          title={`Drivers (${drivers.length})`}
          addLabel="Add driver"
          onAdd={() => setDialog({ type: 'driver' })}
        />
        {drivers.length === 0 ? (
          <p className="px-6 pb-4 text-[14px] text-text-secondary">No drivers yet.</p>
        ) : (
          drivers.map((d) => (
            <DriverRow
              key={d.id}
              clientId={client.id}
              driver={d}
              docsByType={driverDocs.get(d.id) ?? new Map()}
              infringementCount={infringementCountByDriver.get(d.id) ?? 0}
              onEdit={() => setDialog({ type: 'driver', driver: d })}
              onArchive={() => handleArchiveDriver(d.id)}
            />
          ))
        )}

        {/* Last Visit */}
        <SectionTitle
          title="Last Visit"
          addLabel="Log a visit"
          onAdd={() => setDialog({ type: 'visit' })}
        />
        {latestVisit ? (
          <LastVisitRow
            clientId={client.id}
            visit={latestVisit}
            onEdit={() => setDialog({ type: 'visit', visit: latestVisit })}
            onArchive={() => handleArchiveVisit(latestVisit.id)}
          />
        ) : (
          <p className="px-6 pb-4 text-[14px] text-text-secondary">No visits logged yet.</p>
        )}

        {/* Infringements */}
        <SectionTitle
          title={`Infringements (${infringements.length})`}
          addLabel="Log infringement"
          onAdd={() => setDialog({ type: 'infringement' })}
        />
        {infringements.length === 0 ? (
          <p className="px-6 pb-4 text-[14px] text-text-secondary">No infringements logged.</p>
        ) : (
          infringements.map((inf) => (
            <InfringementRow
              key={inf.id}
              clientId={client.id}
              infringement={inf}
              linkedTo={linkedToLabel(inf)}
              onEdit={() => setDialog({ type: 'infringement', infringement: inf })}
              onArchive={() => handleArchiveInfringement(inf.id)}
            />
          ))
        )}

        {/* Documents */}
        <SectionTitle title={`Documents (${documents.length})`} />
        {documents.length === 0 ? (
          <p className="px-6 pb-4 text-[14px] text-text-secondary">No documents uploaded yet.</p>
        ) : (
          documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              parentLabel={parentLabel(doc)}
              onArchive={() => handleArchiveDocument(doc.id)}
            />
          ))
        )}
      </div>

      <Footer />

      {dialog?.type === 'client-edit' && (
        <EditClientDialog
          client={client}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
      {dialog?.type === 'vehicle' && (
        <AddVehicleDialog
          clientId={client.id}
          vehicle={dialog.vehicle}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
      {dialog?.type === 'driver' && (
        <AddDriverDialog
          clientId={client.id}
          driver={dialog.driver}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
      {dialog?.type === 'visit' && (
        <AddVisitDialog
          clientId={client.id}
          visit={dialog.visit}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
      {dialog?.type === 'infringement' && (
        <AddInfringementDialog
          clientId={client.id}
          drivers={drivers}
          vehicles={vehicles}
          infringement={dialog.infringement}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
      {dialog?.type === 'chase-single' && (
        <EmailChaseModal
          clientId={client.id}
          clientName={client.company_name}
          contacts={contacts}
          scope="single_todo"
          todo={dialog.todo}
          onClose={() => setDialog(null)}
          onSent={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
      {dialog?.type === 'chase-all' && (
        <EmailChaseModal
          clientId={client.id}
          clientName={client.company_name}
          contacts={contacts}
          scope="all_outstanding"
          todos={todos}
          onClose={() => setDialog(null)}
          onSent={() => {
            setDialog(null)
            void load()
          }}
        />
      )}
    </div>
  )
}
