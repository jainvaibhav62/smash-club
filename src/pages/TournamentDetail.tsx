import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FixturesList } from '../components/FixturesList'
import { TournamentStandings } from '../components/TournamentStandings'
import { fetchPublicProfiles } from '../services/auth'
import { listMatchesForTournament, submitOwnMatchScore } from '../services/fixtures'
import { computeTournamentLeaderboard } from '../services/leaderboard'
import { getCourtsByIds } from '../services/locations'
import {
  listRegistrationsForTournament,
  listRegistrationsForUser,
  registerForTournament,
  waitlistPosition,
  withdrawRegistration,
} from '../services/registrations'
import { getRegistrationPhase, getTournament } from '../services/tournaments'
import type { Court, Match, PublicProfile, Registration, Tournament } from '../types'

const NOT_OPEN_MESSAGE = (opensAt: Date) =>
  `🏸 Hold your shuttlecocks! Registration opens ${opensAt.toLocaleString()}. The sign-up sheet is still in witness protection until then.`

export function TournamentDetailPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const { profile } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [waitlistPos, setWaitlistPos] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({})
  const [confirmedPlayerIds, setConfirmedPlayerIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function load() {
    if (!tournamentId || !profile) return
    setLoading(true)
    const t = await getTournament(tournamentId)
    if (!t) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setTournament(t)

    const [myRegistrations, tournamentRegs, matchList, courtList] = await Promise.all([
      listRegistrationsForUser(profile.uid),
      listRegistrationsForTournament(tournamentId),
      listMatchesForTournament(tournamentId),
      getCourtsByIds(t.courtIds),
    ])

    const myReg = myRegistrations.find((r) => r.tournamentId === tournamentId) ?? null
    setRegistration(myReg)
    if (myReg?.status === 'waitlisted') {
      setWaitlistPos(waitlistPosition(tournamentRegs, myReg.userId))
    } else {
      setWaitlistPos(null)
    }

    const confirmedIds = tournamentRegs.filter((r) => r.status === 'confirmed').map((r) => r.userId)
    setConfirmedPlayerIds(confirmedIds)
    setMatches(matchList)
    setCourts(courtList)

    const involvedIds = [...matchList.flatMap((m) => [...m.teamA, ...m.teamB]), ...confirmedIds]
    setProfiles(await fetchPublicProfiles(involvedIds))

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, profile?.uid])

  async function handleRegister() {
    if (!profile || !tournamentId) return
    setBusy(true)
    await registerForTournament(tournamentId, profile.uid)
    await load()
    setBusy(false)
  }

  async function handleWithdraw() {
    if (!registration) return
    setBusy(true)
    await withdrawRegistration(registration.id)
    await load()
    setBusy(false)
  }

  async function handleSubmitScore(matchId: string, scoreA: number, scoreB: number) {
    if (!profile) return
    const match = matches.find((m) => m.id === matchId)
    if (!match) return
    await submitOwnMatchScore(match, scoreA, scoreB, profile.uid)
    await load()
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading tournament…</p>
  if (notFound) return <p className="text-slate-500 dark:text-slate-400">Tournament not found.</p>
  if (!tournament) return null

  const isActive = registration?.status === 'confirmed' || registration?.status === 'waitlisted'
  const phase = getRegistrationPhase(tournament)
  const opensAt = tournament.registrationOpensAt?.toDate()

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tournament.name}</h1>
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
                    : `Waitlisted (#${waitlistPos ?? '?'})`}
                </span>
                {tournament.status !== 'completed' && (
                  <button
                    onClick={handleWithdraw}
                    disabled={busy || phase === 'closed'}
                    title={phase === 'closed' ? 'Registration deadline has passed' : ''}
                    className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            ) : phase === 'open' ? (
              <button
                onClick={handleRegister}
                disabled={busy}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? 'Registering…' : 'Register'}
              </button>
            ) : (
              <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                Registration closed
              </span>
            ))}
        </div>

        {phase === 'not_open' && opensAt && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{NOT_OPEN_MESSAGE(opensAt)}</p>
        )}
      </div>

      {matches.length > 0 && (
        <div className="space-y-4">
          {matches.some((m) => m.status === 'completed') ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {tournament.status === 'completed' ? 'Final standings' : 'Live standings'}
              </h3>
              <TournamentStandings
                rows={computeTournamentLeaderboard(confirmedPlayerIds, matches)}
                profiles={profiles}
              />
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              🍲 Standings are still marinating — check back once a match has been scored!
            </div>
          )}
          <FixturesList
            matches={matches}
            courts={courts}
            profiles={profiles}
            currentUserId={tournament.status === 'completed' ? undefined : profile?.uid}
            onSubmitScore={tournament.status === 'completed' ? undefined : handleSubmitScore}
          />
        </div>
      )}
    </div>
  )
}
