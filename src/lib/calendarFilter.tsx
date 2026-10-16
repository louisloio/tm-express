import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'tmx:calendar-hidden-clients'

interface CalendarFilter {
  /** True when the client's events should show on the calendar. */
  isVisible: (clientId: string) => boolean
  toggle: (clientId: string) => void
  showAll: () => void
  hideAll: (clientIds: string[]) => void
  hiddenCount: number
}

const Ctx = createContext<CalendarFilter | null>(null)

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function save(hidden: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]))
  } catch {
    // Private mode / blocked storage: the filter just won't persist.
  }
}

/**
 * Which clients the calendar shows. Stored as the *hidden* set so a client
 * added later shows up by default. Shared by the sidebar filter list and the
 * calendar itself, which live in different panes on wide screens.
 */
export function CalendarFilterProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<Set<string>>(load)

  const update = useCallback((next: Set<string>) => {
    save(next)
    setHidden(next)
  }, [])

  const value = useMemo<CalendarFilter>(
    () => ({
      isVisible: (id) => !hidden.has(id),
      toggle: (id) => {
        const next = new Set(hidden)
        if (!next.delete(id)) next.add(id)
        update(next)
      },
      showAll: () => update(new Set()),
      hideAll: (ids) => update(new Set(ids)),
      hiddenCount: hidden.size,
    }),
    [hidden, update],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCalendarFilter(): CalendarFilter {
  const value = useContext(Ctx)
  if (!value) throw new Error('useCalendarFilter must be used inside CalendarFilterProvider')
  return value
}
