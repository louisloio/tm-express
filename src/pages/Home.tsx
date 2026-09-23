import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import chevronRight from '../assets/icon-chevron-right.svg'
import plusIcon from '../assets/icon-plus.svg'
import { AddClientDialog } from '../components/AddClientDialog'
import { TodoRow } from '../components/company/TodoRow'
import { EditClientDialog } from '../components/EditClientDialog'
import { EmailChaseModal } from '../components/EmailChaseModal'
import { Footer } from '../components/Footer'
import { Header } from '../components/Header'
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
  const [chaseTarget, setChaseTarget] = useState<{ todo: Todo; contacts: ClientContact[] } | null>(
    null,
  )

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
      <Header />

      <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col">
        <div className="flex bg-bg-white">
          <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
            Dashboard
          </TabButton>
          <TabButton active={tab === 'todo'} onClick={() => setTab('todo')}>
            Todo{todos.length > 0 ? ` (${todos.length})` : ''}
          </TabButton>
        </div>

        {tab === 'dashboard' ? (
          <>
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
                  <li
                    key={client.id}
                    className="flex items-center gap-4 border-t border-border-divider bg-bg-row px-6 py-3"
                  >
                    <Link to={`/clients/${client.id}`} className="flex flex-1 items-center gap-8">
                      <div className="flex flex-1 flex-col text-[14px] font-semibold tracking-[-0.364px]">
                        <span className="text-text-primary">{client.company_name}</span>
                        <span className="font-normal text-text-secondary">
                          {client.ol_number ?? '—'}
                        </span>
                      </div>
                      <OnboardingBadge status={client.onboarding_status} />
                      <img src={chevronRight} alt="" className="size-6 shrink-0" />
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
          <p className="px-6 py-8 text-[14px] text-text-secondary">Loading todos…</p>
        ) : (
          <>
            {todoWarning && (
              <p className="px-6 pt-4 text-[14px] text-danger-text">{todoWarning}</p>
            )}
            {todos.length === 0 ? (
              <p className="px-6 py-12 text-center text-[16px] text-text-secondary">
                No open items. Nice work.
              </p>
            ) : (
              todos.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  href={todoTargets.get(todo.id)?.href ?? `/clients/${todo.client_id}`}
                  clientName={clientNameById.get(todo.client_id)}
                  onOpenChase={handleOpenChase}
                />
              ))
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-3 pt-3"
    >
      <span
        className={`text-[16px] font-medium ${active ? 'text-text-primary' : 'text-text-secondary'}`}
      >
        {children}
      </span>
      <div className={`h-[3px] w-full ${active ? 'btn-primary' : 'bg-transparent'}`} />
    </button>
  )
}
