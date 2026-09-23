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
