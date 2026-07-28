import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FixturesList } from '../components/FixturesList'
import { TournamentStandings } from '../components/TournamentStandings'
import { fetchPublicProfiles } from '../services/auth'
import { listMatchesForTournament } from '../services/fixtures'
import { computeTournamentLeaderboard } from '../services/leaderboard'
import { getCourtsByIds } from '../services/locations'
import {
  listRegistrationsForTournament,
  listRegistrationsForUser,
  registerForTournament,
  waitlistPosition,
  withdrawRegistration,
} from '../services/registrations'
import { getRegistrationPhase, listTournaments } from '../services/tournaments'
import type { Court, Match, PublicProfile, Registration, Tournament } from '../types'

const NOT_OPEN_MESSAGE = (opensAt: Date) =>
  `🏸 Hold your shuttlecocks! Registration opens ${opensAt.toLocaleString()}. The sign-up sheet is still in witness protection until then.`

export function TournamentsPage() {
  const { profile } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [waitlistPositions, setWaitlistPositions] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedFixtures, setExpandedFixtures] = useState<string | null>(null)
  const [fixtureData, setFixtureData] = useState<{
    matches: Match[]
    courts: Court[]
    profiles: Record<string, PublicProfile>
    confirmedPlayerIds: string[]
  } | null>(null)
  const [fixturesLoading, setFixturesLoading] = useState(false)

  async function load() {
    setLoading(true)
    const [tournamentList, myRegistrations] = await Promise.all([
      listTournaments(),
      profile ? listRegistrationsForUser(profile.uid) : Promise.resolve([]),
    ])
    setTournaments(tournamentList)
    setRegistrations(myRegistrations)

    const waitlistedRegs = myRegistrations.filter((r) => r.status === 'waitlisted')
    const positions: Record<string, number> = {}
    await Promise.all(
      waitlistedRegs.map(async (r) => {
        const tournamentRegs = await listRegistrationsForTournament(r.tournamentId)
        const pos = waitlistPosition(tournamentRegs, r.userId)
        if (pos) positions[r.tournamentId] = pos
      }),
    )
    setWaitlistPositions(positions)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid])

  async function handleRegister(tournamentId: string) {
    if (!profile) return
    setBusyId(tournamentId)
    await registerForTournament(tournamentId, profile.uid)
    await load()
    setBusyId(null)
  }

  async function handleWithdraw(registrationId: string, tournamentId: string) {
    setBusyId(tournamentId)
    await withdrawRegistration(registrationId)
    await load()
    setBusyId(null)
  }

  async function toggleFixtures(tournament: Tournament) {
    if (expandedFixtures === tournament.id) {
      setExpandedFixtures(null)
      setFixtureData(null)
      return
    }
    setExpandedFixtures(tournament.id)
    setFixturesLoading(true)
    const [matches, courts, tournamentRegs] = await Promise.all([
      listMatchesForTournament(tournament.id),
      getCourtsByIds(tournament.courtIds),
      listRegistrationsForTournament(tournament.id),
    ])
    const confirmedPlayerIds = tournamentRegs
      .filter((r) => r.status === 'confirmed')
      .map((r) => r.userId)
    const involvedIds = [...matches.flatMap((m) => [...m.teamA, ...m.teamB]), ...confirmedPlayerIds]
    const profiles = await fetchPublicProfiles(involvedIds)
    setFixtureData({ matches, courts, profiles, confirmedPlayerIds })
    setFixturesLoading(false)
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading tournaments…</p>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tournaments</h1>
      {tournaments.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">No tournaments yet.</p>
      )}
      <ul className="space-y-3">
        {tournaments.map((tournament) => {
          const registration = registrations.find((r) => r.tournamentId === tournament.id)
          const isActive = registration?.status === 'confirmed' || registration?.status === 'waitlisted'
          const phase = getRegistrationPhase(tournament)
          const opensAt = tournament.registrationOpensAt?.toDate()

          return (
            <li
              key={tournament.id}
              className={`rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${
                phase === 'not_open' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">{tournament.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tournament.date?.toDate?.().toLocaleDateString() ?? ''} · {tournament.type} ·{' '}
                    {tournament.maxPlayers} players max
                  </p>
                </div>

                {phase === 'not_open' && !isActive && (
                  <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Not open yet
                  </span>
                )}

                {phase !== 'not_open' &&
                  (isActive ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {registration!.status === 'confirmed'
                          ? "You're confirmed! 🎉"
                          : `Waitlisted (#${waitlistPositions[tournament.id] ?? '?'})`}
                      </span>
                      {tournament.status !== 'completed' && (
                        <button
                          onClick={() => handleWithdraw(registration!.id, tournament.id)}
                          disabled={busyId === tournament.id || phase === 'closed'}
                          title={phase === 'closed' ? 'Registration deadline has passed' : ''}
                          className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  ) : phase === 'open' ? (
                    <button
                      onClick={() => handleRegister(tournament.id)}
                      disabled={busyId === tournament.id}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === tournament.id ? 'Registering…' : 'Register'}
                    </button>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Registration closed
                    </span>
                  ))}
              </div>

              {phase === 'not_open' && opensAt && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {NOT_OPEN_MESSAGE(opensAt)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={() => toggleFixtures(tournament)}
                  className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  {expandedFixtures === tournament.id ? 'Hide fixtures' : 'View fixtures'}
                </button>
                {tournament.status === 'completed' && (
                  <button
                    onClick={() => toggleFixtures(tournament)}
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    View Tournament Leaderboard
                  </button>
                )}
              </div>

              {expandedFixtures === tournament.id && (
                <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  {fixturesLoading ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading fixtures…</p>
                  ) : (
                    fixtureData && (
                      <div className="space-y-4">
                        {fixtureData.matches.length > 0 && tournament.status === 'completed' && (
                          <div>
                            <h3 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                              Final standings
                            </h3>
                            <TournamentStandings
                              rows={computeTournamentLeaderboard(
                                fixtureData.confirmedPlayerIds,
                                fixtureData.matches,
                              )}
                              profiles={fixtureData.profiles}
                            />
                          </div>
                        )}
                        {fixtureData.matches.length > 0 && tournament.status !== 'completed' && (
                          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            🍲 Standings are still marinating — check back once the tournament wraps up!
                          </div>
                        )}
                        <FixturesList
                          matches={fixtureData.matches}
                          courts={fixtureData.courts}
                          profiles={fixtureData.profiles}
                        />
                      </div>
                    )
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
