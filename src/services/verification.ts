import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

export async function sendVerificationCode(email: string, uid: string): Promise<void> {
  const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode')
  await sendVerificationCode({ email, uid })
}

export async function verifyCode(uid: string, code: string): Promise<void> {
  const verifyCode = httpsCallable(functions, 'verifyCode')
  await verifyCode({ uid, code })
}

export async function deleteUserAccount(uid: string): Promise<void> {
  const deleteUser = httpsCallable(functions, 'deleteUser')
  await deleteUser({ uid })
}

export async function resendVerificationEmail(uid: string): Promise<void> {
  const auth = await import('firebase/auth').then(m => m.getAuth())
  const user = auth.currentUser
  if (!user) {
    throw new Error('Not authenticated')
  }

  const token = await user.getIdToken()

  const response = await fetch(
    'https://us-central1-smash-club-ada6c.cloudfunctions.net/resendVerificationEmail',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ uid }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to resend verification email')
  }
}
