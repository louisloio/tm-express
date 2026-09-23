import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Mailbox, Profile } from '../types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  mailboxes: Mailbox[]
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
  refreshMailboxes: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }, [])

  const loadMailboxes = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('mailboxes')
      .select('*')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true })
    setMailboxes(data ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session) {
        void loadProfile(data.session.user.id)
        void loadMailboxes(data.session.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        void loadProfile(newSession.user.id)
        void loadMailboxes(newSession.user.id)
      } else {
        setProfile(null)
        setMailboxes([])
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadProfile, loadMailboxes])

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error: error?.message ?? null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error?.message ?? null }
  }

  async function refreshProfile() {
    if (session) await loadProfile(session.user.id)
  }

  async function refreshMailboxes() {
    if (session) await loadMailboxes(session.user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        mailboxes,
        loading,
        signUp,
        signIn,
        signOut,
        sendPasswordReset,
        updatePassword,
        refreshProfile,
        refreshMailboxes,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
