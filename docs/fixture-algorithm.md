# Fixture Generation & Court Scheduling Algorithm

Target scale: small club sessions, roughly **8–32 confirmed players** per tournament. The design below is a good fit for that range; it is not intended to schedule hundreds of concurrent players (see "Scaling beyond this" at the bottom).

The spec asks for continuous-queue match flow (a court starts its next match the instant it's free, not synchronized rounds), so fixture generation is split into two independent stages: **what matches should happen** (Stage A) and **when/where they happen** (Stage B).

**Implementation status**: Stage A is fully implemented as designed below. Stage B is currently **round-based** rather than truly live/continuous — see "Stage B" for why and what the upgrade path looks like. Both run in one shot, triggered manually by the admin's "Display Fixtures" button (`src/services/fixtures.ts` → `generateFixtures`), which also handles "redo" (a player was removed, admin wants a fresh schedule): it deletes any existing non-locked/non-completed matches for the tournament and regenerates from the current confirmed player list.

## Stage A — Match pool generation

Runs once when the admin clicks "Generate Fixtures" on a tournament with confirmed players.

**Inputs**: confirmed player list, `type` (singles/doubles), `matchesPerPlayer` (admin-set target).

**State tracked while building the pool**:
- `matchesPlayed[playerId]` — how many matches each player has been assigned so far
- `opponentCount[pairKey]` — how many times each pair of players has faced each other
- `partnerCount[pairKey]` (doubles only) — how many times each pair has been teamed together

**Candidate matches**:
- Singles: any 2 distinct players not both already at their target.
- Doubles: any 2 disjoint pairs of players (4 distinct players total) — a "team" here is just 2 players grouped for one match, not a fixed tournament-long partnership.

**Loop** until every player has reached `matchesPerPlayer` (±1 — if `N × matchesPerPlayer` doesn't divide evenly across singles pairs / doubles groups of 4, some players get one extra match; the variance term below naturally spreads that fairly rather than always picking the same players):

1. Sample a batch of candidate matches from players who haven't hit their target yet. (Random sampling, not full enumeration — see note below.)
2. Score each candidate:
   ```
   cost = w1 * opponentRepeatCount(candidate)
        + w2 * partnerRepeatCount(candidate)      // doubles only
        + w3 * variance(matchesPlayed of the 2-4 involved players)
   ```
   Lower is better. `w1`/`w2` penalize repeat matchups/partnerships; `w3` pulls the schedule toward players who've played the fewest matches so far.
3. Commit the lowest-cost candidate to the pool (randomized tie-break among near-equal candidates, so regenerating fixtures for the same field doesn't always produce an identical schedule). Update all three counters.

**Output**: an in-memory list of `{ teamA, teamB }` pairings (`buildMatchPool` in `src/services/fixtures.ts`) — nothing is written to Firestore until Stage B has also assigned courts, so the two stages produce one batch write together.

### Why sampling instead of literal exhaustive enumeration

The original ask was to "generate all possible player combinations." For doubles at, say, 24 players, the number of valid team-vs-team matches is large enough that materializing every combination before choosing is wasted work — the greedy scorer never needs to see more than a representative batch to make a good choice at each step. Sampling a batch each iteration (e.g. a few hundred candidates) achieves the same fairness outcome — equal match counts, minimized repeats — without the memory/CPU cost of full enumeration. For small singles fields (≤16 players) the candidate space is small enough that "sample a batch" and "enumerate everything" are effectively the same thing anyway.

## Stage B — Court scheduler (round-based, this pass)

True live/continuous scheduling — reassigning a court the instant a match actually finishes — needs match-completion events to react to, and score entry doesn't exist yet in this app. So Stage B currently runs once, as a batch, immediately after Stage A, rather than being re-invoked per court-freeing event. `scheduleCourts` in `src/services/fixtures.ts`:

1. Greedily fills each "round" (cap = number of courts) with matches from the Stage A output whose players aren't already playing elsewhere in that round — so no player is ever double-booked within a round, which is what actually delivers "avoid consecutive matches"/rest balancing here: a player can appear in back-to-back rounds, but never twice in the *same* round.
2. Rotates the starting court index by round number (`courtIds[(round + i) % courtIds.length]`), so players cycle across different named courts over the course of the tournament rather than always landing on the same one.
3. Writes `round` and `matchNumber` on each match for the fixture display to group/order by.

**Upgrade path to true live scheduling** (once score entry exists): keep Stage A exactly as-is (it already produces a fair, unordered match pool); replace `scheduleCourts` with a function triggered on match completion that re-ranks the *remaining* pool by rest time and picks the next match for the court that just freed up, per the original design. Nothing about the data model or Stage A needs to change for this.

Admin-flexibility notes with the current implementation:
- **Withdrawal/removal**: doesn't auto-regenerate fixtures — the admin's "Display Fixtures" button is idempotent and safe to click again (see below), so removing a player and re-clicking it is the intended "redo" flow.
- **Locking**: `generateFixtures` refuses to run at all if any existing match is `completed` or `locked`, rather than trying to regenerate around them — since score entry isn't built yet, this never actually triggers today, but it's there so a future version doesn't silently discard results.

## Scaling beyond this

If a future tournament format needs hundreds of simultaneous players, Stage A's batch size and cost-function weights become the tuning knobs — the algorithm degrades gracefully (still produces a valid, if less perfectly balanced, schedule) rather than needing a redesign. A genuinely different format (e.g. Swiss or knockout, both already on the roadmap) would plug in as an alternate Stage A only; Stage B's court scheduler is format-agnostic and would be reused as-is.
