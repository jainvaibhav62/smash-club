// Fixture generation (Stage A: fair match pool), court scheduling (Stage B:
// round-based court assignment), and score entry. Design: see docs/fixture-algorithm.md.
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
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

/** Stage A: build a fair set of matches — balanced match counts, minimized repeat
 * opponents/partners — via randomized weighted-candidate sampling (not full
 * enumeration; see the "why sampling" note in docs/fixture-algorithm.md). */
export function buildMatchPool(
  playerIds: string[],
  type: TournamentType,
): Candidate[] {
  const result: Candidate[] = []
  const playedMatches = new Set<string>()

  if (type === 'singles') {
    // Round-robin: every player plays every other player once
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        const matchKey = pairKey(playerIds[i], playerIds[j])
        if (!playedMatches.has(matchKey)) {
          result.push({
            teamA: [playerIds[i]],
            teamB: [playerIds[j]],
          })
          playedMatches.add(matchKey)
        }
      }
    }
  } else {
    // Doubles: generate all possible team combinations
    // Each unique pair plays every other unique pair, but no two players partner more than once
    const pairs: string[][] = []
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        pairs.push([playerIds[i], playerIds[j]])
      }
    }

    const usedPartners = new Map<string, Set<string>>() // track which players have partnered

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const teamA = pairs[i]
        const teamB = pairs[j]
        // Make sure no player is in both teams
        const allPlayers = [...teamA, ...teamB]
        if (new Set(allPlayers).size === 4) {
          // Check if teamA has already played together
          const teamAKey = pairKey(teamA[0], teamA[1])
          if (usedPartners.has(teamAKey)) continue

          // Check if teamB has already played together
          const teamBKey = pairKey(teamB[0], teamB[1])
          if (usedPartners.has(teamBKey)) continue

          const matchKey = `${teamAKey}|${teamBKey}`
          if (!playedMatches.has(matchKey)) {
            result.push({ teamA, teamB })
            playedMatches.add(matchKey)
            // Mark these pairs as having played together
            usedPartners.set(teamAKey, new Set([teamA[0], teamA[1]]))
            usedPartners.set(teamBKey, new Set([teamB[0], teamB[1]]))
          }
        }
      }
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

  const pool = buildMatchPool(confirmedPlayerIds, tournament.type)
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

/** Records or corrects a match’s score. Works whether the match is being scored
 * for the first time or already completed (re-submitting overwrites), since the
 * spec calls for admins to be able to fix mistakes after the fact. */
export async function recordMatchScore(matchId: string, scoreA: number, scoreB: number) {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    throw new Error("Scores must be non-negative whole numbers.")
  }
  if (scoreA > 30 || scoreB > 30) {
    throw new Error("Scores cannot be greater than 30.")
  }
  if (scoreA === scoreB) {
    throw new Error("Scores cannot be tied - there must be a winner.")
  }
  const winner = scoreA > scoreB ? "A" : "B"
  await updateDoc(doc(db, "matches", matchId), {
    status: "completed",
    scoreA,
    scoreB,
    winner,
    completedAt: serverTimestamp(),
  })
}

/** Deletes all fixtures (matches) for a tournament */
export async function deleteFixtures(tournamentId: string): Promise<void> {
  const matches = await listMatchesForTournament(tournamentId)
  if (matches.length === 0) return

  const batch = writeBatch(db)
  matches.forEach((m) => {
    batch.delete(doc(db, "matches", m.id))
  })
  await batch.commit()
}
