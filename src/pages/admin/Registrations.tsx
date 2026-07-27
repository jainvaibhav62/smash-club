import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/Avatar'
import { FixturesList } from '../../components/FixturesList'
import { TournamentStandings } from '../../components/TournamentStandings'
import { fetchPublicProfiles, fetchUserProfile } from '../../services/auth'
import { generateFixtures, listMatchesForTournament, recordMatchScore } from '../../services/fixtures'
import { computeTournamentLeaderboard } from '../../services/leaderboard'
import { getCourtsByIds } from '../../services/locations'
import { countConfirmed, listRegistrationsForTournament, removeRegistration } from '../../services/registrations'
import { getTournament } from '../../services/tournaments'
import type { Court, Match, PublicProfile, Registration, Tournament, UserProfile } from '../../types'

export function AdminRegistrationsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const { profile } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [players, setPlayers] = useState<Record<string, UserProfile>>({})
  const [courts, setCourts] = useState<Court[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [matchProfiles, setMatchProfiles] = useState<Record<string, PublicProfile>>({})
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [fixtureError, setFixtureError] = useState('')

  async function load() {
    if (!tournamentId) return
    setLoading(true)
    const [t, regs] = await Promise.all([
      getTournament(tournamentId),
      listRegistrationsForTournament(tournamentId),
    ])
    setTournament(t)
    setRegistrations(regs)

    const profiles = await Promise.all(regs.map((r) => fetchUserProfile(r.userId)))
    const map: Record<string, UserProfile> = {}
    regs.forEach((r, i) => {
      const p = profiles[i]
      if (p) map[r.userId] = p
    })
    setPlayers(map)

    if (t) {
      const [courtList, matchList] = await Promise.all([
        getCourtsByIds(t.courtIds),
        listMatchesForTournament(tournamentId),
      ])
      setCourts(courtList)
      setMatches(matchList)
      // Union with confirmed registrants, not just match participants, so
      // standings show real names for anyone who hasn't played yet.
      const involvedIds = [
        ...matchList.flatMap((m) => [...m.teamA, ...m.teamB]),
        ...regs.filter((r) => r.status === 'confirmed').map((r) => r.userId),
      ]
      setMatchProfiles(await fetchPublicProfiles(involvedIds))
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  async function handleRemove(registrationId: string) {
    if (!profile) return
    setRemovingId(registrationId)
    await removeRegistration(registrationId, profile.uid)
    await load()
    setRemovingId(null)
  }

  async function handleDisplayFixtures() {
    if (!tournamentId) return
    setGenerating(true)
    setFixtureError('')
    try {
      await generateFixtures(tournamentId)
      await load()
    } catch (err) {
      setFixtureError(err instanceof Error ? err.message : 'Failed to generate fixtures.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmitScore(matchId: string, scoreA: number, scoreB: number) {
    await recordMatchScore(matchId, scoreA, scoreB)
    await load()
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>
  if (!tournament) return <p className="text-slate-500 dark:text-slate-400">Tournament not found.</p>

  const confirmed = registrations.filter((r) => r.status === 'confirmed')
  const waitlisted = registrations
    .filter((r) => r.status === 'waitlisted')
    .sort((a, b) => (a.registeredAt?.toMillis() ?? 0) - (b.registeredAt?.toMillis() ?? 0))

  function renderPlayerRow(registration: Registration, label?: string) {
    const player = players[registration.userId]
    return (
      <li
        key={registration.id}
        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          {label && (
            <span className="w-6 text-sm font-medium text-slate-400 dark:text-slate-500">{label}</span>
          )}
          <Avatar src={player?.photoURL} name={player?.displayName ?? registration.userId} size={32} />
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {player?.displayName ?? registration.userId}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{player?.skillLevel}</p>
          </div>
        </div>
        <button
          onClick={() => handleRemove(registration.id)}
          disabled={removingId === registration.id}
          className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
        >
          {removingId === registration.id ? 'Removing…' : 'Remove'}
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tournament.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {countConfirmed(registrations)} / {tournament.maxPlayers} confirmed
          {waitlisted.length > 0 && ` · ${waitlisted.length} waitlisted`}
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confirmed</h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No confirmed players yet.</p>
        ) : (
          <ul className="space-y-2">{confirmed.map((r) => renderPlayerRow(r))}</ul>
        )}
      </div>

      {waitlisted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Waitlist</h2>
          <ul className="space-y-2">
            {waitlisted.map((r, i) => renderPlayerRow(r, `#${i + 1}`))}
          </ul>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fixtures</h2>
          <div className="flex gap-2">
            <button
              onClick={handleDisplayFixtures}
              disabled={generating}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? 'Generating…' : matches.length > 0 ? 'Redo fixtures' : 'Display fixtures'}
            </button>
            {matches.length > 0 && (
              <a
                href={`#/admin/tournaments/${tournamentId}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                ⬇ Download PDF
              </a>
            )}
          </div>
        </div>
        {fixtureError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {fixtureError}
          </p>
        )}
        <FixturesList
          matches={matches}
          courts={courts}
          profiles={matchProfiles}
          editable
          pointsTarget={tournament.pointsTarget}
          onSubmitScore={handleSubmitScore}
        />
      </div>

      {matches.length > 0 && (
        <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Standings</h2>
          <TournamentStandings
            rows={computeTournamentLeaderboard(confirmed.map((r) => r.userId), matches)}
            profiles={matchProfiles}
          />
        </div>
      )}
    </div>
  )
}
