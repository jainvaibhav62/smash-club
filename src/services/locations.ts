import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { Court, Location } from '../types'

const locationsRef = collection(db, 'locations').withConverter(converter<Location>())
const courtsRef = collection(db, 'courts').withConverter(converter<Court>())

export async function listLocations(): Promise<Location[]> {
  const snapshot = await getDocs(locationsRef)
  return snapshot.docs.map((d) => d.data())
}

export async function createLocation(name: string, address?: string) {
  await addDoc(locationsRef, {
    id: '',
    name,
    address,
    createdAt: serverTimestamp(),
  } as unknown as Location)
}

export async function updateLocation(id: string, updates: Partial<Pick<Location, 'name' | 'address'>>) {
  await updateDoc(doc(db, 'locations', id), updates)
}

export async function deleteLocation(id: string) {
  const courts = await listCourtsForLocation(id)
  await Promise.all(courts.map((court) => deleteDoc(doc(db, 'courts', court.id))))
  await deleteDoc(doc(db, 'locations', id))
}

export async function listCourtsForLocation(locationId: string): Promise<Court[]> {
  const snapshot = await getDocs(query(courtsRef, where('locationId', '==', locationId)))
  return snapshot.docs.map((d) => d.data())
}

export async function createCourt(locationId: string, name: string) {
  await addDoc(courtsRef, {
    id: '',
    locationId,
    name,
    isActive: true,
  } as unknown as Court)
}

export async function renameCourt(id: string, name: string) {
  await updateDoc(doc(db, 'courts', id), { name })
}

export async function setCourtActive(id: string, isActive: boolean) {
  await updateDoc(doc(db, 'courts', id), { isActive })
}

export async function deleteCourt(id: string) {
  await deleteDoc(doc(db, 'courts', id))
}
