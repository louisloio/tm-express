import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddVisitDialog } from '../components/AddVisitDialog'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { InlineLabel } from '../components/InlineLabel'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Visit } from '../types/database'

export function LastVisitPage() {
  const { clientId, visitId } = useParams<{ clientId: string; visitId: string }>()
  const navigate = useNavigate()
  const [visit, setVisit] = useState<Visit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!visitId) return
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('id', visitId)
      .is('archived_at', null)
      .maybeSingle()
    if (error || !data) {
      setError(error?.message ?? 'Visit not found.')
    } else {
      setVisit(data)
      setError(null)
    }
    setLoading(false)
  }, [visitId])

  useEffect(() => {
    void load()
  }, [load])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  async function handleArchiveVisit() {
    if (!visitId) return
    await archiveRow('visits', visitId)
    navigate(backTo)
  }

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
      <TopSubPage
        backTo={backTo}
        title={`Visit — ${formatDate(visit.date)}`}
        onEdit={() => setEditOpen(true)}
        onArchive={handleArchiveVisit}
        archiveLabel="Archive visit"
      />

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

      {editOpen && clientId && (
        <AddVisitDialog
          clientId={clientId}
          visit={visit}
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
