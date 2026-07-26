# Smash Club — Architecture & Data Model

## Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Router
- **Hosting**: GitHub Pages (static build; Vite `base` set to the repo name)
- **Backend**: Firebase — Firestore (database), Firebase Auth (Google Sign-In), Cloud Functions (aggregate/stat maintenance), Cloud Messaging (future push notifications)
- **Auth model**: every signed-in user gets a `users/{uid}` doc. Admins are distinguished by a `role: 'admin'` field, set manually in the Firestore console for the first admin(s) — there is no self-service admin signup.

## Why Firestore documents are shaped this way

Two ideas drive every collection below:

1. **Denormalize for read-heavy aggregates.** Leaderboards and player stats are read constantly (every page load) but only need to change on the much rarer event of a match completing. So `tournamentStats` and `playerStats` are pre-aggregated documents, kept in sync by Cloud Functions triggered on `matches/{matchId}` writes — never recomputed from the full match history at read time. This is what lets the all-time leaderboard stay fast after years of tournament history.
2. **Keep matches as the single source of truth for everything derived.** Scores, court assignments, and fixture state all live on the `matches` collection. Stats, head-to-head records, and leaderboards are all *derived* from it. If a score is corrected, the same trigger that computed the aggregate the first time re-applies the delta — there's never a second, independent place these numbers are calculated.

## Collections

```
users/{uid}                     // full profile — owner/admin read only (has email)
  displayName: string
  photoURL: string              // client-resized JPEG data: URL, or a Google account photo URL
  email: string
  skillLevel: 'beginner' | 'intermediate' | 'advanced'
  gender: string
  playingHand: 'left' | 'right'
  role: 'player' | 'admin'
  createdAt: Timestamp

publicProfiles/{uid}            // public-safe mirror — any signed-in user can read
  displayName: string
  photoURL: string
  skillLevel: 'beginner' | 'intermediate' | 'advanced'

locations/{locationId}
  name: string
  address?: string
  createdAt: Timestamp

courts/{courtId}
  locationId: string          // ref to locations
  name: string                // e.g. "Court 4"
  isActive: boolean

tournaments/{tournamentId}
  name: string
  date: Timestamp
  type: 'singles' | 'doubles'
  maxPlayers: number
  matchesPerPlayer: number     // admin-set target; drives fixture size
  pointsTarget: number         // race-to-N for this tournament's matches
  locationId: string
  courtIds: string[]           // subset of the location's courts in use
  status: 'draft' | 'registration_open' | 'confirmed' | 'live' | 'completed' | 'archived'
  champion?: string            // userId
  runnerUp?: string            // userId
  createdBy: string
  createdAt: Timestamp

registrations/{registrationId}
  tournamentId: string
  userId: string
  status: 'pending' | 'confirmed' | 'rejected' | 'withdrawn'
  registeredAt: Timestamp
  decidedAt?: Timestamp
  decidedBy?: string

matches/{matchId}
  tournamentId: string
  teamA: string[]               // 1 userId (singles) or 2 (doubles)
  teamB: string[]
  courtId: string | null        // null until the scheduler assigns it
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'locked'
  scoreA: number | null
  scoreB: number | null
  winner: 'A' | 'B' | null
  queuePriority: number         // mutable, recomputed by the scheduler
  startedAt?: Timestamp
  completedAt?: Timestamp

tournamentStats/{tournamentId}_{userId}
  tournamentId: string
  userId: string
  wins: number
  losses: number
  matchesPlayed: number
  pointsFor: number
  pointsAgainst: number
  pointDiff: number

playerStats/{userId}            // all-time, denormalized
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

headToHead/{sortedUserIdPair}   // doc id = [uidA, uidB].sort().join('_')
  wins: { [userId: string]: number }

notifications/{userId}/items/{notificationId}
  type: string
  message: string
  tournamentId?: string
  read: boolean
  createdAt: Timestamp

config/leaderboardRules          // singleton doc, admin-editable
  tournamentTieBreakOrder: ('wins'|'points'|'pointDiff'|'headToHead'|'matchesPlayed'|'winPct')[]
  allTimeWeights: {
    wins: number
    winPct: number
    pointDiff: number
    championships: number
    runnerUps: number
    recentForm: number
  }
```

## Profile photo uploads

Firebase Cloud Storage now requires the paid Blaze plan even for free-tier usage, which is unnecessary friction for a small club app. Instead, `src/services/photo.ts` center-crops and downscales an uploaded image client-side (canvas → ~200x200 JPEG, quality ~0.82) and stores it as a `data:` URL directly in `photoURL` — typically 5-30KB, well within Firestore's per-document limits. `firestore.rules` caps `photoURL` at 300KB server-side as a backstop against a crafted direct write bypassing the client resize. If photo volume/size ever outgrows this (e.g. wanting full-resolution originals), swapping in Cloud Storage later only touches `photo.ts` and the `photoURL` value it produces — no schema change needed.

## Security rules (skeleton)

- `users/{uid}`: readable only by its owner or an admin (this is where the email address lives — never exposed to other players). A user can write only their own doc (except `role`, which only an existing admin can change).
- `publicProfiles/{uid}`: the name/photo/skill-level subset every signed-in user is allowed to see (fixtures, leaderboards, registration lists) — kept in sync with `users/{uid}` by the client on profile create/update, no email or gender in it.
- `locations`, `courts`, `config/*`: public read, admin-only write.
- `tournaments`: public read; admin-only write, except a Cloud Function may flip `status` as part of fixture generation.
- `registrations`: a user can create/read their own; admin can read/write all.
- `matches`: public read; writes restricted to admins (score entry, swaps) and blocked entirely once `status == 'locked'`.
- `tournamentStats`, `playerStats`, `headToHead`: public read, write restricted to Cloud Functions (Admin SDK bypasses rules) — no client writes at all.
- `notifications/{userId}/items/*`: a user can read/mark-read only their own subtree; created by Cloud Functions.

## Service layer (`src/services/`)

One file per concern, matching the spec's "separate services" requirement:

- `auth.ts` — Google Sign-In, session state, role lookup
- `firestore.ts` — typed collection/document reference helpers, shared converters
- `fixtures.ts` — Stage A/B fixture generation and court scheduling (see `fixture-algorithm.md`)
- `leaderboard.ts` — tournament + all-time ranking (see `leaderboard-algorithms.md`)
- `stats.ts` — player statistics page queries
- `notifications.ts` — read/write the in-app notification feed

Each service is UI-agnostic (no React imports) so the algorithms are independently unit-testable.
