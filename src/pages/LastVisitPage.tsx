import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { InlineLabel } from '../components/InlineLabel'
import { TopSubPage } from '../components/TopSubPage'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Visit } from '../types/database'

export function LastVisitPage() {
  const { clientId, visitId } = useParams<{ clientId: string; visitId: string }>()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visitId) return
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.from('visits').select('*').eq('id', visitId!).single()
      if (cancelled) return
      if (error || !data) {
        setError(error?.message ?? 'Visit not found.')
      } else {
        setVisit(data)
        setError(null)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [visitId])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <p className="px-6 py-8 text-[14px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <TopSubPage backTo={backTo} title="Visit" />
        <p className="px-6 py-8 text-[14px] text-danger-text">{error ?? 'Visit not found.'}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />
      <TopSubPage backTo={backTo} title={`Visit — ${formatDate(visit.date)}`} />

      <div className="mx-auto w-full max-w-[600px] flex-1">
        <div className="flex flex-col gap-2 px-6 py-4">
          <InlineLabel label="Date" value={formatDate(visit.date)} />
          <div className="flex flex-col gap-1">
            <span className="text-[14px] font-medium text-text-secondary">Notes</span>
            <p className="text-[14px] font-medium text-text-primary">{visit.notes || '—'}</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
