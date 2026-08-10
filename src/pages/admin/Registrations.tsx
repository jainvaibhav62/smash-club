import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/Avatar'
import { FixturesList } from '../../components/FixturesList'
import { TournamentStandings } from '../../components/TournamentStandings'
import { fetchPublicProfiles, fetchUserProfile } from '../../services/auth'
import { deleteFixtures, generateFixtures, listMatchesForTournament, recordMatchScore } from '../../services/fixtures'
import { computeTournamentLeaderboard } from '../../services/leaderboard'
import { getCourtsByIds } from '../../services/locations'
import { countConfirmed, listRegistrationsForTournament, removeRegistration, getAvailablePlayersForTournament, bulkRegisterUsersForTournament } from '../../services/registrations'
import { getTournament, setTournamentStatus } from '../../services/tournaments'
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
  const [exactMatchesPerPlayer, setExactMatchesPerPlayer] = useState('')
  const [publishingLeaderboard, setPublishingLeaderboard] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<UserProfile[]>([])
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set())
  const [registering, setRegistering] = useState(false)
  const [registrationMessage, setRegistrationMessage] = useState('')

  async function load() {
    if (!tournamentId) return
    setLoading(true)
    const [t, regs, available] = await Promise.all([
      getTournament(tournamentId),
      listRegistrationsForTournament(tournamentId),
      getAvailablePlayersForTournament(tournamentId),
    ])
    setTournament(t)
    setRegistrations(regs)
    setAvailablePlayers(available)
    setSelectedPlayerIds(new Set())

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
      const exact = exactMatchesPerPlayer.trim() ? Number(exactMatchesPerPlayer) : undefined
      await generateFixtures(tournamentId, exact)
      await load()
    } catch (err) {
      setFixtureError(err instanceof Error ? err.message : 'Failed to generate fixtures.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDeleteFixtures() {
    if (!tournamentId) return
    if (!window.confirm('Delete all fixtures? This cannot be undone.')) return
    setGenerating(true)
    try {
      await deleteFixtures(tournamentId)
      await load()
    } catch (err) {
      setFixtureError(err instanceof Error ? err.message : 'Failed to delete fixtures.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSubmitScore(matchId: string, scoreA: number, scoreB: number) {
    await recordMatchScore(matchId, scoreA, scoreB)
    await load()
  }

  async function handlePublishLeaderboard() {
    if (!tournamentId) return
    if (!window.confirm('Publish leaderboard and lock in final standings for this tournament?')) return
    setPublishingLeaderboard(true)
    try {
      await setTournamentStatus(tournamentId, 'completed')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish leaderboard.')
    } finally {
      setPublishingLeaderboard(false)
    }
  }

  async function handleBulkRegister() {
    if (!tournamentId || selectedPlayerIds.size === 0) return
    if (!window.confirm(`Register ${selectedPlayerIds.size} player(s) for this tournament?`)) return

    setRegistering(true)
    try {
      const { registered, failed } = await bulkRegisterUsersForTournament(
        tournamentId,
        Array.from(selectedPlayerIds),
      )
      setRegistrationMessage(`✓ Registered ${registered} player(s)${failed > 0 ? ` (${failed} failed)` : ''}`)
      await load()
      setTimeout(() => setRegistrationMessage(''), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to register players.')
    } finally {
      setRegistering(false)
    }
  }

  function togglePlayerSelection(userId: string) {
    const newSelected = new Set(selectedPlayerIds)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedPlayerIds(newSelected)
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

      {availablePlayers.length > 0 && (
        <div className="space-y-3 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/20">
          <div>
            <h2 className="mb-1 text-lg font-semibold text-blue-900 dark:text-blue-100">
              Manual registration
            </h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {availablePlayers.length} player{availablePlayers.length !== 1 ? 's' : ''} not yet registered. Select to add them to this tournament.
            </p>
          </div>

          {registrationMessage && (
            <p className="rounded-md bg-green-100 p-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
              {registrationMessage}
            </p>
          )}

          <ul className="space-y-2">
            {availablePlayers.map((player) => (
              <li
                key={player.uid}
                className="flex items-center gap-3 rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-800 dark:bg-slate-900"
              >
                <input
                  type="checkbox"
                  checked={selectedPlayerIds.has(player.uid)}
                  onChange={() => togglePlayerSelection(player.uid)}
                  className="h-4 w-4 rounded"
                />
                <Avatar src={player.photoURL} name={player.displayName} size={32} />
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{player.displayName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{player.skillLevel}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={handleBulkRegister}
            disabled={selectedPlayerIds.size === 0 || registering}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {registering ? 'Registering…' : `Register ${selectedPlayerIds.size} player${selectedPlayerIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      <div className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fixtures</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              Matches per player (exact)
              <input
                type="number"
                min={1}
                step={1}
                value={exactMatchesPerPlayer}
                onChange={(e) => setExactMatchesPerPlayer(e.target.value)}
                disabled={generating || matches.some((m) => m.status === 'completed')}
                placeholder="All combinations"
                title="Every confirmed player will play exactly this many matches, chosen at random. Leave blank for the full round-robin."
                className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <button
              onClick={handleDisplayFixtures}
              disabled={generating || matches.some((m) => m.status === 'completed')}
              title={matches.some((m) => m.status === 'completed') ? 'Cannot change fixtures after scoring begins' : ''}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? 'Generating…' : matches.length > 0 ? 'Redo fixtures' : 'Display fixtures'}
            </button>
            {matches.length > 0 && (
              <>
                <a
                  href={`#/admin/tournaments/${tournamentId}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  ⬇ Download PDF
                </a>
                <button
                  onClick={handleDeleteFixtures}
                  disabled={generating || matches.some((m) => m.status === 'completed')}
                  title={matches.some((m) => m.status === 'completed') ? 'Cannot delete fixtures after scoring begins' : ''}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {generating ? 'Deleting...' : 'Delete fixtures'}
                </button>
              </>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {tournament.status === 'completed' ? '✓ Published' : 'Draft'} standings
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {matches.filter((m) => m.status === 'completed').length} of {matches.length} matches scored
              </p>
            </div>
            {matches.some((m) => m.status === 'completed') && (
              <button
                onClick={handlePublishLeaderboard}
                disabled={publishingLeaderboard}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {publishingLeaderboard ? 'Publishing…' : tournament.status === 'completed' ? 'Re-publish Leaderboard' : 'Update Leaderboard'}
              </button>
            )}
          </div>
          <TournamentStandings
            rows={computeTournamentLeaderboard(confirmed.map((r) => r.userId), matches)}
            profiles={matchProfiles}
          />
        </div>
      )}
    </div>
  )
}
