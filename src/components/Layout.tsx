import type { ReactNode } from 'react'
import { NavBar } from './NavBar'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
