import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddDocumentDialog } from '../components/AddDocumentDialog'
import { AddVehicleDialog } from '../components/AddVehicleDialog'
import { DocumentRow } from '../components/company/DocumentRow'
import { Footer } from '../components/Footer'
import { InlineLabel } from '../components/InlineLabel'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { formatDate, getDocSlotStatus } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Document, Vehicle } from '../types/database'

const DOC_TYPES = ['PMI', 'Brake test', 'MOT', 'VED', 'Insurance'] as const

export function VehiculePage() {
  const { clientId, vehicleId } = useParams<{
    clientId: string
    vehicleId: string
  }>()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!vehicleId) return
    const [vehicleRes, documentsRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .is('archived_at', null)
        .maybeSingle(),
      supabase
        .from('documents')
        .select('*')
        .eq('parent_type', 'vehicle')
        .eq('parent_id', vehicleId)
        .is('archived_at', null)
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

  async function handleArchiveVehicle() {
    if (!vehicleId) return
    await archiveRow('vehicles', vehicleId)
    navigate(backTo)
  }

  async function handleArchiveDocument(id: string) {
    await archiveRow('documents', id)
    void load()
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <p className="px-5 py-8 text-[15px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <TopSubPage backTo={backTo} title="Vehicle" />
        <p className="px-5 py-8 text-[15px] text-danger-text">{error ?? 'Vehicle not found.'}</p>
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
    <div className="flex min-h-dvh flex-col bg-bg-app">
      <TopSubPage
        backTo={backTo}
        title={vehicle.registration}
        onEdit={() => setEditOpen(true)}
        onArchive={handleArchiveVehicle}
        archiveLabel="Archive vehicle"
      />

      <div className="mx-auto w-full max-w-[600px] flex-1">
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px]">
          <InlineLabel label="Registration" value={vehicle.registration} />
          <InlineLabel label="Type" value={vehicle.type ?? '—'} />
        </div>

        <SectionTitle
          title="Documents"
          addLabel="Upload document"
          onAdd={() => setUploadOpen(true)}
        />
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px] !mt-0">
          {DOC_TYPES.map((type) => {
            const doc = latestByType.get(type)
            const status = getDocSlotStatus(doc)
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
            <div className="ios-group">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  parentLabel={vehicle.registration}
                  onArchive={() => handleArchiveDocument(doc.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />

      {uploadOpen && clientId && vehicleId && (
        <AddDocumentDialog
          clientId={clientId}
          parentType="vehicle"
          parentId={vehicleId}
          docTypes={[...DOC_TYPES]}
          onClose={() => setUploadOpen(false)}
          onCreated={() => {
            setUploadOpen(false)
            void load()
          }}
        />
      )}
      {editOpen && clientId && (
        <AddVehicleDialog
          clientId={clientId}
          vehicle={vehicle}
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
