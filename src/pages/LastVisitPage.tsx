import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddVisitDialog } from '../components/AddVisitDialog'
import { Footer } from '../components/Footer'
import { InlineLabel } from '../components/InlineLabel'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { formatDate } from '../lib/format'
import { notifyDataChanged } from '../lib/dataEvents'
import { supabase } from '../lib/supabase'
import type { Visit } from '../types/database'

export function LastVisitPage() {
  const { clientId, visitId } = useParams<{
    clientId: string
    visitId: string
  }>()
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
    notifyDataChanged()
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
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <p className="px-5 py-8 text-[15px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <TopSubPage backTo={backTo} title="Visit" />
        <p className="px-5 py-8 text-[15px] text-danger-text">{error ?? 'Visit not found.'}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app">
      <TopSubPage
        backTo={backTo}
        title={`Visit — ${formatDate(visit.date)}`}
        onEdit={() => setEditOpen(true)}
      />

      <div className="mx-auto w-full max-w-[600px] flex-1 lg:max-w-[720px]">
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px]">
          <InlineLabel label="Date" value={formatDate(visit.date)} />
          <div className="flex flex-col gap-1">
            <span className="text-[15px] text-text-secondary">Notes</span>
            <p className="text-[17px] text-text-primary">{visit.notes || '—'}</p>
          </div>
        </div>
      </div>

      <Footer />

      {editOpen && clientId && (
        <AddVisitDialog
          onArchive={handleArchiveVisit}
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
