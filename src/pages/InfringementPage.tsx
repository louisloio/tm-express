import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { InlineLabel } from '../components/InlineLabel'
import { TopSubPage } from '../components/TopSubPage'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Driver, Infringement, Vehicle } from '../types/database'

export function InfringementPage() {
  const { clientId, infringementId } = useParams<{ clientId: string; infringementId: string }>()
  const [infringement, setInfringement] = useState<Infringement | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!infringementId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('infringements')
        .select('*')
        .eq('id', infringementId!)
        .single()
      if (cancelled) return
      if (error || !data) {
        setError(error?.message ?? 'Infringement not found.')
        setLoading(false)
        return
      }
      setInfringement(data)

      const [driverRes, vehicleRes] = await Promise.all([
        data.driver_id
          ? supabase.from('drivers').select('*').eq('id', data.driver_id).single()
          : Promise.resolve({ data: null }),
        data.vehicle_id
          ? supabase.from('vehicles').select('*').eq('id', data.vehicle_id).single()
          : Promise.resolve({ data: null }),
      ])
      if (cancelled) return
      setDriver(driverRes.data)
      setVehicle(vehicleRes.data)
      setError(null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [infringementId])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <p className="px-6 py-8 text-[14px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !infringement) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <TopSubPage backTo={backTo} title="Infringement" />
        <p className="px-6 py-8 text-[14px] text-danger-text">
          {error ?? 'Infringement not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />
      <TopSubPage backTo={backTo} title={infringement.type} />

      <div className="mx-auto w-full max-w-[600px] flex-1">
        <div className="flex flex-col gap-2 px-6 py-4">
          <InlineLabel label="Category" value={infringement.category} />
          <InlineLabel label="Type" value={infringement.type} />
          <InlineLabel
            label="Status"
            value={infringement.resolved ? 'Resolved' : 'Open'}
            danger={!infringement.resolved}
          />
          {driver && <InlineLabel label="Driver" value={driver.name} />}
          {vehicle && <InlineLabel label="Vehicle" value={vehicle.registration} />}
          <InlineLabel label="Date" value={formatDate(infringement.date)} />
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Notes</span>
            <p className="text-[14px] font-medium text-text-primary">
              {infringement.notes || '—'}
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
