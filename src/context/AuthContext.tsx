import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { ensureUserProfile, signInWithGoogle, signOut, subscribeToAuthState } from '../services/auth'
import type { UserProfile } from '../types'

interface AuthContextValue {
  firebaseUser: User | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setFirebaseUser(user)
      if (user) {
        const userProfile = await ensureUserProfile(user)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function refreshProfile() {
    if (!firebaseUser) return
    const userProfile = await ensureUserProfile(firebaseUser)
    setProfile(userProfile)
  }

  async function signIn() {
    const userProfile = await signInWithGoogle()
    setProfile(userProfile)
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
