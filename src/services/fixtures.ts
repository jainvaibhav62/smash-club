// Fixture generation (Stage A: fair match pool) and court scheduling
// (Stage B: round-based court assignment). Design: see docs/fixture-algorithm.md.
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import { listRegistrationsForTournament } from './registrations'
import { getTournament } from './tournaments'
import type { Match, TournamentType } from '../types'

const matchesRef = collection(db, 'matches').withConverter(converter<Match>())

interface Candidate {
  teamA: string[]
  teamB: string[]
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('|')
}

function pickRandomDistinct<T>(pool: T[], count: number): T[] {
  const copy = [...pool]
  const picked: T[] = []
  while (picked.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length)
    picked.push(copy.splice(index, 1)[0])
  }
  return picked
}

function sampleCandidates(pool: string[], playersPerTeam: number, batchSize: number): Candidate[] {
  const need = playersPerTeam * 2
  if (pool.length < need) return []
  const candidates: Candidate[] = []
  for (let i = 0; i < batchSize; i++) {
    const picked = pickRandomDistinct(pool, need)
    candidates.push({ teamA: picked.slice(0, playersPerTeam), teamB: picked.slice(playersPerTeam) })
  }
  return candidates
}

function candidateCost(
  candidate: Candidate,
  matchesPlayed: Record<string, number>,
  opponentCount: Record<string, number>,
  partnerCount: Record<string, number>,
): number {
  const { teamA, teamB } = candidate
  let cost = 0
  for (const a of teamA) {
    for (const b of teamB) {
      cost += 3 * (opponentCount[pairKey(a, b)] ?? 0)
    }
  }
  if (teamA.length === 2) cost += 4 * (partnerCount[pairKey(teamA[0], teamA[1])] ?? 0)
  if (teamB.length === 2) cost += 4 * (partnerCount[pairKey(teamB[0], teamB[1])] ?? 0)

  const involved = [...teamA, ...teamB]
  const counts = involved.map((p) => matchesPlayed[p] ?? 0)
  const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length
  cost += 2 * variance

  return cost
}

/** Stage A: build a fair set of matches — balanced match counts, minimized repeat
 * opponents/partners — via randomized weighted-candidate sampling (not full
 * enumeration; see the "why sampling" note in docs/fixture-algorithm.md). */
export function buildMatchPool(
  playerIds: string[],
  type: TournamentType,
  matchesPerPlayer: number,
): Candidate[] {
  const playersPerTeam = type === 'doubles' ? 2 : 1
  const matchesPlayed: Record<string, number> = {}
  const opponentCount: Record<string, number> = {}
  const partnerCount: Record<string, number> = {}
  playerIds.forEach((p) => (matchesPlayed[p] = 0))

  const result: Candidate[] = []
  const maxIterations = playerIds.length * matchesPerPlayer * 6 + 50

  for (let iter = 0; iter < maxIterations; iter++) {
    const underTarget = playerIds.filter((p) => matchesPlayed[p] < matchesPerPlayer)
    if (underTarget.length === 0) break

    const need = playersPerTeam * 2
    const pool = underTarget.length >= need ? underTarget : playerIds
    const candidates = sampleCandidates(pool, playersPerTeam, 60)
    if (candidates.length === 0) break

    let best = candidates[0]
    let bestCost = candidateCost(best, matchesPlayed, opponentCount, partnerCount)
    for (const candidate of candidates.slice(1)) {
      const cost = candidateCost(candidate, matchesPlayed, opponentCount, partnerCount)
      if (cost < bestCost) {
        best = candidate
        bestCost = cost
      }
    }

    result.push(best)
    const { teamA, teamB } = best
    for (const p of [...teamA, ...teamB]) matchesPlayed[p] = (matchesPlayed[p] ?? 0) + 1
    for (const a of teamA) {
      for (const b of teamB) {
        const key = pairKey(a, b)
        opponentCount[key] = (opponentCount[key] ?? 0) + 1
      }
    }
    if (teamA.length === 2) {
      const key = pairKey(teamA[0], teamA[1])
      partnerCount[key] = (partnerCount[key] ?? 0) + 1
    }
    if (teamB.length === 2) {
      const key = pairKey(teamB[0], teamB[1])
      partnerCount[key] = (partnerCount[key] ?? 0) + 1
    }
  }

  return result
}

export interface ScheduledMatch extends Candidate {
  courtId: string
  round: number
  matchNumber: number
}

/** Stage B (round-based): groups matches into rounds where no player is double-booked,
 * rotating the starting court each round so players cycle across courts over time.
 * A true live/continuous court queue (reassigning the instant a court frees up) needs
 * match-completion events from score entry, which doesn't exist yet — see
 * docs/fixture-algorithm.md for the upgrade path. */
export function scheduleCourts(matches: Candidate[], courtIds: string[]): ScheduledMatch[] {
  const scheduled: ScheduledMatch[] = []
  const remaining = [...matches]
  let round = 0
  let matchNumber = 1

  while (remaining.length > 0) {
    const busy = new Set<string>()
    const roundMatches: Candidate[] = []

    for (let i = 0; i < remaining.length && roundMatches.length < courtIds.length; ) {
      const players = [...remaining[i].teamA, ...remaining[i].teamB]
      if (players.every((p) => !busy.has(p))) {
        roundMatches.push(remaining[i])
        players.forEach((p) => busy.add(p))
        remaining.splice(i, 1)
      } else {
        i++
      }
    }

    if (roundMatches.length === 0) break // safety valve, shouldn't happen

    roundMatches.forEach((m, idx) => {
      const courtId = courtIds[(round + idx) % courtIds.length]
      scheduled.push({ ...m, courtId, round, matchNumber })
      matchNumber++
    })
    round++
  }

  return scheduled
}

export async function listMatchesForTournament(tournamentId: string): Promise<Match[]> {
  const snapshot = await getDocs(query(matchesRef, where('tournamentId', '==', tournamentId)))
  return snapshot.docs.map((d) => d.data()).sort((a, b) => a.matchNumber - b.matchNumber)
}

export async function generateFixtures(
  tournamentId: string,
): Promise<{ matchCount: number; roundCount: number }> {
  const tournament = await getTournament(tournamentId)
  if (!tournament) throw new Error('Tournament not found.')
  if (tournament.courtIds.length === 0) {
    throw new Error('This tournament has no courts assigned — pick courts when editing it.')
  }

  const registrations = await listRegistrationsForTournament(tournamentId)
  const confirmedPlayerIds = registrations.filter((r) => r.status === 'confirmed').map((r) => r.userId)
  const minPlayers = tournament.type === 'doubles' ? 4 : 2
  if (confirmedPlayerIds.length < minPlayers) {
    throw new Error(`Need at least ${minPlayers} confirmed players to generate fixtures.`)
  }

  const existingMatches = await listMatchesForTournament(tournamentId)
  if (existingMatches.some((m) => m.status === 'completed' || m.status === 'locked')) {
    throw new Error('Some matches already have recorded results, so fixtures can’t be regenerated.')
  }

  const pool = buildMatchPool(confirmedPlayerIds, tournament.type, tournament.matchesPerPlayer)
  const scheduled = scheduleCourts(pool, tournament.courtIds)

  const batch = writeBatch(db)
  existingMatches.forEach((m) => batch.delete(doc(db, 'matches', m.id)))
  scheduled.forEach((m) => {
    const ref = doc(matchesRef)
    batch.set(ref, {
      id: ref.id,
      tournamentId,
      teamA: m.teamA,
      teamB: m.teamB,
      courtId: m.courtId,
      status: 'scheduled',
      scoreA: null,
      scoreB: null,
      winner: null,
      queuePriority: m.matchNumber,
      round: m.round,
      matchNumber: m.matchNumber,
    } as unknown as Match)
  })
  await batch.commit()

  const roundCount = scheduled.length > 0 ? Math.max(...scheduled.map((m) => m.round)) + 1 : 0
  return { matchCount: scheduled.length, roundCount }
}
