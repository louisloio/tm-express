import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Client, OnboardingStatus } from '../types/database'

interface EditClientDialogProps {
  client: Client
  onClose: () => void
  onSaved: () => void
}

export function EditClientDialog({ client, onClose, onSaved }: EditClientDialogProps) {
  const [companyName, setCompanyName] = useState(client.company_name)
  const [olNumber, setOlNumber] = useState(client.ol_number ?? '')
  const [address, setAddress] = useState(client.address ?? '')
  const [operatingCentre, setOperatingCentre] = useState(client.operating_centre ?? '')
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(
    client.onboarding_status,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await supabase
      .from('clients')
      .update({
        company_name: companyName.trim(),
        ol_number: olNumber.trim() || null,
        address: address.trim() || null,
        operating_centre: operatingCentre.trim() || null,
        onboarding_status: onboardingStatus,
      })
      .eq('id', client.id)
    setSubmitting(false)
    if (error) {
      setError(error.message)
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
              disabled={submitting}
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
