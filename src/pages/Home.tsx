import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function HomePage() {
  const { profile, isAdmin } = useAuth()
  if (!profile) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome, {profile.displayName}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {isAdmin ? 'Manage locations, tournaments, and registrations.' : 'Find and join upcoming tournaments.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/tournaments"
          className="rounded-lg border border-slate-200 bg-white p-5 hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Tournaments</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Browse open tournaments and register.
          </p>
        </Link>

        {isAdmin && (
          <>
            <Link
              to="/admin/locations"
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Locations & courts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage venues and their courts.
              </p>
            </Link>
            <Link
              to="/admin/tournaments"
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-emerald-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Manage tournaments</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create tournaments and review registrations.
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
