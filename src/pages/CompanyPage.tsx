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
import { OnboardingBadge } from '../components/OnboardingBadge'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { latestDocsByParent } from '../lib/documents'
import { notifyDataChanged } from '../lib/dataEvents'
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

    const [
      clientRes,
      contactsRes,
      vehiclesRes,
      driversRes,
      visitsRes,
      infringementsRes,
      documentsRes,
      todos,
    ] = await Promise.all([
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
    notifyDataChanged()
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
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <p className="px-6 py-8 text-[14px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <div className="px-6 py-8">
          <p className="text-[14px] text-danger-text">{error ?? 'Client not found.'}</p>
          <Link to="/" className="mt-2 inline-block text-[14px] font-medium text-accent">
            Back to clients
          </Link>
        </div>
      </div>
    )
  }

  const {
    client,
    contacts,
    vehicles,
    drivers,
    latestVisit,
    infringements,
    documents,
    todos,
    todoTargets,
  } = data

  const vehicleDocs = latestDocsByParent(documents.filter((d) => d.parent_type === 'vehicle'))
  const driverDocs = latestDocsByParent(documents.filter((d) => d.parent_type === 'driver'))

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
    if (inf.vehicle_id)
      parts.push(vehiclesById.get(inf.vehicle_id)?.registration ?? 'Unknown vehicle')
    return parts.length > 0 ? parts.join(' · ') : client.company_name
  }

  function parentLabel(doc: Document) {
    if (doc.parent_type === 'vehicle')
      return vehiclesById.get(doc.parent_id)?.registration ?? 'Vehicle'
    if (doc.parent_type === 'driver') return driversById.get(doc.parent_id)?.name ?? 'Driver'
    if (doc.parent_type === 'client') return client.company_name
    return 'Visit'
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app">
      <TopSubPage
        backTo="/"
        title={client.company_name}
        onEdit={() => setDialog({ type: 'client-edit' })}
        onArchive={handleArchiveClient}
        archiveLabel="Archive client"
      />

      <div className="mx-auto w-full max-w-[600px] flex-1 lg:max-w-[720px]">
        {/* CompanyDetails */}
        <div className="ios-group mt-3">
          <DetailRow label="OL number">{client.ol_number ?? '—'}</DetailRow>
          <DetailRow label="Contact(s)">
            {contacts.length > 0
              ? contacts.map((c) => (
                  <a
                    key={c.id}
                    href={`mailto:${c.email}`}
                    title={c.email}
                    className="block max-w-full truncate text-accent"
                  >
                    {c.email}
                  </a>
                ))
              : '—'}
          </DetailRow>
          <DetailRow label="Onboarding">
            <OnboardingBadge status={client.onboarding_status} />
          </DetailRow>
          <DetailRow label="Vehicles">{vehicles.length}</DetailRow>
          <DetailRow label="Transport manager">{client.transport_manager ?? '—'}</DetailRow>
          <DetailRow label="Operating centre">{client.operating_centre ?? '—'}</DetailRow>
        </div>

        {/* Todo */}
        <SectionTitle
          title={`Todo (${todos.length})`}
          trailing={
            todos.length > 0 ? (
              <button
                type="button"
                onClick={() => setDialog({ type: 'chase-all' })}
                className="pr-3 text-[17px] text-accent active:opacity-60"
              >
                Chase all outstanding
              </button>
            ) : undefined
          }
        />
        {todoWarning && <p className="px-5 pb-2 text-[15px] text-danger-text">{todoWarning}</p>}
        {todos.length === 0 ? (
          <p className="ios-empty">No open items.</p>
        ) : (
          <div className="ios-group">
            {todos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                href={todoTargets.get(todo.id)?.href ?? `/clients/${client.id}`}
                onOpenChase={(t) => setDialog({ type: 'chase-single', todo: t })}
              />
            ))}
          </div>
        )}

        {/* Vehicles */}
        <SectionTitle
          title={`Vehicles (${vehicles.length})`}
          addLabel="Add vehicle"
          onAdd={() => setDialog({ type: 'vehicle' })}
        />
        {vehicles.length === 0 ? (
          <p className="ios-empty">No vehicles yet.</p>
        ) : (
          <div className="ios-group">
            {vehicles.map((v) => (
              <VehicleRow
                key={v.id}
                clientId={client.id}
                vehicle={v}
                docsByType={vehicleDocs.get(v.id) ?? new Map()}
                onEdit={() => setDialog({ type: 'vehicle', vehicle: v })}
                onArchive={() => handleArchiveVehicle(v.id)}
              />
            ))}
          </div>
        )}

        {/* Drivers */}
        <SectionTitle
          title={`Drivers (${drivers.length})`}
          addLabel="Add driver"
          onAdd={() => setDialog({ type: 'driver' })}
        />
        {drivers.length === 0 ? (
          <p className="ios-empty">No drivers yet.</p>
        ) : (
          <div className="ios-group">
            {drivers.map((d) => (
              <DriverRow
                key={d.id}
                clientId={client.id}
                driver={d}
                docsByType={driverDocs.get(d.id) ?? new Map()}
                infringementCount={infringementCountByDriver.get(d.id) ?? 0}
                onEdit={() => setDialog({ type: 'driver', driver: d })}
                onArchive={() => handleArchiveDriver(d.id)}
              />
            ))}
          </div>
        )}

        {/* Last Visit */}
        <SectionTitle
          title="Last Visit"
          addLabel="Log a visit"
          onAdd={() => setDialog({ type: 'visit' })}
        />
        {latestVisit ? (
          <div className="ios-group">
            <LastVisitRow
              clientId={client.id}
              visit={latestVisit}
              onEdit={() => setDialog({ type: 'visit', visit: latestVisit })}
              onArchive={() => handleArchiveVisit(latestVisit.id)}
            />
          </div>
        ) : (
          <p className="ios-empty">No visits logged yet.</p>
        )}

        {/* Infringements */}
        <SectionTitle
          title={`Infringements (${infringements.length})`}
          addLabel="Log infringement"
          onAdd={() => setDialog({ type: 'infringement' })}
        />
        {infringements.length === 0 ? (
          <p className="ios-empty">No infringements logged.</p>
        ) : (
          <div className="ios-group">
            {infringements.map((inf) => (
              <InfringementRow
                key={inf.id}
                clientId={client.id}
                infringement={inf}
                linkedTo={linkedToLabel(inf)}
                onEdit={() => setDialog({ type: 'infringement', infringement: inf })}
                onArchive={() => handleArchiveInfringement(inf.id)}
              />
            ))}
          </div>
        )}

        {/* Documents */}
        <SectionTitle title={`Documents (${documents.length})`} />
        {documents.length === 0 ? (
          <p className="ios-empty">No documents uploaded yet.</p>
        ) : (
          <div className="ios-group">
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                parentLabel={parentLabel(doc)}
                onArchive={() => handleArchiveDocument(doc.id)}
              />
            ))}
          </div>
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

/** iOS "value" cell: secondary label on the left, value trailing. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-[11px] text-[17px]">
      <span className="shrink-0 text-text-primary">{label}</span>
      <div className="flex min-w-0 flex-1 flex-col items-end text-right text-text-secondary">
        {children}
      </div>
    </div>
  )
}
