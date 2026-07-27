import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { ensureUserProfile, signInWithGoogle, signOut, subscribeToAuthState } from '../services/auth'
import type { UserProfile } from '../types'

interface AuthContextValue {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  showOnboarding: boolean
  dismissOnboarding: () => void
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setFirebaseUser(user)
      if (user) {
        const { profile: userProfile, isNew } = await ensureUserProfile(user)
        setProfile(userProfile)
        if (isNew) setShowOnboarding(true)
      } else {
        setProfile(null)
        setShowOnboarding(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function refreshProfile() {
    if (!firebaseUser) return
    const { profile: userProfile } = await ensureUserProfile(firebaseUser)
    setProfile(userProfile)
  }

  async function signIn() {
    const { profile: userProfile, isNew } = await signInWithGoogle()
    setProfile(userProfile)
    if (isNew) setShowOnboarding(true)
  }

  function dismissOnboarding() {
    setShowOnboarding(false)
  }

  async function signOutUser() {
    await signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        showOnboarding,
        dismissOnboarding,
        signIn,
        signOutUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
