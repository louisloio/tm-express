import { Link } from 'react-router-dom'
import backIcon from '../assets/icon-back.svg'
import moreIcon from '../assets/icon-more.svg'

interface TopSubPageProps {
  backTo: string
  title: string
  onMore?: () => void
}

export function TopSubPage({ backTo, title, onMore }: TopSubPageProps) {
  return (
    <div className="flex items-center gap-2 bg-bg-app px-6 py-4">
      <Link
        to={backTo}
        aria-label="Back"
        className="flex items-center justify-center rounded-full p-1"
      >
        <img src={backIcon} alt="" className="size-6" />
      </Link>
      <div className="h-6 w-px bg-border-divider" />
      <h1 className="flex-1 truncate text-[16px] font-bold tracking-[-0.32px] text-text-primary">
        {title}
      </h1>
      <button
        type="button"
        onClick={onMore}
        disabled={!onMore}
        title={onMore ? undefined : 'Coming soon'}
        aria-label="More actions"
        className="flex items-center justify-center rounded-full border border-border-button p-2 disabled:opacity-40"
      >
        <img src={moreIcon} alt="" className="size-6" />
      </button>
    </div>
  )
}
