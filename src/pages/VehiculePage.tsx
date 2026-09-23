import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AddDocumentDialog } from '../components/AddDocumentDialog'
import { DocumentRow } from '../components/company/DocumentRow'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { InlineLabel } from '../components/InlineLabel'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { formatDate, getDocStatus } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Document, Vehicle } from '../types/database'

const DOC_TYPES = ['PMI', 'Brake test', 'MOT', 'VED', 'Insurance'] as const

export function VehiculePage() {
  const { clientId, vehicleId } = useParams<{ clientId: string; vehicleId: string }>()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    if (!vehicleId) return
    const [vehicleRes, documentsRes] = await Promise.all([
      supabase.from('vehicles').select('*').eq('id', vehicleId).single(),
      supabase
        .from('documents')
        .select('*')
        .eq('parent_type', 'vehicle')
        .eq('parent_id', vehicleId)
        .order('uploaded_at', { ascending: false }),
    ])
    if (vehicleRes.error || !vehicleRes.data) {
      setError(vehicleRes.error?.message ?? 'Vehicle not found.')
    } else {
      setVehicle(vehicleRes.data)
      setDocuments(documentsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [vehicleId])

  useEffect(() => {
    void load()
  }, [load])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <p className="px-6 py-8 text-[14px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <TopSubPage backTo={backTo} title="Vehicle" />
        <p className="px-6 py-8 text-[14px] text-danger-text">{error ?? 'Vehicle not found.'}</p>
      </div>
    )
  }

  // `documents` is ordered newest-first, so the first occurrence of each
  // doc_type is the current one — keep it, ignore older duplicates.
  const latestByType = new Map<Document['doc_type'], Document>()
  for (const d of documents) {
    if (!latestByType.has(d.doc_type)) latestByType.set(d.doc_type, d)
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />
      <TopSubPage backTo={backTo} title={vehicle.registration} />

      <div className="mx-auto w-full max-w-[600px] flex-1">
        <div className="flex flex-col gap-2 px-6 py-4">
          <InlineLabel label="Registration" value={vehicle.registration} />
          <InlineLabel label="Type" value={vehicle.type ?? '—'} />
        </div>

        <SectionTitle
          title="Documents"
          addLabel="Upload document"
          onAdd={() => setDialogOpen(true)}
        />
        <div className="flex flex-col gap-1 px-6 pb-4">
          {DOC_TYPES.map((type) => {
            const doc = latestByType.get(type)
            const status = getDocStatus(doc?.expiry_date, doc?.reminder_days_before)
            return (
              <InlineLabel
                key={type}
                label={type}
                value={doc?.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : 'Not on file'}
                tone={status === 'ok' ? undefined : status}
              />
            )
          })}
        </div>

        {documents.length > 0 && (
          <>
            <SectionTitle title="Document history" />
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} parentLabel={vehicle.registration} />
            ))}
          </>
        )}
      </div>

      <Footer />

      {dialogOpen && clientId && vehicleId && (
        <AddDocumentDialog
          clientId={clientId}
          parentType="vehicle"
          parentId={vehicleId}
          docTypes={[...DOC_TYPES]}
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}
