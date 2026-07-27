import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { Registration, UserProfile } from '../types'

const registrationsRef = collection(db, 'registrations').withConverter(converter<Registration>())

function registrationDocId(tournamentId: string, userId: string) {
  return `${tournamentId}_${userId}`
}

export async function registerForTournament(
  tournamentId: string,
  userId: string,
): Promise<Registration> {
  const ref = doc(db, 'registrations', registrationDocId(tournamentId, userId)).withConverter(
    converter<Registration>(),
  )
  const existing = await getDoc(ref)
  if (existing.exists()) {
    const data = existing.data()
    if (data.status === 'confirmed' || data.status === 'waitlisted') return data
  }

  const registrations = await listRegistrationsForTournament(tournamentId)
  const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId))
  const maxPlayers = (tournamentSnap.data()?.maxPlayers as number) ?? 0
  const hasRoom = countConfirmed(registrations) < maxPlayers

  const data = {
    id: ref.id,
    tournamentId,
    userId,
    status: hasRoom ? 'confirmed' : 'waitlisted',
    registeredAt: serverTimestamp(),
  }
  await setDoc(ref, data as unknown as Registration)
  return data as unknown as Registration
}

export async function listRegistrationsForTournament(tournamentId: string): Promise<Registration[]> {
  const snapshot = await getDocs(query(registrationsRef, where('tournamentId', '==', tournamentId)))
  return snapshot.docs.map((d) => d.data())
}

export async function listRegistrationsForUser(userId: string): Promise<Registration[]> {
  const snapshot = await getDocs(query(registrationsRef, where('userId', '==', userId)))
  return snapshot.docs.map((d) => d.data())
}

export function countConfirmed(registrations: Registration[]): number {
  return registrations.filter((r) => r.status === 'confirmed').length
}

/** 1-based position in the waitlist queue, or null if the user isn't waitlisted. */
export function waitlistPosition(registrations: Registration[], userId: string): number | null {
  const ordered = registrations
    .filter((r) => r.status === 'waitlisted')
    .sort((a, b) => (a.registeredAt?.toMillis() ?? 0) - (b.registeredAt?.toMillis() ?? 0))
  const index = ordered.findIndex((r) => r.userId === userId)
  return index === -1 ? null : index + 1
}

async function releaseRegistration(
  registrationId: string,
  newStatus: 'withdrawn' | 'removed',
  decidedBy?: string,
) {
  const ref = doc(db, 'registrations', registrationId).withConverter(converter<Registration>())
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) return
  const registration = snapshot.data()
  if (registration.status === 'withdrawn' || registration.status === 'removed') return

  const wasConfirmed = registration.status === 'confirmed'
  await updateDoc(doc(db, 'registrations', registrationId), {
    status: newStatus,
    decidedAt: serverTimestamp(),
    ...(decidedBy ? { decidedBy } : {}),
  })

  if (wasConfirmed) {
    await promoteNextWaitlisted(registration.tournamentId)
  }
}

/** Self-service: a player backing out of a tournament they're confirmed/waitlisted in. */
export function withdrawRegistration(registrationId: string) {
  return releaseRegistration(registrationId, 'withdrawn')
}

/** Admin kicking a player out of a tournament. */
export function removeRegistration(registrationId: string, adminUid: string) {
  return releaseRegistration(registrationId, 'removed', adminUid)
}

async function promoteNextWaitlisted(tournamentId: string) {
  const registrations = await listRegistrationsForTournament(tournamentId)
  const tournamentSnap = await getDoc(doc(db, 'tournaments', tournamentId))
  const maxPlayers = (tournamentSnap.data()?.maxPlayers as number) ?? 0
  if (countConfirmed(registrations) >= maxPlayers) return

  const next = registrations
    .filter((r) => r.status === 'waitlisted')
    .sort((a, b) => (a.registeredAt?.toMillis() ?? 0) - (b.registeredAt?.toMillis() ?? 0))[0]
  if (!next) return

  await updateDoc(doc(db, 'registrations', next.id), { status: 'confirmed' })
}

/** Get all users not yet registered for a tournament (for admin manual registration) */
export async function getAvailablePlayersForTournament(tournamentId: string): Promise<UserProfile[]> {
  const [allUsersSnap, registeredRegs] = await Promise.all([
    getDocs(collection(db, 'users')),
    listRegistrationsForTournament(tournamentId),
  ])

  const registeredUserIds = new Set(registeredRegs.map((r) => r.userId))
  const allUsers = allUsersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile))

  return allUsers.filter((user) => !registeredUserIds.has(user.uid))
}

/** Bulk register users for a tournament (admin function) */
export async function bulkRegisterUsersForTournament(
  tournamentId: string,
  userIds: string[],
): Promise<{ registered: number; failed: number }> {
  let registered = 0
  let failed = 0

  for (const userId of userIds) {
    try {
      await registerForTournament(tournamentId, userId)
      registered++
    } catch (err) {
      console.error(`Failed to register user ${userId}:`, err)
      failed++
    }
  }

  return { registered, failed }
}
