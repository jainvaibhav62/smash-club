import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PlayerStatsCard } from '../components/PlayerStatsCard'
import { LandingPage } from './Landing'
import { computePlayerStats, computeRecentMatches, computeTopRivals, listAllCompletedMatches } from '../services/leaderboard'
import { fetchPublicProfiles } from '../services/auth'
import type { LeaderboardRow, PublicProfile, RecentMatch, TopRival } from '../types'

export function HomePage() {
  const { profile, firebaseUser, isAdmin } = useAuth()
  const [stats, setStats] = useState<LeaderboardRow | null>(null)
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([])
  const [topRivals, setTopRivals] = useState<TopRival[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [loadingStats, setLoadingStats] = useState(true)

  // Check if user is logged in but hasn't verified email (email signup)
  const isUnverifiedEmailUser = firebaseUser && firebaseUser.email && !firebaseUser.emailVerified && !profile

  useEffect(() => {
    if (!profile) return
    async function load() {
      setLoadingStats(true)
      const matches = await listAllCompletedMatches()
      const playerStats = computePlayerStats(profile!.uid, matches)

      // Collect all opponent IDs from recent matches
      const recentCompleted = matches
        .filter(
          (m) =>
            m.status === 'completed' &&
            m.completedAt &&
            (m.teamA.includes(profile!.uid) || m.teamB.includes(profile!.uid)),
        )
        .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
        .slice(0, 5)

      const opponentIds = new Set<string>()
      recentCompleted.forEach((m) => {
        const opponents = m.teamA.includes(profile!.uid) ? m.teamB : m.teamA
        opponents.forEach((id) => opponentIds.add(id))
      })

      const rivals = computeTopRivals(profile!.uid, matches, 3)
      const rivalIds = rivals.map((r) => r.userId)

      // Fetch profiles for all opponents and rivals
      const allIds = Array.from(new Set([...opponentIds, ...rivalIds]))
      const fetchedProfiles = await fetchPublicProfiles(allIds)

      const recent = computeRecentMatches(profile!.uid, matches, fetchedProfiles, 5)

      setStats(playerStats)
      setRecentMatches(recent)
      setTopRivals(rivals)
      setProfiles(fetchedProfiles)
      setLoadingStats(false)
    }
    load()
  }, [profile?.uid])

  // Show message if unverified email user tries to login
  if (isUnverifiedEmailUser) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-900 dark:bg-orange-950/30">
        <div className="mb-4 text-center">
          <div className="mb-3 text-4xl">📧</div>
          <h1 className="mb-2 text-xl font-bold text-orange-900 dark:text-orange-100">
            Verify your email to continue
          </h1>
          <p className="text-sm text-orange-800 dark:text-orange-200">
            We sent a verification link to <strong>{firebaseUser.email}</strong>
          </p>
        </div>

        <div className="space-y-3 rounded-md bg-white p-3 dark:bg-slate-800">
          <div className="flex gap-2 text-sm">
            <span className="text-lg">1️⃣</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Check your inbox</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Look for an email from Smash Club</p>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-lg">2️⃣</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Check spam folder</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Sometimes emails end up there by mistake</p>
            </div>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-lg">3️⃣</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Click the link</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Verify your email to access your account</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-orange-700 dark:text-orange-300">
          Once verified, you'll have full access to Smash Club
        </p>
      </div>
    )
  }

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
