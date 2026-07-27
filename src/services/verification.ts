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
