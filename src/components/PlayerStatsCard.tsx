import type { LeaderboardRow, PublicProfile, RecentMatch, TopRival } from '../types'

export function PlayerStatsCard({
  stats,
  recentMatches,
  topRivals,
  profiles,
}: {
  stats: LeaderboardRow
  recentMatches: RecentMatch[]
  topRivals: TopRival[]
  profiles: Record<string, PublicProfile>
}) {
  return (
    <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      {/* Overall record */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Your record
        </h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.wins}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Wins</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stats.losses}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Losses</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.matchesPlayed > 0 ? `${Math.round(stats.winPct * 100)}%` : '–'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Win rate</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                stats.pointDiff > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stats.pointDiff < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {stats.pointDiff > 0 ? '+' : ''}
              {stats.pointDiff}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Point diff</p>
          </div>
        </div>
      </div>

      {/* Recent matches */}
      {recentMatches.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Recent matches
          </h3>
          <ul className="space-y-2">
            {recentMatches.map((m) => (
              <li
                key={m.matchId}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
              >
                <span className="text-slate-600 dark:text-slate-300">vs {m.opponentNames}</span>
                <span className="font-medium">
                  <span
                    className={
                      m.won
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }
                  >
                    {m.won ? 'W' : 'L'}
                  </span>
                  {' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    {m.scoreFor}–{m.scoreAgainst}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top rivals */}
      {topRivals.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Top rivals
          </h3>
          <ul className="space-y-2">
            {topRivals.map((rival) => (
              <li
                key={rival.userId}
                className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-800"
              >
                <span className="text-slate-600 dark:text-slate-300">
                  {profiles[rival.userId]?.displayName ?? 'Unknown player'}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {rival.headToHeadWins}–{rival.headToHeadLosses}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.matchesPlayed === 0 && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          🏸 Fresh start! No completed matches yet. Go sign up for a tournament and start building that legendary record!
        </p>
      )}
    </div>
  )
}
