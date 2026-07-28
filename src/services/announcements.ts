import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { converter } from './firestore'
import type { Announcement } from '../types'

const announcementsRef = collection(db, 'announcements').withConverter(converter<Announcement>())

export async function listAnnouncements(): Promise<Announcement[]> {
  const snapshot = await getDocs(announcementsRef)
  return snapshot.docs.map((d) => d.data())
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const snapshot = await getDocs(announcementsRef)
  return snapshot.docs
    .map((d) => d.data())
    .filter((a) => a.active)
}

export async function createAnnouncement(text: string, createdBy: string) {
  await addDoc(announcementsRef, {
    id: '',
    text,
    active: true,
    createdBy,
    createdAt: serverTimestamp(),
  } as unknown as Announcement)
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>) {
  await updateDoc(doc(db, 'announcements', id), updates)
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, 'announcements', id))
}

export async function toggleAnnouncement(id: string, active: boolean) {
  await updateDoc(doc(db, 'announcements', id), { active })
}
