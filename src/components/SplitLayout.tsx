import { Outlet, useLocation } from 'react-router-dom'
import { Home } from '../pages/Home'

/**
 * Apple-style adaptive navigation (NavigationSplitView).
 * - Phone (< md): one column. "/" shows the client list, every other route
 *   shows its own page full-screen, pushed on top like a UINavigationController.
 * - Tablet / desktop (>= md): the client list stays as a sidebar and the
 *   routed page fills the detail pane beside it.
 */
export function SplitLayout() {
  const isRoot = useLocation().pathname === '/'

  return (
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
  )
}
