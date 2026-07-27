import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicProfiles } from '../../services/auth'
import { listMatchesForTournament } from '../../services/fixtures'
import { getCourtsByIds } from '../../services/locations'
import { getTournament } from '../../services/tournaments'
import type { Court, Match, PublicProfile, Tournament } from '../../types'

export function AdminFixturesPrintPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!tournamentId) return
      setLoading(true)
      const [t, matchList] = await Promise.all([
        getTournament(tournamentId),
        listMatchesForTournament(tournamentId),
      ])
      setTournament(t)
      setMatches(matchList)

      if (t) {
        const courtList = await getCourtsByIds(t.courtIds)
        setCourts(courtList)
        const involvedIds = matchList.flatMap((m) => [...m.teamA, ...m.teamB])
        setProfiles(await fetchPublicProfiles(involvedIds))
      }
      setLoading(false)
    }
    load()
  }, [tournamentId])

  if (loading || !tournament) return <p className="text-slate-500">Loading…</p>

  const courtNameById = Object.fromEntries(courts.map((c) => [c.id, c.name]))
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)

  function playerNames(userIds: string[]) {
    return userIds.map((id) => profiles[id]?.displayName ?? 'Unknown').join(' & ')
  }

  return (
    <div className="space-y-4 bg-white p-6 font-sans">
      <div className="border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <p className="text-sm text-slate-600">
          {tournament.date?.toDate().toLocaleDateString()} · {tournament.type}
        </p>
      </div>

      {rounds.map((round) => (
        <div key={round} className="page-break">
          <h2 className="mb-3 text-lg font-semibold">Round {round + 1}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left">
                  Match
                </th>
                <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left">
                  Court
                </th>
                <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-left">Players</th>
                <th className="border border-slate-300 bg-slate-100 px-2 py-1 text-center">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {matches
                .filter((m) => m.round === round)
                .map((match) => (
                  <tr key={match.id}>
                    <td className="border border-slate-300 px-2 py-1">#{match.matchNumber}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      {courtNameById[match.courtId ?? ''] ?? '–'}
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      {playerNames(match.teamA)} vs {playerNames(match.teamB)}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center">__ – __</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="mt-6 border-t border-slate-300 pt-4 text-center">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 print:hidden"
        >
          Print / Save as PDF
        </button>
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .page-break { page-break-after: auto; }
          button { display: none; }
        }
      `}</style>
    </div>
  )
}
