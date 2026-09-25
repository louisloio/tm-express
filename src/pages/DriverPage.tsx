import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddDocumentDialog } from '../components/AddDocumentDialog'
import { AddDriverDialog } from '../components/AddDriverDialog'
import { DocumentRow } from '../components/company/DocumentRow'
import { DocSlotRow } from '../components/DocSlotRow'
import { Footer } from '../components/Footer'
import { InlineLabel } from '../components/InlineLabel'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { formatDate, getDocSlotStatus } from '../lib/format'
import { notifyDataChanged } from '../lib/dataEvents'
import { supabase } from '../lib/supabase'
import type { DocType, Document, Driver } from '../types/database'

const DOC_TYPES = ['Licence check', 'CPC'] as const

export function DriverPage() {
  const { clientId, driverId } = useParams<{
    clientId: string
    driverId: string
  }>()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upload, setUpload] = useState<{ docType?: DocType; file?: File } | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!driverId) return
    const [driverRes, documentsRes] = await Promise.all([
      supabase.from('drivers').select('*').eq('id', driverId).is('archived_at', null).maybeSingle(),
      supabase
        .from('documents')
        .select('*')
        .eq('parent_type', 'driver')
        .eq('parent_id', driverId)
        .is('archived_at', null)
        .order('uploaded_at', { ascending: false }),
    ])
    if (driverRes.error || !driverRes.data) {
      setError(driverRes.error?.message ?? 'Driver not found.')
    } else {
      setDriver(driverRes.data)
      setDocuments(documentsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
    notifyDataChanged()
  }, [driverId])

  useEffect(() => {
    void load()
  }, [load])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  async function handleArchiveDriver() {
    if (!driverId) return
    await archiveRow('drivers', driverId)
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

  if (error || !driver) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app">
        <TopSubPage backTo={backTo} title="Driver" />
        <p className="px-5 py-8 text-[15px] text-danger-text">{error ?? 'Driver not found.'}</p>
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
      <TopSubPage backTo={backTo} title={driver.name} onEdit={() => setEditOpen(true)} />

      <div className="mx-auto w-full max-w-[600px] flex-1 lg:max-w-[720px]">
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px]">
          <InlineLabel label="Name" value={driver.name} />
        </div>

        <SectionTitle title="Documents" addLabel="Upload document" onAdd={() => setUpload({})} />
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px] !mt-0">
          {DOC_TYPES.map((type) => {
            const doc = latestByType.get(type)
            const status = getDocSlotStatus(doc)
            return (
              <DocSlotRow
                key={type}
                label={type}
                value={doc?.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : 'Not on file'}
                tone={status === 'ok' ? undefined : status}
                onFile={(file) => setUpload({ docType: type, file })}
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
                  parentLabel={driver.name}
                  onArchive={() => handleArchiveDocument(doc.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />

      {upload && clientId && driverId && (
        <AddDocumentDialog
          clientId={clientId}
          parentType="driver"
          parentId={driverId}
          docTypes={[...DOC_TYPES]}
          initialDocType={upload.docType}
          initialFile={upload.file}
          onClose={() => setUpload(null)}
          onCreated={() => {
            setUpload(null)
            void load()
          }}
        />
      )}
      {editOpen && clientId && (
        <AddDriverDialog
          onArchive={handleArchiveDriver}
          clientId={clientId}
          driver={driver}
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
