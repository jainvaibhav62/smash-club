import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/Avatar'
import { fetchUserProfile } from '../../services/auth'
import { decideRegistration, listRegistrationsForTournament } from '../../services/registrations'
import { getTournament } from '../../services/tournaments'
import type { Registration, Tournament, UserProfile } from '../../types'

export function AdminRegistrationsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>()
  const { profile } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [players, setPlayers] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [decidingId, setDecidingId] = useState<string | null>(null)

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
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  async function handleDecide(registrationId: string, status: 'confirmed' | 'rejected') {
    if (!profile) return
    setDecidingId(registrationId)
    await decideRegistration(registrationId, status, profile.uid)
    await load()
    setDecidingId(null)
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>
  if (!tournament) return <p className="text-slate-500 dark:text-slate-400">Tournament not found.</p>

  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tournament.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {confirmedCount} / {tournament.maxPlayers} confirmed
        </p>
      </div>

      {registrations.length === 0 && (
        <p className="text-slate-500 dark:text-slate-400">No registrations yet.</p>
      )}

      <ul className="space-y-2">
        {registrations.map((registration) => {
          const player = players[registration.userId]
          return (
            <li
              key={registration.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={player?.photoURL}
                  name={player?.displayName ?? registration.userId}
                  size={32}
                />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {player?.displayName ?? registration.userId}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {player?.skillLevel}
                  </p>
                </div>
              </div>

              {registration.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecide(registration.id, 'confirmed')}
                    disabled={decidingId === registration.id}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleDecide(registration.id, 'rejected')}
                    disabled={decidingId === registration.id}
                    className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {registration.status}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
