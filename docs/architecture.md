# Smash Club — Architecture & Data Model

## Stack

- **Frontend**: React + TypeScript, Vite, Tailwind CSS, React Router
- **Hosting**: GitHub Pages (static build; Vite `base` set to the repo name)
- **Backend**: Firebase — Firestore (database), Firebase Auth (Google Sign-In), Cloud Messaging (future push notifications). **No Cloud Functions** — this project consistently avoids them (they require the paid Blaze plan, same reasoning as skipping Cloud Storage for photos); anything that might otherwise be a server-side trigger is either computed live on the client or handled as a direct client write, documented per-feature below.
- **Auth model**: every signed-in user gets a `users/{uid}` doc. Admins are distinguished by a `role: 'admin'` field, set manually in the Firestore console for the first admin(s) — there is no self-service admin signup.

## Why Firestore documents are shaped this way

Two ideas drive every collection below:

1. **Matches are the single source of truth for everything derived.** Scores, court assignments, and fixture state all live on the `matches` collection. Leaderboards and standings are *derived* from it, computed live (`src/services/leaderboard.ts`) rather than via precomputed aggregate documents — the original design used Cloud-Function-maintained `tournamentStats`/`playerStats`/`headToHead` collections for this, but per the no-Cloud-Functions constraint above, those collections were never actually implemented; see "Registration & waitlist" below for the same live-computation pattern applied to registration counts, and `docs/leaderboard-algorithms.md` for the leaderboard folding logic. At this app's scale, reducing over match documents at view time is cheap enough that a precomputed cache isn't worth the added moving parts.
2. **Denormalize where a live computation genuinely wouldn't scale.** This principle still applies in general — it just hasn't been needed yet at this app's scale. If tournament history grows large enough that folding all matches on every leaderboard view becomes slow, that's the point to introduce a cached aggregate (maintained by a client-side write alongside score entry, not a Cloud Function).

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
  registrationOpensAt: Timestamp
  registrationClosesAt: Timestamp
  champion?: string            // userId
  runnerUp?: string            // userId
  createdBy: string
  createdAt: Timestamp

registrations/{tournamentId}_{userId}   // deterministic ID, see "Registration & waitlist" below
  tournamentId: string
  userId: string
  status: 'confirmed' | 'waitlisted' | 'withdrawn' | 'removed'
  registeredAt: Timestamp
  decidedAt?: Timestamp         // set on withdraw/remove
  decidedBy?: string            // admin uid, only set when an admin removed them

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
  round: number                 // 0-based; matches in the same round don't share a player
  matchNumber: number           // display order
  startedAt?: Timestamp
  completedAt?: Timestamp

notifications/{userId}/items/{notificationId}
  type: string
  message: string
  tournamentId?: string
  read: boolean
  createdAt: Timestamp

# --- Designed but not implemented (see docs/leaderboard-algorithms.md "Roadmap") ---
# Both leaderboards currently compute everything live from `matches` instead — no
# client writes to these, and they don't exist in the live Firestore project.
#
# tournamentStats/{tournamentId}_{userId}   wins, losses, matchesPlayed, pointsFor/Against, pointDiff
# playerStats/{userId}                      all-time totals + championships/runnerUps/highestRanking/etc.
# headToHead/{sortedUserIdPair}              wins: { [userId]: number }
# config/leaderboardRules                    admin-configurable tie-break order & weights
#   tournamentTieBreakOrder: ('wins'|'points'|'pointDiff'|'headToHead'|'matchesPlayed'|'winPct')[]
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

## Registration & waitlist

Registration is automatic, not admin-approved: the first `maxPlayers` sign-ups become `confirmed`, everyone after is `waitlisted`. Withdrawing (self) or being removed (admin) frees a slot and promotes the earliest-registered waitlisted player to `confirmed`.

- **No denormalized confirmed-count field.** `listRegistrationsForTournament` is already a cheap single-equality-field query (auto-indexed, no composite index needed). Confirmed/waitlisted counts are computed by filtering that result client-side rather than maintaining a counter on the tournament doc. This sidesteps two problems: the Firestore *client* SDK's `runTransaction` only supports single-document reads (not query reads), so a transactional counter isn't straightforward here anyway; and it avoids relaxing `tournaments` write rules to non-admins. Trade-off: two people registering in the exact same instant could theoretically both land as `confirmed` when only one slot remains — acceptable for a small recreational club app.
- **Deterministic registration doc IDs** (`{tournamentId}_{userId}`) turn "does this user already have a registration" into a direct `getDoc`, and re-registering after a withdrawal is just a `setDoc` on the same doc ID (fresh `registeredAt`, so re-registering goes to the back of the waitlist queue like a new signup).
- **Self-withdrawal promotes someone else's registration.** There's no Cloud Functions deployment in this project, so when a player backs out, *their own browser* runs the promotion logic — which means it needs to flip a *different* user's registration from `waitlisted` to `confirmed`. `firestore.rules` grants exactly that one narrow transition (single field, `waitlisted` → `confirmed` only) to any signed-in user, not just admins. This is an accepted, low-blast-radius trust decision for this app's scale — similar in spirit to the `photoURL` size cap being a backstop rather than airtight validation.

## Security rules (skeleton)

- `users/{uid}`: readable only by its owner or an admin (this is where the email address lives — never exposed to other players). A user can write only their own doc (except `role`, which only an existing admin can change).
- `publicProfiles/{uid}`: the name/photo/skill-level subset every signed-in user is allowed to see (fixtures, leaderboards, registration lists) — kept in sync with `users/{uid}` by the client on profile create/update, no email or gender in it.
- `locations`, `courts`, `config/*`: public read, admin-only write.
- `tournaments`: public read, admin-only write.
- `registrations`: a user can create/read their own with status `confirmed`/`waitlisted`, and update their own status to `confirmed`/`waitlisted`/`withdrawn` (covers re-registration); any signed-in user may additionally flip *another* registration from `waitlisted` to `confirmed` and nothing else (see "Registration & waitlist" above); admin can do anything.
- `matches`: public read; writes restricted to admins (fixture generation, score entry, swaps) and blocked entirely once `status == 'locked'`.
- `tournamentStats`, `playerStats`, `headToHead`: rules exist (public read, all writes denied) but nothing in the app reads or writes these paths — see the "designed but not implemented" note in the Collections section above.
- `notifications/{userId}/items/*`: a user can read/mark-read only their own subtree; nothing currently writes new ones (see `docs/leaderboard-algorithms.md`-style roadmap notes — this was scoped out early on in favor of reflecting status changes in-place).

## Service layer (`src/services/`)

One file per concern, matching the spec's "separate services" requirement:

- `auth.ts` — Google Sign-In, session state, role lookup
- `firestore.ts` — typed collection/document reference helpers, shared converters
- `fixtures.ts` — Stage A/B fixture generation, court scheduling, and score entry (see `fixture-algorithm.md`)
- `leaderboard.ts` — tournament + all-time ranking (see `leaderboard-algorithms.md`)
- `stats.ts` — player statistics page queries
- `notifications.ts` — read/write the in-app notification feed

Each service is UI-agnostic (no React imports) so the algorithms are independently unit-testable.
