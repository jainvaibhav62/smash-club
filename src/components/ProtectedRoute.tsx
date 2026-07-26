import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: ReactNode
  requireAdmin?: boolean
}) {
  const { profile, loading, isAdmin, signIn } = useAuth()

  if (loading) {
    return <p className="text-slate-500 dark:text-slate-400">Loading…</p>
  }

  if (!profile) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-slate-600 dark:text-slate-300">Sign in to continue.</p>
        <button
          onClick={() => signIn()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return <p className="text-slate-600 dark:text-slate-300">You don't have access to this page.</p>
  }

  return <>{children}</>
}
