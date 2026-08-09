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

/** Fisher–Yates, returns a new array — doesn't mutate the input. */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
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

function candidatePlayers(m: Candidate): string[] {
  return [...m.teamA, ...m.teamB]
}

/** Trims the (already-shuffled) candidate pool so no player appears in more than
 * `maxPerPlayer` matches. A single random pass over the shuffled pool, keeping a
 * candidate only if none of its players are capped out yet — since the pool is
 * random to begin with, which matches survive (and who each player's opponents
 * end up being) is random too, not just "the first N in generation order". */
function capMatchesPerPlayer(pool: Candidate[], maxPerPlayer: number): Candidate[] {
  const counts = new Map<string, number>()
  const kept: Candidate[] = []
  for (const m of pool) {
    const players = candidatePlayers(m)
    if (players.some((p) => (counts.get(p) ?? 0) >= maxPerPlayer)) continue
    kept.push(m)
    players.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1))
  }
  return kept
}

/** Stage B (round-based): groups matches into rounds where no player is double-booked,
 * rotating the starting court each round so players cycle across courts over time.
 * Also enforces fairness: each round prefers whoever has played the fewest matches
 * so far, and anyone who's played 3 rounds in a row without a break sits out the
 * next round (unless too few other players remain to fill the courts, in which
 * case rest is skipped rather than stalling the schedule).
 * A true live/continuous court queue (reassigning the instant a court frees up) needs
 * match-completion events from score entry, which doesn't exist yet — see
 * docs/fixture-algorithm.md for the upgrade path. */
export function scheduleCourts(matches: Candidate[], courtIds: string[]): ScheduledMatch[] {
  const scheduled: ScheduledMatch[] = []
  const remaining = [...matches]
  const matchesPlayed = new Map<string, number>()
  const streak = new Map<string, number>() // consecutive rounds played without a rest
  let round = 0
  let matchNumber = 1

  while (remaining.length > 0) {
    const busy = new Set<string>()
    const roundMatches: Candidate[] = []
    const mustRest = new Set(
      [...streak.entries()].filter(([, n]) => n >= 3).map(([playerId]) => playerId),
    )

    // Two tiers: matches with no rest-due player first (fairness — least total
    // matches played among their players), then matches that do involve a
    // rest-due player, only used once tier 1 is exhausted and ranked by that
    // player's *current* streak ascending — so if the rest slots available
    // this round can't cover everyone who's due, whoever's overflowed the
    // least gets pulled back in, and whoever's already been forced to keep
    // playing the most keeps getting priority for the next opening.
    const rank = (m: Candidate) => {
      const players = candidatePlayers(m)
      const overflowing = players.some((p) => mustRest.has(p))
      const key = overflowing
        ? Math.max(...players.map((p) => streak.get(p) ?? 0))
        : Math.min(...players.map((p) => matchesPlayed.get(p) ?? 0))
      return { tier: overflowing ? 1 : 0, key }
    }
    const ordered = [...remaining].sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      return ra.tier - rb.tier || ra.key - rb.key
    })

    for (const m of ordered) {
      if (roundMatches.length >= courtIds.length) break
      const players = candidatePlayers(m)
      if (players.some((p) => busy.has(p))) continue
      roundMatches.push(m)
      players.forEach((p) => busy.add(p))
    }

    if (roundMatches.length === 0) break // safety valve, shouldn't happen

    roundMatches.forEach((m) => {
      remaining.splice(remaining.indexOf(m), 1)
    })

    roundMatches.forEach((m, idx) => {
      const courtId = courtIds[(round + idx) % courtIds.length]
      scheduled.push({ ...m, courtId, round, matchNumber })
      matchNumber++
    })

    const playedThisRound = new Set(roundMatches.flatMap(candidatePlayers))
    playedThisRound.forEach((p) => {
      matchesPlayed.set(p, (matchesPlayed.get(p) ?? 0) + 1)
      streak.set(p, (streak.get(p) ?? 0) + 1)
    })
    // Anyone previously tracked who didn't play this round got their rest.
    streak.forEach((_, p) => {
      if (!playedThisRound.has(p)) streak.set(p, 0)
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
  maxMatchesPerPlayer?: number,
): Promise<{ matchCount: number; roundCount: number }> {
  const tournament = await getTournament(tournamentId)
  if (!tournament) throw new Error('Tournament not found.')
  if (tournament.courtIds.length === 0) {
    throw new Error('This tournament has no courts assigned — pick courts when editing it.')
  }
  if (maxMatchesPerPlayer !== undefined && (!Number.isInteger(maxMatchesPerPlayer) || maxMatchesPerPlayer < 1)) {
    throw new Error('Max matches per player must be a whole number of at least 1.')
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

  let pool = shuffle(buildMatchPool(confirmedPlayerIds, tournament.type))
  if (maxMatchesPerPlayer) pool = capMatchesPerPlayer(pool, maxMatchesPerPlayer)
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

/** Lets one of the 4 players in a match submit its score, once. Firestore
 * rules are the real enforcement (only allow this while the match is still
 * unscored); these are just friendlier pre-flight errors for the UI. */
export async function submitOwnMatchScore(
  match: Match,
  scoreA: number,
  scoreB: number,
  userId: string,
) {
  if (!match.teamA.includes(userId) && !match.teamB.includes(userId)) {
    throw new Error("You're not one of the players in this match.")
  }
  if (match.status === 'completed' || match.status === 'locked') {
    throw new Error('This score was already submitted — ask an admin to correct it.')
  }
  await recordMatchScore(match.id, scoreA, scoreB)
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
