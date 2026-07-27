import {
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  collection,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

export async function deleteUserDataDirectly(uid: string): Promise<void> {
  // Delete user profile documents
  await deleteDoc(doc(db, 'users', uid))
  await deleteDoc(doc(db, 'publicProfiles', uid))

  // Delete all registrations for this user
  const registrationsQuery = query(
    collection(db, 'registrations'),
    where('userId', '==', uid)
  )
  const registrationDocs = await getDocs(registrationsQuery)
  for (const regDoc of registrationDocs.docs) {
    await deleteDoc(regDoc.ref)
  }

  // Delete all matches where user was in teamA or teamB
  // Note: collectionGroup queries require composite indexes if filtering multiple collections
  // For now, we'll query from the tournaments level
  const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'))

  for (const tournamentDoc of tournamentsSnapshot.docs) {
    const matchesQuery = query(
      collection(db, 'tournaments', tournamentDoc.id, 'matches'),
      where('teamA', 'array-contains', uid)
    )
    const matchesA = await getDocs(matchesQuery)
    for (const matchDoc of matchesA.docs) {
      await deleteDoc(matchDoc.ref)
    }

    const matchesQueryB = query(
      collection(db, 'tournaments', tournamentDoc.id, 'matches'),
      where('teamB', 'array-contains', uid)
    )
    const matchesB = await getDocs(matchesQueryB)
    for (const matchDoc of matchesB.docs) {
      await deleteDoc(matchDoc.ref)
    }
  }
}
