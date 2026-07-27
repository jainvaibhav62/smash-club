import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { NavBar } from './NavBar'
import { OnboardingModal } from './OnboardingModal'

export function Layout({ children }: { children: ReactNode }) {
  const { showOnboarding } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      {showOnboarding && <OnboardingModal />}
    </div>
  )
}
