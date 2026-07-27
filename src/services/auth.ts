import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from '../lib/firebase'
import type { PublicProfile, UserProfile } from '../types'

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle(): Promise<{ profile: UserProfile; isNew: boolean }> {
  const { user } = await signInWithPopup(auth, googleProvider)
  return ensureUserProfile(user)
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
  skillLevel: UserProfile['skillLevel'],
): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)

  // Create user profile
  const newProfile = {
    displayName,
    photoURL: '',
    email,
    skillLevel,
    gender: '',
    playingHand: 'right' as const,
    role: 'player' as const,
    createdAt: serverTimestamp(),
  }
  await setDoc(doc(db, 'users', user.uid), newProfile)
  await setDoc(doc(db, 'publicProfiles', user.uid), toPublicProfile({ displayName, photoURL: '', skillLevel }))

  // Send Firebase verification email (uses custom template if configured)
  await sendEmailVerification(user)

  // Sign out so user can't access until they verify email
  await firebaseSignOut(auth)
}

export async function signInWithEmail(email: string, password: string): Promise<{ profile: UserProfile; isNew: boolean }> {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return ensureUserProfile(user)
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}

export async function signOut() {
  await firebaseSignOut(auth)
}

function toPublicProfile(profile: {
  displayName: string
  photoURL: string
  skillLevel: UserProfile['skillLevel']
}): Omit<PublicProfile, 'uid'> {
  return {
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    skillLevel: profile.skillLevel,
  }
}

export async function ensureUserProfile(
  user: User,
): Promise<{ profile: UserProfile; isNew: boolean }> {
  const ref = doc(db, 'users', user.uid)
  const snapshot = await getDoc(ref)

  if (snapshot.exists()) {
    return { profile: { uid: snapshot.id, ...snapshot.data() } as UserProfile, isNew: false }
  }

  const newProfile = {
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    email: user.email ?? '',
    skillLevel: 'beginner' as const,
    gender: '',
    playingHand: 'right' as const,
    role: 'player' as const,
    createdAt: serverTimestamp(),
  }
  await setDoc(ref, newProfile)
  await setDoc(doc(db, 'publicProfiles', user.uid), toPublicProfile(newProfile))

  const created = await getDoc(ref)
  return { profile: { uid: created.id, ...created.data() } as UserProfile, isNew: true }
}

// Full profile (includes email) — only the owner or an admin can read this
// per firestore.rules. Never expose the result of this to other players.
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserProfile) : null
}

// Public-safe subset (no email/gender) — any signed-in user can read this,
// e.g. to show opponent/partner names on fixtures and leaderboards.
export async function fetchPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(doc(db, 'publicProfiles', uid))
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as PublicProfile) : null
}

/** Batch-fetch public profiles, e.g. to resolve player names for a fixture list. */
export async function fetchPublicProfiles(uids: string[]): Promise<Record<string, PublicProfile>> {
  const uniqueIds = [...new Set(uids)]
  const profiles = await Promise.all(uniqueIds.map((uid) => fetchPublicProfile(uid)))
  const map: Record<string, PublicProfile> = {}
  uniqueIds.forEach((uid, i) => {
    const profile = profiles[i]
    if (profile) map[uid] = profile
  })
  return map
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>) {
  await setDoc(doc(db, 'users', uid), updates, { merge: true })

  const publicUpdates: Partial<Omit<PublicProfile, 'uid'>> = {}
  if (updates.displayName !== undefined) publicUpdates.displayName = updates.displayName
  if (updates.photoURL !== undefined) publicUpdates.photoURL = updates.photoURL
  if (updates.skillLevel !== undefined) publicUpdates.skillLevel = updates.skillLevel

  if (Object.keys(publicUpdates).length > 0) {
    await setDoc(doc(db, 'publicProfiles', uid), publicUpdates, { merge: true })
  }
}
