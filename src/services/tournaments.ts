import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { Tournament, TournamentStatus, TournamentType } from '../types'

const tournamentsRef = collection(db, 'tournaments').withConverter(converter<Tournament>())

export interface CreateTournamentInput {
  name: string
  date: Date
  type: TournamentType
  maxPlayers: number
  matchesPerPlayer: number
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
    matchesPerPlayer: input.matchesPerPlayer,
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
  await updateDoc(doc(db, 'tournaments', id), { status })
}
