import { Outlet, useLocation } from 'react-router-dom'
import { CalendarFilterProvider } from '../lib/calendarFilter'
import { Home } from '../pages/Home'

/** Top-level tab pages. On phone these show the Home list; everything else is pushed on top. */
const ROOT_PATHS = ['/', '/clients', '/todo']

/**
 * Apple-style adaptive navigation (NavigationSplitView).
 * - Phone (< md): one column. The tab roots ("/" calendar, "/clients",
 *   "/todo") show Home, every other route shows its own page full-screen,
 *   pushed on top like a UINavigationController.
 * - Tablet / desktop (>= md): Home stays as a sidebar and the routed page
 *   fills the detail pane beside it (the calendar, on "/").
 */
export function SplitLayout() {
  const isRoot = ROOT_PATHS.includes(useLocation().pathname)

  return (
    <CalendarFilterProvider>
      <div className="min-h-dvh bg-bg-app md:flex">
        <aside
          className={`${isRoot ? 'block' : 'hidden'} w-full md:sticky md:top-0 md:block md:h-dvh md:w-[340px] md:shrink-0 md:overflow-y-auto md:border-r-[0.5px] md:border-border-divider lg:w-[380px]`}
        >
          <Home />
        </aside>
        <main className={`${isRoot ? 'hidden' : 'block'} min-w-0 flex-1 md:block`}>
          <Outlet />
        </main>
      </div>
    </CalendarFilterProvider>
  )
}
