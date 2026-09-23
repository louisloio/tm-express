export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export type DocStatus = 'overdue' | 'warning' | 'ok'

/**
 * Three-state read on a document's expiry, mirroring the todo lifecycle:
 * - 'overdue': past the expiry date (this is what has an open todo)
 * - 'warning': inside the reminder window but not yet expired (a todo is
 *   about to be created, or already has been if today crossed the
 *   threshold — this state is purely a visual heads-up, not tied to
 *   whether a todo exists yet)
 * - 'ok': everything else, including no expiry/reminder set at all
 */
export function getDocStatus(
  expiryDate: string | null | undefined,
  reminderDaysBefore: number | null | undefined,
): DocStatus {
  if (!expiryDate) return 'ok'
  const expiry = new Date(expiryDate)
  if (Number.isNaN(expiry.getTime())) return 'ok'

  const now = new Date()
  if (expiry.getTime() < now.getTime()) return 'overdue'

  if (reminderDaysBefore != null) {
    const reminderStart = new Date(expiry)
    reminderStart.setDate(reminderStart.getDate() - reminderDaysBefore)
    if (reminderStart.getTime() <= now.getTime()) return 'warning'
  }

  return 'ok'
}
