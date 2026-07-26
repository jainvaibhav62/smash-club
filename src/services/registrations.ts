import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { Registration } from '../types'

const registrationsRef = collection(db, 'registrations').withConverter(converter<Registration>())

export async function registerForTournament(tournamentId: string, userId: string) {
  const existing = await getDocs(
    query(
      registrationsRef,
      where('tournamentId', '==', tournamentId),
      where('userId', '==', userId),
    ),
  )
  if (!existing.empty) return existing.docs[0].data()

  await addDoc(registrationsRef, {
    id: '',
    tournamentId,
    userId,
    status: 'pending',
    registeredAt: serverTimestamp(),
  } as unknown as Registration)
}

export async function listRegistrationsForTournament(tournamentId: string): Promise<Registration[]> {
  const snapshot = await getDocs(query(registrationsRef, where('tournamentId', '==', tournamentId)))
  return snapshot.docs.map((d) => d.data())
}

export async function listRegistrationsForUser(userId: string): Promise<Registration[]> {
  const snapshot = await getDocs(query(registrationsRef, where('userId', '==', userId)))
  return snapshot.docs.map((d) => d.data())
}

export async function decideRegistration(
  id: string,
  status: 'confirmed' | 'rejected',
  decidedBy: string,
) {
  await updateDoc(doc(db, 'registrations', id), {
    status,
    decidedBy,
    decidedAt: serverTimestamp(),
  })
}

export async function withdrawRegistration(id: string) {
  await updateDoc(doc(db, 'registrations', id), { status: 'withdrawn' })
}
