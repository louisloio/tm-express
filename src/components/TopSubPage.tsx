import { Link } from 'react-router-dom'
import { EditButton } from './EditButton'
import { ChevronLeftIcon } from './icons'

interface TopSubPageProps {
  backTo: string
  title: string
  onEdit?: () => void
}

/** Detail-screen navigation bar: back chevron, inline title, trailing Edit. */
export function TopSubPage({ backTo, title, onEdit }: TopSubPageProps) {
  return (
    <header className="ios-bar sticky top-0 z-30 border-b-[0.5px] border-border-divider pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-12 w-full max-w-[600px] items-center gap-1 px-2 lg:max-w-[720px]">
        <Link
          to={backTo}
          aria-label="Back"
          className={`ios-icon-btn -ml-0.5 !w-10 active:opacity-60 ${backTo === '/' ? 'md:hidden' : ''}`}
        >
          <ChevronLeftIcon width={26} height={26} />
        </Link>
        <h1
          className={`flex-1 truncate text-[17px] font-semibold tracking-[-0.022em] text-text-primary ${backTo === '/' ? 'md:pl-3' : ''}`}
        >
          {title}
        </h1>
        {onEdit && <EditButton onClick={onEdit} className="-mr-1" />}
      </div>
    </header>
  )
}
