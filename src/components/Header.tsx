import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  /** Rendered inside a parent that supplies the bar material, safe-area
   * padding and hairline (e.g. Home's sticky header + segmented control). */
  bare?: boolean
}

/** App-level navigation bar: brand on the left, account avatar trailing. */
export function Header({ bare = false }: HeaderProps) {
  const { user, profile } = useAuth()
  const label = (profile?.first_name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email

  const row = (
    <div className="mx-auto flex h-11 w-full max-w-[600px] items-center justify-between px-4">
      <Link
        to="/"
        aria-label="TM Express home"
        className="flex h-11 items-center active:opacity-60"
      >
        <Logo className="h-[24px] w-auto text-text-primary" />
      </Link>
      <Link
        to="/profile"
        aria-label={`Profile — ${displayName ?? ''}`}
        title={displayName ?? undefined}
        className="flex size-11 items-center justify-center active:opacity-60"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="size-[30px] rounded-full object-cover" />
        ) : (
          <span className="flex size-[30px] items-center justify-center rounded-full bg-accent text-[14px] font-semibold text-white">
            {label}
          </span>
        )}
      </Link>
    </div>
  )

  if (bare) return row

  return (
    <header className="ios-bar sticky top-0 z-30 border-b-[0.5px] border-border-divider pt-[env(safe-area-inset-top)]">
      {row}
    </header>
  )
}
