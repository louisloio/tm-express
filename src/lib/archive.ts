import { supabase } from './supabase'
import type { Database } from '../types/database'

type ArchivableTable =
  | 'clients'
  | 'vehicles'
  | 'drivers'
  | 'visits'
  | 'infringements'
  | 'documents'
  | 'mailboxes'

/** Soft-delete: sets archived_at rather than removing the row. */
export async function archiveRow(table: ArchivableTable, id: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ archived_at: new Date().toISOString() } as Database['public']['Tables'][typeof table]['Update'])
    .eq('id', id)
  if (error) throw error
}
