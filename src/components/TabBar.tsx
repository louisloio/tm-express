import type { ReactNode } from 'react'
import { CalendarIcon, ChecklistIcon, HouseIcon } from './icons'

export type HomeTab = 'calendar' | 'clients' | 'todo'

interface TabBarProps {
  tab: HomeTab
  todoCount: number
  onSelect: (tab: HomeTab) => void
}

/**
 * iOS-style bottom tab bar (UITabBar) for switching Home between Calendar,
 * Clients and Todo on the phone — the segmented control at the top of Home
 * (src/pages/Home.tsx) keeps doing that job on tablet/desktop, where a bar
 * fixed to the whole viewport's bottom edge wouldn't sit right next to the
 * detail pane. Fixed to the screen; Home reserves matching bottom padding
 * (TAB_BAR_CONTENT_HEIGHT below) so list content never sits behind it.
 */
export function TabBar({ tab, todoCount, onSelect }: TabBarProps) {
  return (
    <nav
      role="tablist"
      aria-label="Home"
      className="ios-bar fixed inset-x-0 bottom-0 z-30 border-t-[0.5px] border-border-divider pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex w-full max-w-[600px]">
        <TabBarButton
          selected={tab === 'calendar'}
          onClick={() => onSelect('calendar')}
          icon={<CalendarIcon width={25} height={25} />}
          label="Calendar"
        />
        <TabBarButton
          selected={tab === 'clients'}
          onClick={() => onSelect('clients')}
          icon={<HouseIcon width={25} height={25} />}
          label="Clients"
        />
        <TabBarButton
          selected={tab === 'todo'}
          onClick={() => onSelect('todo')}
          icon={<ChecklistIcon width={25} height={25} />}
          label="Todo"
          badge={todoCount}
        />
      </div>
    </nav>
  )
}

/** Total rendered height of the bar's own content (excludes the safe-area
 * inset it adds on top) — Home pads its scroll area by this much on phone
 * so the tab bar never covers the last row. */
export const TAB_BAR_CONTENT_HEIGHT = 54

function TabBarButton({
  selected,
  onClick,
  icon,
  label,
  badge,
}: {
  selected: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 text-[10px] font-medium tracking-[-0.01em] transition-colors active:opacity-60 ${
        selected ? 'text-accent' : 'text-text-tertiary'
      }`}
    >
      <span className="relative">
        {icon}
        {!!badge && badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-danger-text px-[4px] text-[11px] font-semibold leading-none text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {label}
    </button>
  )
}
