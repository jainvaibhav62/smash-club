# Fixture Generation & Court Scheduling Algorithm

Target scale: small club sessions, roughly **8–32 confirmed players** per tournament. The design below is a good fit for that range; it is not intended to schedule hundreds of concurrent players (see "Scaling beyond this" at the bottom).

The spec asks for continuous-queue match flow (a court starts its next match the instant it's free, not synchronized rounds), so fixture generation is split into two independent stages: **what matches should happen** (Stage A, run once) and **when/where they happen** (Stage B, run continuously).

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

**Output**: a set of `matches` docs, `status: 'pending'`, `courtId: null`.

### Why sampling instead of literal exhaustive enumeration

The original ask was to "generate all possible player combinations." For doubles at, say, 24 players, the number of valid team-vs-team matches is large enough that materializing every combination before choosing is wasted work — the greedy scorer never needs to see more than a representative batch to make a good choice at each step. Sampling a batch each iteration (e.g. a few hundred candidates) achieves the same fairness outcome — equal match counts, minimized repeats — without the memory/CPU cost of full enumeration. For small singles fields (≤16 players) the candidate space is small enough that "sample a batch" and "enumerate everything" are effectively the same thing anyway.

## Stage B — Live court scheduler

Runs every time a court becomes free (tournament start counts as every court being free at once).

1. From the pending pool, filter to matches where **all** 2–4 players are currently free (not `in_progress` on another court).
2. Rank the eligible matches by, in order:
   1. Longest time since each involved player's last completed match (maximizes rest, avoids consecutive matches for the same player).
   2. Fewest matches played so far among involved players (keeps the "roughly equal matches" property live during the event, not just on paper).
   3. Pool insertion order (stable tie-break).
3. Assign the top-ranked match to the newly-free court: set `courtId`, flip `status` to `scheduled` then `in_progress` when players check in.

This same function is reused for the admin-flexibility requirements:
- **Withdrawal before/during the tournament**: drop that player's remaining `pending` matches from the pool; optionally re-run Stage A for the remaining field if enough matches were lost to unbalance the schedule.
- **Manual court/player swap**: a direct mutation of `courtId` / `teamA` / `teamB` on a `pending` or `scheduled` match — Stage B's ranking just picks up the edited state on its next run.
- **Locking**: matches with `status: 'locked'` (post-completion) are excluded from all pool operations and edits, satisfying "prevent accidental changes."

## Scaling beyond this

If a future tournament format needs hundreds of simultaneous players, Stage A's batch size and cost-function weights become the tuning knobs — the algorithm degrades gracefully (still produces a valid, if less perfectly balanced, schedule) rather than needing a redesign. A genuinely different format (e.g. Swiss or knockout, both already on the roadmap) would plug in as an alternate Stage A only; Stage B's court scheduler is format-agnostic and would be reused as-is.
