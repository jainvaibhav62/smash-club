# Leaderboard Algorithms

**Implementation note**: the original design below this line described precomputed `tournamentStats`/`playerStats` aggregates maintained by Cloud Function triggers. That was written before this project settled into a consistent no-Cloud-Functions approach (avoiding the Blaze plan requirement, same reasoning as profile photos not using Cloud Storage — see `architecture.md`). **What's actually implemented** (`src/services/leaderboard.ts`) computes both leaderboards live, as pure functions folding over raw `matches` documents, with no `tournamentStats`/`playerStats`/`headToHead`/`config/leaderboardRules` collections actually read or written. At this app's scale (a club's tournament history), reducing over match documents at view time is cheap — the same reasoning already applied to registration counts (see "Registration & waitlist" in `architecture.md`).

Two scope cuts from the original design, both hard blockers rather than preference calls:
- **No admin-configurable tie-break weights.** `config/leaderboardRules` doesn't exist; both leaderboards use hardcoded defaults matching the order below. Adding configurability later is a small, self-contained change (a settings doc + admin form) that doesn't touch the folding logic.
- **All-time leaderboard has no championships/runner-ups/recent-form.** Nothing in this app ever sets `tournament.champion`/`runnerUp` — that needs a "complete this tournament" admin flow that doesn't exist yet. All-time ranking uses only wins/win%/point differential until tournament completion/archival is built.

## Shared folding logic

`foldMatches(playerIds, matches)` in `src/services/leaderboard.ts` seeds a zeroed row per player, then walks every `completed` match once, crediting **both** players on a doubles team identically for that match's result (wins/losses/pointsFor/pointsAgainst). This one function backs both leaderboards below — only the player set and the final sort differ.

## Tournament leaderboard

`computeTournamentLeaderboard(confirmedPlayerIds, matches)`: folds the union of confirmed registrants and anyone who's actually appeared in a match (covers a player removed after playing), then sorts:

1. **Wins** (desc)
2. **Total points earned** (desc)
3. **Point differential** (desc)
4. **Head-to-head** — only resolves a tie between exactly 2 players (direct look-up over the same match list, opposing-team encounters only — a doubles partnership between them doesn't count); a 3+-way tie on the first three criteria skips this step
5. **Matches played** (desc), then **win %** (desc) as final fallbacks — used both when head-to-head doesn't apply and when it doesn't resolve a 2-way tie either

Rendered via the shared `TournamentStandings` component wherever fixtures are already shown (admin's tournament management page, and the player-facing "View fixtures" expansion) — reusing the `matches` data already fetched there rather than issuing a separate query.

## All-time leaderboard

`computeAllTimeLeaderboard(matches)`: folds every `completed` match app-wide (`listAllCompletedMatches`, a single `where('status','==','completed')` query — no composite index needed), across only players with at least one completed match. Sorted by **wins** (desc) → **win %** (desc) → **point differential** (desc). Rendered on its own page, `/leaderboard`, linked from the nav for any signed-in user.

## Roadmap: restoring the richer design

Once a "complete tournament" admin action exists to set `champion`/`runnerUp` and transition a tournament to `archived`:
- All-time ranking can incorporate championships/runner-ups as additional sort keys.
- A `recentForm` factor (exponentially-weighted win rate over a player's last *K* matches) becomes meaningful once there's enough history per player to weight recent vs. older results differently.
- `config/leaderboardRules` can be introduced to make tie-break order and weights admin-configurable, replacing the hardcoded defaults — the fold/sort split already in `leaderboard.ts` makes this a matter of parameterizing the sort step, not rewriting the folding logic.

## Testing

Both compute functions are pure (no Firestore calls inside them — `matches`/`confirmedPlayerIds` are passed in already fetched), verified with hand-built match fixtures covering: a clean win/loss ranking, a doubles match crediting both teammates identically, unfinished matches being ignored, and a 2-way tie resolved by head-to-head.
