import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddInfringementDialog } from '../components/AddInfringementDialog'
import { EmailChaseModal } from '../components/EmailChaseModal'
import { Footer } from '../components/Footer'
import { InlineLabel } from '../components/InlineLabel'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { formatDate } from '../lib/format'
import { notifyDataChanged } from '../lib/dataEvents'
import { supabase } from '../lib/supabase'
import { fetchOpenTodos, reconcileTodos } from '../lib/todos'
import type { ClientContact, Driver, Infringement, Todo, Vehicle } from '../types/database'

export function InfringementPage() {
  const { clientId, infringementId } = useParams<{
    clientId: string
    infringementId: string
  }>()
  const navigate = useNavigate()
  const [infringement, setInfringement] = useState<Infringement | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [clientDrivers, setClientDrivers] = useState<Driver[]>([])
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [chase, setChase] = useState<{
    todo: Todo
    contacts: ClientContact[]
    clientName: string
  } | null>(null)

  const load = useCallback(async () => {
    if (!infringementId || !clientId) return

    const { data, error } = await supabase
      .from('infringements')
      .select('*')
      .eq('id', infringementId)
      .is('archived_at', null)
      .maybeSingle()
    if (error || !data) {
      setError(error?.message ?? 'Infringement not found.')
      setLoading(false)
      return
    }
    setInfringement(data)

    const [driverRes, vehicleRes, clientDriversRes, clientVehiclesRes] = await Promise.all([
      data.driver_id
        ? supabase.from('drivers').select('*').eq('id', data.driver_id).maybeSingle()
        : Promise.resolve({ data: null }),
      data.vehicle_id
        ? supabase.from('vehicles').select('*').eq('id', data.vehicle_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('drivers').select('*').eq('client_id', clientId).is('archived_at', null),
      supabase.from('vehicles').select('*').eq('client_id', clientId).is('archived_at', null),
    ])
    setDriver(driverRes.data)
    setVehicle(vehicleRes.data)
    setClientDrivers(clientDriversRes.data ?? [])
    setClientVehicles(clientVehiclesRes.data ?? [])
    setError(null)
    setLoading(false)
    notifyDataChanged()
  }, [infringementId, clientId])

  useEffect(() => {
    void load()
  }, [load])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  async function handleArchive() {
    if (!infringementId) return
    await archiveRow('infringements', infringementId)
    navigate(backTo)
  }

  async function setResolved(resolved: boolean) {
    if (!infringementId) return
    setBusy(true)
    setActionError(null)
    const { error } = await supabase
      .from('infringements')
      .update({ resolved })
      .eq('id', infringementId)
    if (error) setActionError(error.message)
    else await load()
    setBusy(false)
  }

  async function handleChase() {
    if (!infringementId || !clientId) return
    setBusy(true)
    setActionError(null)
    try {
      // The open todo is what a chase is recorded against. Reopened
      // infringements get theirs back from reconcile.
      let todo = (await fetchOpenTodos(clientId)).find((t) => t.source_id === infringementId)
      if (!todo) {
        await reconcileTodos()
        todo = (await fetchOpenTodos(clientId)).find((t) => t.source_id === infringementId)
      }
      if (!todo) throw new Error('No open todo found for this infringement.')
      const [contactsRes, clientRes] = await Promise.all([
        supabase.from('client_contacts').select('*').eq('client_id', clientId),
        supabase.from('clients').select('company_name').eq('id', clientId).maybeSingle(),
      ])
      setChase({
        todo,
        contacts: contactsRes.data ?? [],
        clientName: clientRes.data?.company_name ?? 'the client',
      })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start the chase.')
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <p className="px-5 py-8 text-[15px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !infringement) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <TopSubPage backTo={backTo} title="Infringement" />
        <p className="px-5 py-8 text-[15px] text-danger-text">
          {error ?? 'Infringement not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app">
      <TopSubPage backTo={backTo} title={infringement.type} onEdit={() => setEditOpen(true)} />

      <div className="mx-auto w-full max-w-[600px] flex-1 lg:max-w-[720px]">
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px]">
          <InlineLabel label="Category" value={infringement.category} />
          <InlineLabel label="Type" value={infringement.type} />
          <InlineLabel
            label="Status"
            value={infringement.resolved ? 'Resolved' : 'Open'}
            tone={infringement.resolved ? undefined : 'overdue'}
          />
          {driver && <InlineLabel label="Driver" value={driver.name} />}
          {vehicle && <InlineLabel label="Vehicle" value={vehicle.registration} />}
          <InlineLabel label="Date" value={formatDate(infringement.date)} />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] text-text-secondary">Notes</span>
            <p className="text-[17px] text-text-primary">{infringement.notes || '—'}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 px-4">
          {actionError && <p className="px-1 text-[15px] text-danger-text">{actionError}</p>}
          {infringement.resolved ? (
            <button
              type="button"
              onClick={() => setResolved(false)}
              disabled={busy}
              className="ios-btn-secondary w-full"
            >
              Reopen infringement
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleChase}
                disabled={busy}
                className="ios-btn-primary w-full"
              >
                Chase client
              </button>
              <button
                type="button"
                onClick={() => setResolved(true)}
                disabled={busy}
                className="ios-btn-secondary w-full"
              >
                Mark as resolved
              </button>
            </>
          )}
        </div>
      </div>

      <Footer />

      {chase && clientId && (
        <EmailChaseModal
          clientId={clientId}
          clientName={chase.clientName}
          contacts={chase.contacts}
          scope="single_todo"
          todo={chase.todo}
          onClose={() => setChase(null)}
          onSent={() => {
            setChase(null)
            void load()
          }}
        />
      )}
      {editOpen && clientId && (
        <AddInfringementDialog
          onArchive={handleArchive}
          clientId={clientId}
          drivers={clientDrivers}
          vehicles={clientVehicles}
          infringement={infringement}
          onClose={() => setEditOpen(false)}
          onCreated={() => {
            setEditOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}
