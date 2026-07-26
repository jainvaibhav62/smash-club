# Smash Club

Badminton tournament management app — React + TypeScript + Tailwind CSS, backed by Firebase (Auth + Firestore), deployed to GitHub Pages.

See [`docs/architecture.md`](docs/architecture.md) for the full data model, [`docs/fixture-algorithm.md`](docs/fixture-algorithm.md) for how fixtures/courts are generated, and [`docs/leaderboard-algorithms.md`](docs/leaderboard-algorithms.md) for both ranking algorithms.

## Setup

1. Create a Firebase project → enable **Authentication → Google** sign-in and **Firestore Database**.
2. Copy `.env.example` to `.env` and fill in your Firebase web app config values (Project settings → General → Your apps).
3. `npm install`
4. `npm run dev`

## Making yourself an admin

Admin access is granted manually (by design — see `docs/architecture.md`). After signing in once so your `users/{uid}` doc exists, open the Firebase console → Firestore → `users/{your-uid}` → set `role` to `"admin"`.

## Deploying

- **App**: push to `main` — `.github/workflows/deploy.yml` builds and deploys to GitHub Pages. Add your Firebase config values as repository secrets (`VITE_FIREBASE_*`, matching `.env.example`) under Settings → Secrets and variables → Actions. Enable GitHub Pages with source "GitHub Actions" under Settings → Pages.
- **Firestore rules/indexes**: `firebase deploy --only firestore` (requires the [Firebase CLI](https://firebase.google.com/docs/cli), `firebase login`, and `firebase use <project-id>`).

If your GitHub repo name isn't `smash-club`, update the `base` path in `vite.config.ts` to match.

## Project status

Implemented: auth, profiles, admin location/court management, tournament creation, player registration, admin registration approval.

Not yet built (see `docs/` for the designed approach): fixture generation, live scoring, tournament/all-time leaderboards, player stats, notifications feed, admin fixture-editing tools.
