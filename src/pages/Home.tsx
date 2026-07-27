import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PlayerStatsCard } from '../components/PlayerStatsCard'
import { LandingPage } from './Landing'
import { computePlayerStats, computeRecentMatches, computeTopRivals, listAllCompletedMatches } from '../services/leaderboard'
import { fetchPublicProfiles } from '../services/auth'
import type { LeaderboardRow, PublicProfile, RecentMatch, TopRival } from '../types'

export function HomePage() {
  const { profile, isAdmin } = useAuth()
  const [stats, setStats] = useState<LeaderboardRow | null>(null)
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([])
  const [topRivals, setTopRivals] = useState<TopRival[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!profile) return
    async function load() {
      setLoadingStats(true)
      const matches = await listAllCompletedMatches()
      const playerStats = computePlayerStats(profile!.uid, matches)
      const recent = computeRecentMatches(profile!.uid, matches, 5)
      const rivals = computeTopRivals(profile!.uid, matches, 3)

      setStats(playerStats)
      setRecentMatches(recent)
      setTopRivals(rivals)

      const rivalIds = rivals.map((r) => r.userId)
      setProfiles(await fetchPublicProfiles(rivalIds))
      setLoadingStats(false)
    }
    load()
  }, [profile?.uid])

  if (!profile) return <LandingPage />

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

      {stats && !loadingStats && (
        <PlayerStatsCard
          stats={stats}
          recentMatches={recentMatches}
          topRivals={topRivals}
          profiles={profiles}
        />
      )}

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
