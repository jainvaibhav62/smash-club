import { useState } from 'react'
import type { Court, Match, PublicProfile } from '../types'

function playerNames(userIds: string[], profiles: Record<string, PublicProfile>) {
  return userIds.map((id) => profiles[id]?.displayName ?? 'Unknown player').join(' & ')
}

function MatchRow({
  match,
  courtName,
  profiles,
  editable,
  currentUserId,
  pointsTarget,
  onSubmitScore,
}: {
  match: Match
  courtName: string
  profiles: Record<string, PublicProfile>
  editable: boolean
  currentUserId?: string
  pointsTarget?: number
  onSubmitScore?: (matchId: string, scoreA: number, scoreB: number) => Promise<void>
}) {
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? '')
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isCompleted = match.status === 'completed'
  const isParticipant =
    !!currentUserId && (match.teamA.includes(currentUserId) || match.teamB.includes(currentUserId))
  const canAdminEdit = !!editable && match.status !== 'locked' && !!onSubmitScore
  // Player mode shows the score box on every not-yet-scored match, so players can see where
  // scoring happens even for matches they're not in — but only a participant can actually use it.
  const showPlayerBox = !editable && match.status === 'scheduled' && !!onSubmitScore
  const canPlayerSubmit = showPlayerBox && isParticipant
  const showBox = canAdminEdit || showPlayerBox
  const canSubmit = canAdminEdit || canPlayerSubmit

  async function handleSave() {
    if (!canSubmit) return
    const a = Number(scoreA)
    const b = Number(scoreB)
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a === b) {
      setError('Enter two different non-negative scores.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmitScore!(match.id, a, b)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save score.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-500 dark:text-slate-400">
          Match {match.matchNumber} · {courtName}
        </span>
        <span className="font-medium">
          <span className={isCompleted && match.winner === 'A' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}>
            {playerNames(match.teamA, profiles)}
          </span>
          {isCompleted && <span className="mx-1 text-slate-500 dark:text-slate-400">{match.scoreA}</span>}
          <span className="mx-1 text-slate-400 dark:text-slate-500">vs</span>
          <span className={isCompleted && match.winner === 'B' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}>
            {playerNames(match.teamB, profiles)}
          </span>
          {isCompleted && <span className="mx-1 text-slate-500 dark:text-slate-400">{match.scoreB}</span>}
        </span>
      </div>

      {showBox && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <input
            type="number"
            min={0}
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            placeholder="Score A"
            disabled={!canSubmit}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min={0}
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            placeholder="Score B"
            disabled={!canSubmit}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
          />
          {pointsTarget && (
            <span className="text-xs text-slate-400 dark:text-slate-500">Race to {pointsTarget}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !canSubmit}
            title={canSubmit ? '' : 'Only players in this match can submit its score'}
            className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : canAdminEdit ? (isCompleted ? 'Correct score' : 'Save score') : 'Submit score'}
          </button>
          {!canSubmit && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Only players in this match can submit its score.
            </span>
          )}
          {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
        </div>
      )}
    </li>
  )
}

export function FixturesList({
  matches,
  courts,
  profiles,
  editable = false,
  currentUserId,
  pointsTarget,
  onSubmitScore,
}: {
  matches: Match[]
  courts: Court[]
  profiles: Record<string, PublicProfile>
  editable?: boolean
  currentUserId?: string
  pointsTarget?: number
  onSubmitScore?: (matchId: string, scoreA: number, scoreB: number) => Promise<void>
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
                <MatchRow
                  key={match.id}
                  match={match}
                  courtName={courtNameById[match.courtId ?? ''] ?? 'Court TBD'}
                  profiles={profiles}
                  editable={editable}
                  currentUserId={currentUserId}
                  pointsTarget={pointsTarget}
                  onSubmitScore={onSubmitScore}
                />
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
