import { useEffect, useState } from 'react'
import { TournamentStandings } from '../components/TournamentStandings'
import { fetchPublicProfiles } from '../services/auth'
import { computeAllTimeLeaderboard, listAllCompletedMatches } from '../services/leaderboard'
import type { LeaderboardRow, PublicProfile } from '../types'

export function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const matches = await listAllCompletedMatches()
      const leaderboardRows = computeAllTimeLeaderboard(matches)
      setRows(leaderboardRows)
      setProfiles(await fetchPublicProfiles(leaderboardRows.map((r) => r.userId)))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading leaderboard…</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">All-time leaderboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ranked by wins, then win %, then point differential — across every completed match, all tournaments.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <TournamentStandings rows={rows} profiles={profiles} />
      </div>
    </div>
  )
}
