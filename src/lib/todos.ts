import { supabase } from './supabase'
import type { Todo } from '../types/database'

/** Creates any newly-due document/infringement todos. Call before every todo-list read. */
export async function reconcileTodos(): Promise<void> {
  const { error } = await supabase.rpc('reconcile_todos')
  if (error) throw error
}

/** Open todos, filtered to exclude anything still in its chase cooling period. */
export async function fetchOpenTodos(clientId?: string): Promise<Todo[]> {
  let query = supabase
    .from('todos')
    .select('*')
    .eq('status', 'open')
    .or(`snoozed_until.is.null,snoozed_until.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  if (clientId) query = query.eq('client_id', clientId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export interface TodoTarget {
  href: string
}

/**
 * Resolves each todo's click-through destination. Document todos carry
 * parent_type/parent_id directly (including missing-document todos, which
 * have no document row to look up), so this is a pure mapping — no fetch.
 */
export function resolveTodoTargets(todos: Todo[]): Map<string, TodoTarget> {
  const targets = new Map<string, TodoTarget>()

  for (const todo of todos) {
    const base = `/clients/${todo.client_id}`

    if (todo.source_type === 'infringement') {
      targets.set(todo.id, { href: `${base}/infringements/${todo.source_id}` })
      continue
    }

    if (todo.parent_type === 'vehicle' && todo.parent_id) {
      targets.set(todo.id, { href: `${base}/vehicles/${todo.parent_id}` })
    } else if (todo.parent_type === 'driver' && todo.parent_id) {
      targets.set(todo.id, { href: `${base}/drivers/${todo.parent_id}` })
    } else if (todo.parent_type === 'visit' && todo.parent_id) {
      targets.set(todo.id, { href: `${base}/visits/${todo.parent_id}` })
    } else {
      targets.set(todo.id, { href: base })
    }
  }

  return targets
}

/**
 * Records a chase for a single todo. This logs the chase (matching the
 * EmailChase data model) and starts the 3-day cooling period via the
 * `email_chases_apply_cooling` DB trigger — it doesn't actually send an
 * email yet (no outbound email provider wired up), so treat it as
 * "mark as chased" for now rather than a real send.
 */
export async function chaseTodo(todo: Todo, recipients: string[]): Promise<void> {
  const { error } = await supabase.from('email_chases').insert({
    client_id: todo.client_id,
    scope: 'single_todo',
    todo_id: todo.id,
    recipients,
    subject: `[TM Express] Action needed: ${todo.description}`,
    body: `Hi,\n\nThis is a reminder regarding: ${todo.description}.\n\nPlease action this as soon as possible.\n\nThanks,\nTM Express`,
  })
  if (error) throw error
}
