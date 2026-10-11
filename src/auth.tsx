import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageLoader } from '@/components/ui'

interface AuthState {
  session: Session | null
  loading: boolean
  recovering: boolean
}

const AuthContext = createContext<AuthState>({ session: null, loading: true, recovering: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [state, setState] = useState<AuthState>({ session: null, loading: true, recovering: false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState((s) => ({ ...s, session: data.session, loading: false })))
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') qc.clear()
      setState((s) => ({ session, loading: false, recovering: event === 'PASSWORD_RECOVERY' || (s.recovering && event !== 'USER_UPDATED') }))
    })
    return () => data.subscription.unsubscribe()
  }, [qc])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function signOut() {
  return supabase.auth.signOut()
}
