import { Link } from 'react-router-dom'
import logo from '../assets/logo.svg'
import { useAuth } from '../context/AuthContext'

export function Header() {
  const { user, profile } = useAuth()
  const label = (profile?.first_name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border-divider bg-bg-white px-6">
      <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
      <Link to="/profile" className="flex items-center gap-2">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="size-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-from text-sm font-medium text-white">
            {label}
          </span>
        )}
        <span className="max-w-[160px] truncate text-[16px] text-text-primary">
          {displayName}
        </span>
      </Link>
    </header>
  )
}
