import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listTournaments } from '../services/tournaments'
import { listRegistrationsForUser, registerForTournament } from '../services/registrations'
import type { Registration, Tournament } from '../types'

export function TournamentsPage() {
  const { profile } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [tournamentList, myRegistrations] = await Promise.all([
      listTournaments(),
      profile ? listRegistrationsForUser(profile.uid) : Promise.resolve([]),
    ])
    setTournaments(tournamentList)
    setRegistrations(myRegistrations)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid])

  async function handleRegister(tournamentId: string) {
    if (!profile) return
    setRegisteringId(tournamentId)
    await registerForTournament(tournamentId, profile.uid)
    await load()
    setRegisteringId(null)
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
          return (
            <li
              key={tournament.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{tournament.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tournament.date?.toDate?.().toLocaleDateString() ?? ''} · {tournament.type} ·{' '}
                  {tournament.maxPlayers} players max
                </p>
                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {tournament.status.replace('_', ' ')}
                </span>
              </div>

              {registration ? (
                <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {registration.status === 'pending' && 'Registration pending'}
                  {registration.status === 'confirmed' && 'You’re confirmed'}
                  {registration.status === 'rejected' && 'Registration rejected'}
                  {registration.status === 'withdrawn' && 'Withdrawn'}
                </span>
              ) : (
                <button
                  onClick={() => handleRegister(tournament.id)}
                  disabled={registeringId === tournament.id || tournament.status !== 'registration_open'}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {registeringId === tournament.id ? 'Registering…' : 'Register'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
