import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DocumentRow } from '../components/company/DocumentRow'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { InlineLabel } from '../components/InlineLabel'
import { SectionTitle } from '../components/SectionTitle'
import { TopSubPage } from '../components/TopSubPage'
import { formatDate, isOverdue } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Document, Driver } from '../types/database'

const DOC_TYPES = ['Licence check', 'CPC'] as const

export function DriverPage() {
  const { clientId, driverId } = useParams<{ clientId: string; driverId: string }>()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!driverId) return
    let cancelled = false

    async function load() {
      const [driverRes, documentsRes] = await Promise.all([
        supabase.from('drivers').select('*').eq('id', driverId!).single(),
        supabase
          .from('documents')
          .select('*')
          .eq('parent_type', 'driver')
          .eq('parent_id', driverId!)
          .order('uploaded_at', { ascending: false }),
      ])
      if (cancelled) return
      if (driverRes.error || !driverRes.data) {
        setError(driverRes.error?.message ?? 'Driver not found.')
      } else {
        setDriver(driverRes.data)
        setDocuments(documentsRes.data ?? [])
        setError(null)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [driverId])

  const backTo = clientId ? `/clients/${clientId}` : '/'

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <p className="px-6 py-8 text-[14px] text-text-secondary">Loading…</p>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-app">
        <Header />
        <TopSubPage backTo={backTo} title="Driver" />
        <p className="px-6 py-8 text-[14px] text-danger-text">{error ?? 'Driver not found.'}</p>
      </div>
    )
  }

  const latestByType = new Map(documents.map((d) => [d.doc_type, d]))

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />
      <TopSubPage backTo={backTo} title={driver.name} />

      <div className="mx-auto w-full max-w-[600px] flex-1">
        <div className="flex flex-col gap-2 px-6 py-4">
          <InlineLabel label="Name" value={driver.name} />
        </div>

        <SectionTitle title="Documents" addLabel="Upload document" />
        <div className="flex flex-col gap-1 px-6 pb-4">
          {DOC_TYPES.map((type) => {
            const doc = latestByType.get(type)
            return (
              <InlineLabel
                key={type}
                label={type}
                value={doc?.expiry_date ? `Expires ${formatDate(doc.expiry_date)}` : 'Not on file'}
                danger={isOverdue(doc?.expiry_date)}
              />
            )
          })}
        </div>

        {documents.length > 0 && (
          <>
            <SectionTitle title="Document history" />
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} parentLabel={driver.name} />
            ))}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
