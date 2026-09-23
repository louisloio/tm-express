import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Client, OnboardingStatus } from '../types/database'

interface EditClientDialogProps {
  client: Client
  onClose: () => void
  onSaved: () => void
}

interface ContactRow {
  id?: string
  name: string
  email: string
}

export function EditClientDialog({ client, onClose, onSaved }: EditClientDialogProps) {
  const [companyName, setCompanyName] = useState(client.company_name)
  const [olNumber, setOlNumber] = useState(client.ol_number ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [operatingCentre, setOperatingCentre] = useState(client.operating_centre ?? '')
  const [transportManager, setTransportManager] = useState(client.transport_manager ?? '')
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(
    client.onboarding_status,
  )

  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [originalContactIds, setOriginalContactIds] = useState<string[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', client.id)
      .then(({ data }) => {
        if (cancelled) return
        const rows = data ?? []
        setContacts(rows.map((c) => ({ id: c.id, name: c.name ?? '', email: c.email })))
        setOriginalContactIds(rows.map((c) => c.id))
        setContactsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client.id])

  function updateContact(index: number, patch: Partial<ContactRow>) {
    setContacts((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeContact(index: number) {
    setContacts((rows) => rows.filter((_, i) => i !== index))
  }

  function addContact() {
    setContacts((rows) => [...rows, { name: '', email: '' }])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error: clientError } = await supabase
      .from('clients')
      .update({
        company_name: companyName.trim(),
        ol_number: olNumber.trim() || null,
        address: address.trim() || null,
        operating_centre: operatingCentre.trim() || null,
        transport_manager: transportManager.trim() || null,
        onboarding_status: onboardingStatus,
      })
      .eq('id', client.id)

    if (clientError) {
      setSubmitting(false)
      setError(clientError.message)
      return
    }

    const keptIds = new Set(contacts.filter((c) => c.id).map((c) => c.id))
    const deletedIds = originalContactIds.filter((id) => !keptIds.has(id))

    const ops: PromiseLike<{ error: { message: string } | null }>[] = []
    if (deletedIds.length > 0) {
      ops.push(supabase.from('client_contacts').delete().in('id', deletedIds))
    }
    for (const c of contacts) {
      const email = c.email.trim()
      if (!email) continue
      if (c.id) {
        ops.push(
          supabase.from('client_contacts').update({ name: c.name.trim() || null, email }).eq(
            'id',
            c.id,
          ),
        )
      } else {
        ops.push(
          supabase.from('client_contacts').insert({
            client_id: client.id,
            name: c.name.trim() || null,
            email,
          }),
        )
      }
    }

    const results = await Promise.all(ops)
    setSubmitting(false)
    const opError = results.find((r) => r.error)?.error
    if (opError) {
      setError(opError.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-bg-white sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border-divider px-6 py-4">
          <h2 className="text-[18px] font-semibold text-text-primary">Edit client</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[20px] leading-none text-text-secondary"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Company name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              OL number
            </label>
            <input
              type="text"
              value={olNumber}
              onChange={(e) => setOlNumber(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Operating centre
            </label>
            <input
              type="text"
              value={operatingCentre}
              onChange={(e) => setOperatingCentre(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Transport manager
            </label>
            <input
              type="text"
              value={transportManager}
              onChange={(e) => setTransportManager(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
            />
          </div>

          <div>
            <label className="mb-1 block text-[14px] font-medium text-text-secondary">
              Onboarding status
            </label>
            <select
              value={onboardingStatus}
              onChange={(e) => setOnboardingStatus(e.target.value as OnboardingStatus)}
              className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-to"
            >
              <option value="In Progress">In Progress</option>
              <option value="Approved">Approved</option>
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-[14px] font-medium text-text-secondary">
                Contacts
              </label>
              <button
                type="button"
                onClick={addContact}
                className="text-[13px] font-medium text-[#0060e3]"
              >
                + Add contact
              </button>
            </div>

            {contactsLoading ? (
              <p className="text-[14px] text-text-secondary">Loading contacts…</p>
            ) : contacts.length === 0 ? (
              <p className="text-[14px] text-text-secondary">No contacts yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {contacts.map((c, i) => (
                  <div key={c.id ?? `new-${i}`} className="flex items-start gap-2">
                    <div className="flex flex-1 flex-col gap-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateContact(i, { name: e.target.value })}
                        placeholder="Name (optional)"
                        className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
                      />
                      <input
                        type="email"
                        required
                        value={c.email}
                        onChange={(e) => updateContact(i, { email: e.target.value })}
                        placeholder="Email"
                        className="w-full rounded-lg border border-border-subtle bg-bg-white px-4 py-2.5 text-[14px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-to"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      aria-label="Remove contact"
                      className="mt-2.5 text-[20px] leading-none text-text-secondary"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border-button bg-bg-white px-6 py-3 text-[15px] font-medium text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || contactsLoading}
              className="btn-primary flex-1 rounded-lg px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
