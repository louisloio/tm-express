import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AddDocumentDialog } from '../components/AddDocumentDialog'
import { AddDriverDialog } from '../components/AddDriverDialog'
import { DocumentRow } from '../components/company/DocumentRow'
import { DocSlotRow } from '../components/DocSlotRow'
import { InlineLabel } from '../components/InlineLabel'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { archiveRow } from '../lib/archive'
import { fetchDriverNi } from '../lib/driverSecrets'
import { formatDate, getDocSlotStatus } from '../lib/format'
import { notifyDataChanged } from '../lib/dataEvents'
import { fetchDocumentTodosForParent } from '../lib/todos'
import { supabase } from '../lib/supabase'
import type { DocType, Document, Driver, Todo } from '../types/database'

const DOC_TYPES = ['Licence check', 'CPC'] as const

/**
 * "National Insurance no." row: masked by default, decrypted on demand —
 * the NI number is never fetched (let alone shown) until the owning user
 * taps to reveal it, and only from this detail page. See
 * src/lib/driverSecrets.ts.
 */
function NiNumberRow({ driverId }: { driverId: string }) {
  const [state, setState] = useState<'hidden' | 'loading' | 'error' | 'revealed'>('hidden')
  const [value, setValue] = useState<string | null>(null)

  async function reveal() {
    setState('loading')
    const { niNumber, error } = await fetchDriverNi(driverId)
    if (error) {
      setState('error')
      return
    }
    setValue(niNumber)
    setState('revealed')
  }

  if (state === 'revealed') {
    return <InlineLabel label="National Insurance no." value={value ?? '—'} />
  }

  return (
    <div className="flex w-full items-baseline justify-between gap-4 text-[15px]">
      <span className="shrink-0 text-text-secondary">National Insurance no.</span>
      {state === 'error' ? (
        <span className="text-danger-text">Couldn't load</span>
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={state === 'loading'}
          className="text-accent active:opacity-60 disabled:opacity-60"
        >
          {state === 'loading' ? 'Loading…' : 'Show'}
        </button>
      )}
    </div>
  )
}

export function DriverPage() {
  const { clientId, driverId } = useParams<{
    clientId: string
    driverId: string
  }>()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [docTodos, setDocTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upload, setUpload] = useState<{ docType?: DocType; file?: File } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  // Bumped on every save so NiNumberRow remounts and forgets whatever it
  // had revealed/fetched before — otherwise a saved NI number wouldn't
  // show up without a manual page reload.
  const [niRefreshKey, setNiRefreshKey] = useState(0)

  const load = useCallback(async () => {
    if (!driverId) return
    const [driverRes, documentsRes, docTodosRes] = await Promise.all([
      supabase.from('drivers').select('*').eq('id', driverId).is('archived_at', null).maybeSingle(),
      supabase
        .from('documents')
        .select('*')
        .eq('parent_type', 'driver')
        .eq('parent_id', driverId)
        .is('archived_at', null)
        .order('uploaded_at', { ascending: false }),
      fetchDocumentTodosForParent('driver', driverId),
    ])
    if (driverRes.error || !driverRes.data) {
      setError(driverRes.error?.message ?? 'Driver not found.')
    } else {
      setDriver(driverRes.data)
      setDocuments(documentsRes.data ?? [])
      setDocTodos(docTodosRes)
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
      <div className="flex min-h-dvh flex-col bg-bg-app pb-[env(safe-area-inset-bottom)]">
        <p className="px-5 py-8 text-[15px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg-app pb-[env(safe-area-inset-bottom)]">
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

  const chasedUntilByType = new Map<DocType, string>()
  for (const t of docTodos) {
    if (t.doc_type && t.snoozed_until && new Date(t.snoozed_until).getTime() > Date.now()) {
      chasedUntilByType.set(t.doc_type, t.snoozed_until)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-app pb-[env(safe-area-inset-bottom)]">
      <TopSubPage backTo={backTo} title={driver.name} onEdit={() => setEditOpen(true)} />

      <div className="mx-auto w-full max-w-[600px] flex-1 lg:max-w-[720px]">
        <div className="ios-group mt-3 [&>*]:px-4 [&>*]:py-[11px]">
          <InlineLabel label="Name" value={driver.name} />
          <InlineLabel label="Licence number" value={driver.licence_number ?? '—'} />
          <InlineLabel
            label="Date of birth"
            value={driver.date_of_birth ? formatDate(driver.date_of_birth) : '—'}
          />
          <NiNumberRow key={niRefreshKey} driverId={driver.id} />
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
                chasedUntil={chasedUntilByType.get(type)}
                onCooldownEnd={load}
                onOpen={() => setUpload({ docType: type })}
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
            setNiRefreshKey((k) => k + 1)
            void load()
          }}
        />
      )}
    </div>
  )
}
