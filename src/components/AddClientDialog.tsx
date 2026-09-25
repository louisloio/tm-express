import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { VolOperator } from '../types/database'

interface AddClientDialogProps {
  onClose: () => void
  onCreated: () => void
}

export function AddClientDialog({ onClose, onCreated }: AddClientDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VolOperator[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<VolOperator | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [olNumber, setOlNumber] = useState('')
  const [address, setAddress] = useState('')
  const [operatingCentre, setOperatingCentre] = useState('')
  const [transportManager, setTransportManager] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = query.trim()
    if (q.length < 2 || selected) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const safe = q.replace(/[,%]/g, '')
      const { data, error } = await supabase
        .from('vol_operators')
        .select('*')
        .or(`licence_number.ilike.${safe}%,operator_name.ilike.%${safe}%`)
        .limit(8)
      setSearching(false)
      if (!error) setResults(data ?? [])
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected])

  function selectOperator(op: VolOperator) {
    setSelected(op)
    setResults([])
    setCompanyName(op.operator_name)
    setOlNumber(op.licence_number)
    setAddress(op.correspondence_address ?? '')
    setOperatingCentre(op.oc_address ?? '')
    // The register uses "No Transport Manager" as a literal placeholder for
    // operators without one on file — don't autofill that as if it were a name.
    setTransportManager(
      op.transport_manager && op.transport_manager !== 'No Transport Manager'
        ? op.transport_manager
        : '',
    )
  }

  function clearSelection() {
    setSelected(null)
    setQuery('')
    setCompanyName('')
    setOlNumber('')
    setAddress('')
    setOperatingCentre('')
    setTransportManager('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = companyName.trim() || query.trim()
    if (!name) {
      setError('Enter a company name.')
      return
    }

    setSubmitting(true)
    setError(null)
    const { error } = await supabase.from('clients').insert({
      company_name: name,
      ol_number: olNumber.trim() || null,
      address: address.trim() || null,
      operating_centre: operatingCentre.trim() || null,
      transport_manager: transportManager.trim() || null,
    })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    onCreated()
  }

  return (
    <div className="ios-backdrop">
      <div className="ios-sheet">
        <div className="ios-sheet-header">
          <h2 className="ios-sheet-title">Add client</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="ios-sheet-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5 pt-3">
          <div>
            <label className="ios-label">Search DVSA operator register</label>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (selected) setSelected(null)
                }}
                placeholder="OL number or business name"
                className="ios-field"
              />
              {(searching || results.length > 0) && (
                <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-subtle bg-bg-white shadow-lg">
                  {searching && (
                    <li className="px-4 py-3 text-[13px] text-text-secondary">Searching…</li>
                  )}
                  {!searching &&
                    results.map((op) => (
                      <li key={op.licence_number}>
                        <button
                          type="button"
                          onClick={() => selectOperator(op)}
                          className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-bg-row"
                        >
                          <span className="text-[14px] font-semibold text-text-primary">
                            {op.operator_name}
                          </span>
                          <span className="text-[13px] text-text-secondary">
                            {op.licence_number}
                            {op.correspondence_address ? ` · ${op.correspondence_address}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            {selected && (
              <p className="mt-2 text-[13px] text-text-secondary">
                Filled from the DVSA register.{' '}
                <button type="button" onClick={clearSelection} className="font-medium text-accent">
                  Clear
                </button>
              </p>
            )}
          </div>

          <div>
            <label className="ios-label">Company name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Required"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">OL number</label>
            <input
              type="text"
              value={olNumber}
              onChange={(e) => setOlNumber(e.target.value)}
              placeholder="Optional"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Optional"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Operating centre</label>
            <input
              type="text"
              value={operatingCentre}
              onChange={(e) => setOperatingCentre(e.target.value)}
              placeholder="Optional"
              className="ios-field"
            />
          </div>

          <div>
            <label className="ios-label">Transport manager</label>
            <input
              type="text"
              value={transportManager}
              onChange={(e) => setTransportManager(e.target.value)}
              placeholder="Optional"
              className="ios-field"
            />
          </div>

          {error && <p className="text-[14px] text-danger-text">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 ios-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 ios-btn-primary">
              {submitting ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
