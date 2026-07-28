import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { Tournament, TournamentStatus, TournamentType } from '../types'
import { listMatchesForTournament } from './fixtures'
import { computeTournamentLeaderboard } from './leaderboard'
import { listRegistrationsForTournament } from './registrations'

const tournamentsRef = collection(db, 'tournaments').withConverter(converter<Tournament>())

export interface CreateTournamentInput {
  name: string
  date: Date
  type: TournamentType
  maxPlayers: number
  pointsTarget: number
  locationId: string
  courtIds: string[]
  createdBy: string
  registrationOpensAt: Date
  registrationClosesAt: Date
}

export type RegistrationPhase = 'not_open' | 'open' | 'closed'

export function getRegistrationPhase(tournament: Tournament, now = new Date()): RegistrationPhase {
  if (!tournament.registrationOpensAt || !tournament.registrationClosesAt) return 'open'
  if (now < tournament.registrationOpensAt.toDate()) return 'not_open'
  if (now > tournament.registrationClosesAt.toDate()) return 'closed'
  return 'open'
}

export async function listTournaments(): Promise<Tournament[]> {
  const snapshot = await getDocs(query(tournamentsRef, orderBy('date', 'desc')))
  return snapshot.docs.map((d) => d.data())
}

export async function getTournament(id: string): Promise<Tournament | null> {
  const snapshot = await getDoc(doc(db, 'tournaments', id).withConverter(converter<Tournament>()))
  return snapshot.exists() ? snapshot.data() : null
}

export async function createTournament(input: CreateTournamentInput) {
  await addDoc(tournamentsRef, {
    id: '',
    name: input.name,
    date: Timestamp.fromDate(input.date),
    type: input.type,
    maxPlayers: input.maxPlayers,
    pointsTarget: input.pointsTarget,
    locationId: input.locationId,
    courtIds: input.courtIds,
    status: 'registration_open',
    registrationOpensAt: Timestamp.fromDate(input.registrationOpensAt),
    registrationClosesAt: Timestamp.fromDate(input.registrationClosesAt),
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  } as unknown as Tournament)
}

export async function setTournamentStatus(id: string, status: TournamentStatus) {
  const updates: any = { status }

  // If marking as completed, compute and set the champion
  if (status === 'completed') {
    const [matches, registrations] = await Promise.all([
      listMatchesForTournament(id),
      listRegistrationsForTournament(id),
    ])

    const confirmedPlayerIds = registrations
      .filter((r) => r.status === 'confirmed')
      .map((r) => r.userId)

    if (confirmedPlayerIds.length > 0 && matches.length > 0) {
      const leaderboard = computeTournamentLeaderboard(confirmedPlayerIds, matches)
      if (leaderboard.length > 0) {
        updates.champion = leaderboard[0].userId
      }
    }
  }

  await updateDoc(doc(db, 'tournaments', id), updates)
}

/** Delete a tournament and all its associated registrations and matches.
 * Returns { deletedRegistrations, deletedMatches } for confirmation display. */
export async function deleteTournament(
  id: string,
): Promise<{ deletedRegistrations: number; deletedMatches: number }> {
  const registrationsRef = collection(db, 'registrations')
  const matchesRef = collection(db, 'matches')

  const registrations = await getDocs(
    query(registrationsRef, where('tournamentId', '==', id)),
  )
  const matches = await getDocs(query(matchesRef, where('tournamentId', '==', id)))

  const regCount = registrations.size
  const matchCount = matches.size

  registrations.forEach((doc) => deleteDoc(doc.ref))
  matches.forEach((doc) => deleteDoc(doc.ref))
  await deleteDoc(doc(db, 'tournaments', id))

  return { deletedRegistrations: regCount, deletedMatches: matchCount }
}
