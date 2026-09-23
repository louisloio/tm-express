import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import chevronRight from '../assets/icon-chevron-right.svg'
import plusIcon from '../assets/icon-plus.svg'
import { AddClientDialog } from '../components/AddClientDialog'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { OnboardingBadge } from '../components/OnboardingBadge'
import { supabase } from '../lib/supabase'
import type { Client } from '../types/database'

export function Home() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadClients = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setClients(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadClients()
  }, [loadClients])

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <Header />

      <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col">
        <div className="flex items-center gap-8 px-6 pt-6">
          <h1 className="flex-1 py-4 text-[26px] font-bold tracking-[-0.52px] text-text-primary">
            Clients
          </h1>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            aria-label="Add client"
            className="flex items-center justify-center rounded-full border border-border-button p-2"
          >
            <img src={plusIcon} alt="" className="size-6" />
          </button>
        </div>

        {error && <p className="px-6 text-[14px] text-danger-text">{error}</p>}

        {loading ? (
          <p className="px-6 py-8 text-[14px] text-text-secondary">Loading clients…</p>
        ) : clients.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[16px] text-text-secondary">No clients yet.</p>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="mt-4 font-medium text-[#0060e3]"
            >
              Add your first client
            </button>
          </div>
        ) : (
          <ul>
            {clients.map((client) => (
              <li key={client.id}>
                <Link
                  to={`/clients/${client.id}`}
                  className="flex items-center gap-8 border-t border-border-divider bg-bg-row px-6 py-3"
                >
                  <div className="flex flex-1 flex-col text-[14px] font-semibold tracking-[-0.364px]">
                    <span className="text-text-primary">{client.company_name}</span>
                    <span className="font-normal text-text-secondary">
                      {client.ol_number ?? '—'}
                    </span>
                  </div>
                  <OnboardingBadge status={client.onboarding_status} />
                  <img src={chevronRight} alt="" className="size-6 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Footer />

      {dialogOpen && (
        <AddClientDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false)
            void loadClients()
          }}
        />
      )}
    </div>
  )
}
