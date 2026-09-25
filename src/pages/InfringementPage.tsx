import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddInfringementDialog } from '../components/AddInfringementDialog'
import { Footer } from '../components/Footer'
import { InlineLabel } from '../components/InlineLabel'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Driver, Infringement, Vehicle } from '../types/database'

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
      <TopSubPage
        backTo={backTo}
        title={infringement.type}
        onEdit={() => setEditOpen(true)}
        onArchive={handleArchive}
        archiveLabel="Archive infringement"
      />

      <div className="mx-auto w-full max-w-[600px] flex-1">
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
      </div>

      <Footer />

      {editOpen && clientId && (
        <AddInfringementDialog
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
