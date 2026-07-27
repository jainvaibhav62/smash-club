import type { LeaderboardRow, PublicProfile } from '../types'

export function TournamentStandings({
  rows,
  profiles,
}: {
  rows: LeaderboardRow[]
  profiles: Record<string, PublicProfile>
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No standings yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <th className="py-1.5 pr-3 font-medium">#</th>
            <th className="py-1.5 pr-3 font-medium">Player</th>
            <th className="py-1.5 pr-3 text-right font-medium">W</th>
            <th className="py-1.5 pr-3 text-right font-medium">L</th>
            <th className="py-1.5 pr-3 text-right font-medium">Win%</th>
            <th className="py-1.5 text-right font-medium">Diff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.userId} className="border-b border-slate-100 last:border-0 dark:border-slate-900">
              <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{i + 1}</td>
              <td className="py-1.5 pr-3 font-medium text-slate-900 dark:text-slate-100">
                {profiles[row.userId]?.displayName ?? 'Unknown player'}
              </td>
              <td className="py-1.5 pr-3 text-right">{row.wins}</td>
              <td className="py-1.5 pr-3 text-right">{row.losses}</td>
              <td className="py-1.5 pr-3 text-right">
                {row.matchesPlayed > 0 ? `${Math.round(row.winPct * 100)}%` : '–'}
              </td>
              <td className="py-1.5 text-right">
                {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
