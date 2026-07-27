// Tournament and all-time leaderboard ranking. Computed live from raw match
// results rather than precomputed aggregates — see docs/leaderboard-algorithms.md
// for why (no Cloud Functions in this project). UI-agnostic and pure so these
// are testable without Firestore.
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { LeaderboardRow, Match } from '../types'

function emptyRow(userId: string): LeaderboardRow {
  return {
    userId,
    wins: 0,
    losses: 0,
    matchesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0,
    winPct: 0,
  }
}

function foldMatches(playerIds: string[], matches: Match[]): Record<string, LeaderboardRow> {
  const rows: Record<string, LeaderboardRow> = {}
  const ensure = (id: string) => (rows[id] ??= emptyRow(id))
  playerIds.forEach(ensure)

  for (const match of matches) {
    if (match.status !== 'completed' || match.winner === null) continue
    if (match.scoreA === null || match.scoreB === null) continue

    const sides: Array<[string[], number, number, boolean]> = [
      [match.teamA, match.scoreA, match.scoreB, match.winner === 'A'],
      [match.teamB, match.scoreB, match.scoreA, match.winner === 'B'],
    ]
    for (const [players, ownScore, oppScore, won] of sides) {
      for (const playerId of players) {
        const row = ensure(playerId)
        row.matchesPlayed++
        row.pointsFor += ownScore
        row.pointsAgainst += oppScore
        row.pointDiff = row.pointsFor - row.pointsAgainst
        if (won) row.wins++
        else row.losses++
        row.winPct = row.matchesPlayed > 0 ? row.wins / row.matchesPlayed : 0
      }
    }
  }
  return rows
}

/** Wins between two players when they were on opposing teams (doubles
 * partnerships between them don't count as head-to-head opposition). */
function headToHeadWins(playerA: string, playerB: string, matches: Match[]) {
  let aWins = 0
  let bWins = 0
  for (const match of matches) {
    if (match.status !== 'completed' || match.winner === null) continue
    const aOnTeamA = match.teamA.includes(playerA)
    const aOnTeamB = match.teamB.includes(playerA)
    const bOnTeamA = match.teamA.includes(playerB)
    const bOnTeamB = match.teamB.includes(playerB)
    const opposed = (aOnTeamA && bOnTeamB) || (aOnTeamB && bOnTeamA)
    if (!opposed) continue
    const aTeam = aOnTeamA ? 'A' : 'B'
    if (match.winner === aTeam) aWins++
    else bWins++
  }
  return { aWins, bWins }
}

function compareByFallback(a: LeaderboardRow, b: LeaderboardRow) {
  return b.matchesPlayed - a.matchesPlayed || b.winPct - a.winPct
}

function compareTournamentPrimary(a: LeaderboardRow, b: LeaderboardRow) {
  return b.wins - a.wins || b.pointsFor - a.pointsFor || b.pointDiff - a.pointDiff
}

/** Wins → total points earned → point differential → head-to-head (only
 * resolves a tie between exactly 2 players — a 3+-way tie falls through to
 * the next criterion instead) → matches played → win %. */
export function computeTournamentLeaderboard(
  confirmedPlayerIds: string[],
  matches: Match[],
): LeaderboardRow[] {
  const participantIds = matches.flatMap((m) => [...m.teamA, ...m.teamB])
  const allPlayerIds = [...new Set([...confirmedPlayerIds, ...participantIds])]
  const rows = Object.values(foldMatches(allPlayerIds, matches))

  const sorted = [...rows].sort(compareTournamentPrimary)
  const result: LeaderboardRow[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length && compareTournamentPrimary(sorted[i], sorted[j]) === 0) j++
    const group = sorted.slice(i, j)
    if (group.length === 2) {
      const { aWins, bWins } = headToHeadWins(group[0].userId, group[1].userId, matches)
      if (aWins !== bWins) {
        result.push(...(aWins > bWins ? group : [group[1], group[0]]))
      } else {
        result.push(...[...group].sort(compareByFallback))
      }
    } else {
      result.push(...[...group].sort(compareByFallback))
    }
    i = j
  }
  return result
}

/** Wins → win % → point differential. Only players with at least one
 * completed match appear (see docs/leaderboard-algorithms.md for the scope
 * cut on championships/runner-ups, which need tournament archival to exist). */
export function computeAllTimeLeaderboard(matches: Match[]): LeaderboardRow[] {
  const playerIds = [...new Set(matches.flatMap((m) => [...m.teamA, ...m.teamB]))]
  const rows = Object.values(foldMatches(playerIds, matches))
  return rows.sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || b.pointDiff - a.pointDiff)
}

/** Overall stats for one player across all completed matches. */
export function computePlayerStats(userId: string, matches: Match[]): LeaderboardRow {
  const rows = foldMatches([userId], matches)
  return rows[userId] || emptyRow(userId)
}

/** Recent matches for a player, sorted newest first. */
export function computeRecentMatches(
  userId: string,
  matches: Match[],
  limit = 5,
): import('../types').RecentMatch[] {
  const completed = matches
    .filter(
      (m) =>
        m.status === 'completed' &&
        m.completedAt &&
        (m.teamA.includes(userId) || m.teamB.includes(userId)),
    )
    .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
    .slice(0, limit)

  return completed.map((m) => {
    const onTeamA = m.teamA.includes(userId)
    const scoreFor = onTeamA ? (m.scoreA ?? 0) : (m.scoreB ?? 0)
    const scoreAgainst = onTeamA ? (m.scoreB ?? 0) : (m.scoreA ?? 0)
    const won = (onTeamA && m.winner === 'A') || (!onTeamA && m.winner === 'B')
    const opponents = onTeamA ? m.teamB : m.teamA
    return {
      matchId: m.id,
      opponentNames: opponents.join(' & '),
      won,
      scoreFor,
      scoreAgainst,
      completedAt: m.completedAt!,
    }
  })
}

/** Most-frequently-faced opponents with head-to-head record. */
export function computeTopRivals(
  userId: string,
  matches: Match[],
  limit = 3,
): import('../types').TopRival[] {
  const opponentStats: Record<string, { wins: number; losses: number }> = {}

  for (const match of matches) {
    if (match.status !== 'completed' || match.winner === null) continue
    const onTeamA = match.teamA.includes(userId)
    const onTeamB = match.teamB.includes(userId)
    if (!onTeamA && !onTeamB) continue

    const opponents = onTeamA ? match.teamB : match.teamA
    const won = (onTeamA && match.winner === 'A') || (onTeamB && match.winner === 'B')

    for (const opp of opponents) {
      if (!opponentStats[opp]) opponentStats[opp] = { wins: 0, losses: 0 }
      if (won) opponentStats[opp].wins++
      else opponentStats[opp].losses++
    }
  }

  const rivals = Object.entries(opponentStats)
    .map(([oppId, stats]) => ({
      userId: oppId,
      displayName: '', // Will be filled in by component
      headToHeadWins: stats.wins,
      headToHeadLosses: stats.losses,
    }))
    .sort((a, b) => (b.headToHeadWins + b.headToHeadLosses) - (a.headToHeadWins + a.headToHeadLosses))
    .slice(0, limit)

  return rivals
}

export async function listAllCompletedMatches(): Promise<Match[]> {
  const matchesRef = collection(db, 'matches').withConverter(converter<Match>())
  const snapshot = await getDocs(query(matchesRef, where('status', '==', 'completed')))
  return snapshot.docs.map((d) => d.data())
}

/** Completed matches from published (completed status) tournaments only. */
export async function listPublishedMatches(): Promise<Match[]> {
  const matchesRef = collection(db, 'matches').withConverter(converter<Match>())
  const tournamentsRef = collection(db, 'tournaments').withConverter(converter<import('../types').Tournament>())

  const completedMatches = await getDocs(
    query(matchesRef, where('status', '==', 'completed')),
  )
  const completedTournaments = await getDocs(
    query(tournamentsRef, where('status', '==', 'completed')),
  )

  const publishedTournamentIds = new Set(completedTournaments.docs.map((d) => d.id))
  return completedMatches.docs
    .map((d) => d.data())
    .filter((m) => publishedTournamentIds.has(m.tournamentId))
}
