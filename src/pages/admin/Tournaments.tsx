import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listLocations, listCourtsForLocation } from '../../services/locations'
import { createTournament, deleteTournament, listTournaments } from '../../services/tournaments'
import type { Court, Location, Tournament, TournamentType } from '../../types'

export function AdminTournamentsPage() {
  const { profile } = useAuth()
  const [locations, setLocations] = useState<Location[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<TournamentType>('singles')
  const [maxPlayers, setMaxPlayers] = useState(16)
  const [matchesPerPlayer, setMatchesPerPlayer] = useState(4)
  const [pointsTarget, setPointsTarget] = useState(21)
  const [locationId, setLocationId] = useState('')
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([])
  const [registrationOpensAt, setRegistrationOpensAt] = useState('')
  const [registrationClosesAt, setRegistrationClosesAt] = useState('')
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [locs, tournamentList] = await Promise.all([listLocations(), listTournaments()])
    setLocations(locs)
    setTournaments(tournamentList)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!locationId) {
      setCourts([])
      setSelectedCourtIds([])
      return
    }
    listCourtsForLocation(locationId).then(setCourts)
    setSelectedCourtIds([])
  }, [locationId])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setFormError('')
    if (
      !profile ||
      !name.trim() ||
      !date ||
      !locationId ||
      selectedCourtIds.length === 0 ||
      !registrationOpensAt ||
      !registrationClosesAt
    ) {
      return
    }
    const opensAt = new Date(registrationOpensAt)
    const closesAt = new Date(registrationClosesAt)
    if (closesAt <= opensAt) {
      setFormError('Registration close time must be after the open time.')
      return
    }

    setSubmitting(true)
    try {
      await createTournament({
        name: name.trim(),
        date: new Date(date),
        type,
        maxPlayers,
        matchesPerPlayer,
        pointsTarget,
        locationId,
        courtIds: selectedCourtIds,
        createdBy: profile.uid,
        registrationOpensAt: opensAt,
        registrationClosesAt: closesAt,
      })
      setName('')
      setDate('')
      setLocationId('')
      setSelectedCourtIds([])
      setRegistrationOpensAt('')
      setRegistrationClosesAt('')
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create tournament.')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleCourt(courtId: string) {
    setSelectedCourtIds((prev) =>
      prev.includes(courtId) ? prev.filter((id) => id !== courtId) : [...prev, courtId],
    )
  }

  async function handleDelete(tournament: Tournament) {
    if (
      !window.confirm(
        `Delete "${tournament.name}"?\n\n⚠️  This will remove all registrations and match data. This cannot be undone.`,
      )
    ) {
      return
    }
    setDeletingId(tournament.id)
    try {
      const { deletedRegistrations, deletedMatches } = await deleteTournament(tournament.id)
      await load()
      alert(
        `✓ Tournament deleted.\n${deletedRegistrations} registration(s) and ${deletedMatches} match(es) removed.`,
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete tournament.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create a tournament
        </h1>
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900"
        >
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tournament name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Type
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TournamentType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="singles">Singles</option>
              <option value="doubles">Doubles</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Max players
            </span>
            <input
              type="number"
              min={2}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Matches per player (target)
            </span>
            <input
              type="number"
              min={1}
              value={matchesPerPlayer}
              onChange={(e) => setMatchesPerPlayer(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Points target (race to)
            </span>
            <input
              type="number"
              min={1}
              value={pointsTarget}
              onChange={(e) => setPointsTarget(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Registration opens
            </span>
            <input
              type="datetime-local"
              value={registrationOpensAt}
              onChange={(e) => setRegistrationOpensAt(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Registration closes
            </span>
            <input
              type="datetime-local"
              value={registrationClosesAt}
              onChange={(e) => setRegistrationClosesAt(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Location
            </span>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Select a location…</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </label>

          {courts.length > 0 && (
            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Courts in use
              </span>
              <div className="flex flex-wrap gap-2">
                {courts.map((court) => (
                  <label
                    key={court.id}
                    className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                      selectedCourtIds.includes(court.id)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCourtIds.includes(court.id)}
                      onChange={() => toggleCourt(court.id)}
                      className="mr-1.5"
                    />
                    {court.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2"
          >
            {submitting ? 'Creating…' : 'Create tournament'}
          </button>
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{formError}</p>
          )}
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">
          All tournaments
        </h2>
        <ul className="space-y-2">
          {tournaments.map((tournament) => (
            <li
              key={tournament.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{tournament.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {tournament.status.replace('_', ' ')}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/admin/tournaments/${tournament.id}/registrations`}
                  className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Manage
                </Link>
                <button
                  onClick={() => handleDelete(tournament)}
                  disabled={deletingId === tournament.id}
                  className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                >
                  {deletingId === tournament.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
