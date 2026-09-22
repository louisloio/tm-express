import logo from '../assets/logo.svg'
import { useAuth } from '../context/AuthContext'

export function Header() {
  const { user, signOut } = useAuth()
  const label = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-border-divider bg-bg-white px-6">
      <img src={logo} alt="TM Express" className="h-[18px] w-auto" />
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex items-center gap-2"
        title="Sign out"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-from text-sm font-medium text-white">
          {label}
        </span>
        <span className="max-w-[160px] truncate text-[16px] text-text-primary">
          {user?.email}
        </span>
      </button>
    </header>
  )
}
