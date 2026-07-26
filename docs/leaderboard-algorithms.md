# Leaderboard Algorithms

Both leaderboards read from pre-aggregated documents (`tournamentStats`, `playerStats`) rather than recomputing from raw match history — see `architecture.md` for why. Both are configured through the single `config/leaderboardRules` doc, so an admin can retune ranking behavior without a code change or redeploy.

## Aggregate maintenance (shared by both leaderboards)

A Cloud Function triggers on `matches/{matchId}` writes where `status` transitions to `completed`:

1. In a transaction, increment `tournamentStats/{tournamentId}_{userId}` for every involved player: `matchesPlayed`, `wins`/`losses`, `pointsFor`/`pointsAgainst`, `pointDiff`.
2. Increment the corresponding fields on `playerStats/{userId}` (the all-time aggregate).
3. Update `headToHead/{sortedPair}` for every opponent pair in the match.
4. If a score is later *corrected* (admin edits a completed, unlocked match), the function computes the delta between old and new score/winner and applies that delta — it never re-derives the aggregate from scratch.

A second trigger fires on `tournaments/{tournamentId}` transitioning to `archived`: increments `tournamentsPlayed` for every participant, and `championships`/`runnerUps` for the recorded `champion`/`runnerUp`.

## Tournament leaderboard

Ranks the `tournamentStats` docs for one tournament's participants using `config/leaderboardRules.tournamentTieBreakOrder`, default:

1. **Wins** (desc)
2. **Total points earned** (desc)
3. **Point differential** (desc)
4. **Head-to-head** — only resolves a tie when exactly 2 players are tied entering this step (a direct lookup in `headToHead`); ties among 3+ players skip this step and fall through, since a 3-way head-to-head isn't a well-defined total order without a further rule.
5. **Matches played** (desc — more matches with the same record is arguably the "busier"/more consistent performer, per the spec's ordering)
6. **Win %** (desc, final tiebreaker)

This is a plain sorted read — no batch recomputation — because `tournamentStats` is already kept current by the shared aggregate maintenance above.

## All-time leaderboard

A weighted composite score computed from `playerStats`, using `config/leaderboardRules.allTimeWeights` (all admin-configurable, defaults shown):

```
score = w_wins      * totalWins
      + w_winPct     * winPct
      + w_pointDiff  * pointDiff
      + w_champ      * championships
      + w_runnerUp   * runnerUps
      + w_form        * recentForm        // optional
```

- `recentForm` (optional, off by default): an exponentially-weighted win rate over each player's last *K* matches (e.g. `K=10`), so a player's current hot/cold streak can be given some weight without letting it dominate. Configurable via `w_form`; set to `0` to disable entirely.
- `consistencyRating` (optional, future): standard deviation of point differential across matches, as a lower-is-more-consistent signal. Not included in v1's default weight set — noted here so the schema (`playerStats`) has room for it without a later migration.

Because weights are just numbers in a config doc, an admin can, for example, deprioritize championships in favor of raw win rate for a club that runs many small tournaments rather than a few big ones — without any code change.

## Testing

Both algorithms are pure functions of their input documents (no React, no direct Firestore calls inside the ranking logic itself — data is fetched first, then passed in), so they get unit tests with hand-constructed `tournamentStats`/`playerStats` fixtures covering: simple win-count ordering, a 2-way tie resolved by head-to-head, a 3+-way tie that falls through head-to-head to the next criterion, and weight-configuration changes altering all-time order.
