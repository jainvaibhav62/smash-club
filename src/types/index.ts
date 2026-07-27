import type { Timestamp } from 'firebase/firestore'

export type Role = 'player' | 'admin'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type PlayingHand = 'left' | 'right'

/** Full profile — Firestore rules restrict reads to the owner or an admin (contains email). */
export interface UserProfile {
  uid: string
  displayName: string
  photoURL: string
  email: string
  skillLevel: SkillLevel
  gender: string
  playingHand: PlayingHand
  role: Role
  emailVerified?: boolean
  createdAt: Timestamp
}

/** Public-safe subset — readable by any signed-in user (no email/gender). */
export interface PublicProfile {
  uid: string
  displayName: string
  photoURL: string
  skillLevel: SkillLevel
}

export interface Location {
  id: string
  name: string
  address?: string
  createdAt: Timestamp
}

export interface Court {
  id: string
  locationId: string
  name: string
  isActive: boolean
}

export type TournamentType = 'singles' | 'doubles'
export type TournamentStatus =
  | 'draft'
  | 'registration_open'
  | 'confirmed'
  | 'live'
  | 'completed'
  | 'archived'

export interface Tournament {
  id: string
  name: string
  date: Timestamp
  type: TournamentType
  maxPlayers: number
  matchesPerPlayer: number
  pointsTarget: number
  locationId: string
  courtIds: string[]
  status: TournamentStatus
  registrationOpensAt?: Timestamp
  registrationClosesAt?: Timestamp
  champion?: string
  runnerUp?: string
  createdBy: string
  createdAt: Timestamp
}

/** confirmed: counts toward maxPlayers. waitlisted: registered after capacity was full.
 * withdrawn: player backed out. removed: admin kicked them. Both free a confirmed slot
 * and trigger promoting the earliest waitlisted registration. */
export type RegistrationStatus = 'confirmed' | 'waitlisted' | 'withdrawn' | 'removed'

export interface Registration {
  id: string
  tournamentId: string
  userId: string
  status: RegistrationStatus
  registeredAt: Timestamp
  decidedAt?: Timestamp
  decidedBy?: string
}

export type MatchStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'locked'

export interface Match {
  id: string
  tournamentId: string
  teamA: string[]
  teamB: string[]
  courtId: string | null
  status: MatchStatus
  scoreA: number | null
  scoreB: number | null
  winner: 'A' | 'B' | null
  queuePriority: number
  round: number
  matchNumber: number
  startedAt?: Timestamp
  completedAt?: Timestamp
}

export interface TournamentStats {
  id: string
  tournamentId: string
  userId: string
  wins: number
  losses: number
  matchesPlayed: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
}

export interface PlayerStats {
  uid: string
  tournamentsPlayed: number
  matchesPlayed: number
  wins: number
  losses: number
  winPct: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
  championships: number
  runnerUps: number
  highestRanking: number | null
  favoriteCourtId: string | null
  mostFrequentOpponentId: string | null
  mostFrequentPartnerId: string | null
}

export interface HeadToHead {
  id: string
  wins: Record<string, number>
}

export interface AppNotification {
  id: string
  type: string
  message: string
  tournamentId?: string
  read: boolean
  createdAt: Timestamp
}

export interface LeaderboardRules {
  tournamentTieBreakOrder: (
    | 'wins'
    | 'points'
    | 'pointDiff'
    | 'headToHead'
    | 'matchesPlayed'
    | 'winPct'
  )[]
  allTimeWeights: {
    wins: number
    winPct: number
    pointDiff: number
    championships: number
    runnerUps: number
    recentForm: number
  }
}

/** A player's row in either leaderboard — computed live from match results,
 * see docs/leaderboard-algorithms.md. Not a Firestore document shape. */
export interface LeaderboardRow {
  userId: string
  wins: number
  losses: number
  matchesPlayed: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number
  winPct: number
}

export interface RecentMatch {
  matchId: string
  opponentNames: string
  won: boolean
  scoreFor: number
  scoreAgainst: number
  completedAt: Timestamp
}

export interface TopRival {
  userId: string
  displayName: string
  headToHeadWins: number
  headToHeadLosses: number
}
