import { useEffect, useState } from 'react'
import { TournamentStandings } from '../components/TournamentStandings'
import { fetchPublicProfiles } from '../services/auth'
import { computeAllTimeLeaderboard, listAllCompletedMatches } from '../services/leaderboard'
import { listTournaments } from '../services/tournaments'
import type { LeaderboardRow, PublicProfile, Tournament } from '../types'

export function LandingPage() {
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [matches, tournaments] = await Promise.all([
        listAllCompletedMatches(),
        listTournaments(),
      ])

      const leaderboard = computeAllTimeLeaderboard(matches)
      setLeaderboardRows(leaderboard)
      setProfiles(await fetchPublicProfiles(leaderboard.map((r) => r.userId)))

      const now = new Date()
      const upcoming = tournaments
        .filter((t) => t.date?.toDate() > now)
        .sort((a, b) => (a.date?.toMillis() ?? 0) - (b.date?.toMillis() ?? 0))
        .slice(0, 5)
      setUpcomingTournaments(upcoming)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-12">
      {/* Hero section */}
      <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 p-12 text-center dark:from-emerald-950/30 dark:to-blue-950/30">
        <h1 className="mb-3 text-4xl font-bold text-emerald-900 dark:text-emerald-300">
          🏸 Smash Club
        </h1>
        <p className="mb-2 text-lg text-emerald-700 dark:text-emerald-400">
          Where badminton meets community
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sign up to register for tournaments, track your stats, and challenge rivals.
        </p>
      </div>

      {/* All-time leaderboard preview */}
      {leaderboardRows.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              All-time leaderboard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Top performers across all completed tournaments
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <TournamentStandings rows={leaderboardRows.slice(0, 10)} profiles={profiles} />
          </div>
        </div>
      )}

      {/* Upcoming tournaments */}
      {upcomingTournaments.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Coming tournaments
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in to register and compete
            </p>
          </div>
          <ul className="space-y-2">
            {upcomingTournaments.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{t.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.date?.toDate().toLocaleDateString() ?? ''} · {t.type} · {t.maxPlayers} max
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Call to action */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Ready to join the club? Sign in to see your stats, register for tournaments, and more.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Look for the buttons at the top right to sign up or log in.
        </p>
      </div>
    </div>
  )
}
