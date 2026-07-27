import type { Court, Match, PublicProfile } from '../types'

function playerNames(userIds: string[], profiles: Record<string, PublicProfile>) {
  return userIds.map((id) => profiles[id]?.displayName ?? 'Unknown player').join(' & ')
}

export function FixturesList({
  matches,
  courts,
  profiles,
}: {
  matches: Match[]
  courts: Court[]
  profiles: Record<string, PublicProfile>
}) {
  if (matches.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No fixtures generated yet.</p>
  }

  const courtNameById = Object.fromEntries(courts.map((c) => [c.id, c.name]))
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <div key={round}>
          <h3 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Round {round + 1}
          </h3>
          <ul className="space-y-2">
            {matches
              .filter((m) => m.round === round)
              .map((match) => (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <span className="text-slate-500 dark:text-slate-400">
                    Match {match.matchNumber} · {courtNameById[match.courtId ?? ''] ?? 'Court TBD'}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {playerNames(match.teamA, profiles)} vs {playerNames(match.teamB, profiles)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
