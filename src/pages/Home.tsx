import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AddClientDialog } from '../components/AddClientDialog'
import { TodoRow } from '../components/company/TodoRow'
import { EditClientDialog } from '../components/EditClientDialog'
import { EmailChaseModal } from '../components/EmailChaseModal'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
import { PlusIcon } from '../components/icons'
import { OnboardingBadge } from '../components/OnboardingBadge'
import { RowMenu } from '../components/RowMenu'
import { archiveRow } from '../lib/archive'
import { supabase } from '../lib/supabase'
import { fetchOpenTodos, reconcileTodos, resolveTodoTargets } from '../lib/todos'
import type { Client, ClientContact, Todo } from '../types/database'

type Tab = 'dashboard' | 'todo'

export function Home() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [clients, setClients] = useState<Client[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [todoTargets, setTodoTargets] = useState<Map<string, { href: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todoWarning, setTodoWarning] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [chaseTarget, setChaseTarget] = useState<{
    todo: Todo
    contacts: ClientContact[]
  } | null>(null)

  const loadClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    setClients(data ?? [])
    return data ?? []
  }, [])

  const loadTodos = useCallback(async () => {
    try {
      await reconcileTodos()
      setTodoWarning(null)
    } catch (err) {
      // Non-fatal — still show whatever todos already exist, but surface
      // it rather than swallowing it: a silent failure here means new
      // todos quietly stop appearing, which is easy to miss otherwise.
      setTodoWarning(
        err instanceof Error ? `Todo sync failed: ${err.message}` : 'Todo sync failed.',
      )
    }
    const openTodos = await fetchOpenTodos()
    const targets = resolveTodoTargets(openTodos)
    setTodos(openTodos)
    setTodoTargets(targets)
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([loadClients(), loadTodos()])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
    setLoading(false)
  }, [loadClients, loadTodos])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const clientNameById = new Map(clients.map((c) => [c.id, c.company_name]))

  async function handleOpenChase(todo: Todo) {
    const { data } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', todo.client_id)
    setChaseTarget({ todo, contacts: data ?? [] })
  }

  async function handleArchiveClient(id: string) {
    await archiveRow('clients', id)
    void loadClients()
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <div className="ios-bar sticky top-0 z-30 border-b-[0.5px] border-border-divider pt-[env(safe-area-inset-top)]">
        <Header bare />
        <div className="mx-auto w-full max-w-[600px] px-4 pb-2.5">
          <div role="tablist" className="ios-segmented">
            <SegmentButton selected={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
              Dashboard
            </SegmentButton>
            <SegmentButton selected={tab === 'todo'} onClick={() => setTab('todo')}>
              Todo{todos.length > 0 ? ` (${todos.length})` : ''}
            </SegmentButton>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col">
        {tab === 'dashboard' ? (
          <>
            <div className="flex items-center justify-between pl-5 pr-2 pb-1 pt-4">
              <h1 className="text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-text-primary">
                Clients
              </h1>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                aria-label="Add client"
                className="ios-icon-btn"
              >
                <PlusIcon width={26} height={26} />
              </button>
            </div>

            {error && <p className="px-5 pb-2 text-[15px] text-danger-text">{error}</p>}

            {loading ? (
              <p className="px-5 py-8 text-[15px] text-text-secondary">Loading clients…</p>
            ) : clients.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[17px] text-text-secondary">No clients yet.</p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="mt-3 text-[17px] font-semibold text-accent active:opacity-60"
                >
                  Add your first client
                </button>
              </div>
            ) : (
              <ul className="ios-group mt-2">
                {clients.map((client) => (
                  <li key={client.id} className="flex items-center gap-2 py-1 pl-4 pr-1">
                    <Link
                      to={`/clients/${client.id}`}
                      className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2 active:opacity-60"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[17px] font-medium text-text-primary">
                          {client.company_name}
                        </span>
                        <span className="text-[15px] text-text-secondary">
                          {client.ol_number ?? '—'}
                        </span>
                      </div>
                      <OnboardingBadge status={client.onboarding_status} />
                    </Link>
                    <RowMenu
                      onEdit={() => setEditingClient(client)}
                      onArchive={() => handleArchiveClient(client.id)}
                      archiveLabel="Archive client"
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : loading ? (
          <p className="px-5 py-8 text-[15px] text-text-secondary">Loading todos…</p>
        ) : (
          <>
            <h1 className="px-5 pb-1 pt-4 text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-text-primary">
              Todo
            </h1>
            {todoWarning && <p className="px-5 pb-2 text-[15px] text-danger-text">{todoWarning}</p>}
            {todos.length === 0 ? (
              <p className="px-6 py-16 text-center text-[17px] text-text-secondary">
                No open items. Nice work.
              </p>
            ) : (
              <div className="ios-group mt-2">
                {todos.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    href={todoTargets.get(todo.id)?.href ?? `/clients/${todo.client_id}`}
                    clientName={clientNameById.get(todo.client_id)}
                    onOpenChase={handleOpenChase}
                  />
                ))}
              </div>
            )}
          </>
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
      {editingClient && (
        <EditClientDialog
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={() => {
            setEditingClient(null)
            void loadClients()
          }}
        />
      )}
      {chaseTarget && (
        <EmailChaseModal
          clientId={chaseTarget.todo.client_id}
          clientName={clientNameById.get(chaseTarget.todo.client_id) ?? 'the client'}
          contacts={chaseTarget.contacts}
          scope="single_todo"
          todo={chaseTarget.todo}
          onClose={() => setChaseTarget(null)}
          onSent={() => {
            setChaseTarget(null)
            void loadTodos()
          }}
        />
      )}
    </div>
  )
}

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className="ios-segment"
    >
      {children}
    </button>
  )
}
