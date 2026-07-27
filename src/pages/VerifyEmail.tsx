import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyCode, sendVerificationCode } from '../services/verification'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { firebaseUser } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(true)

  const email = (location.state as any)?.email || firebaseUser?.email || ''

  useEffect(() => {
    if (!firebaseUser) {
      navigate('/signup')
      return
    }

    // Auto-send verification code on mount if not already sent
    if (codeSent && !resendLoading) {
      handleResendCode()
    }
  }, [firebaseUser, navigate])

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    if (!firebaseUser || !code.trim()) return

    setError('')
    setLoading(true)

    try {
      if (code.length !== 6 || !/^\d+$/.test(code)) {
        setError('Please enter a valid 6-digit code')
        setLoading(false)
        return
      }

      await verifyCode(firebaseUser.uid, code)
      navigate('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed'
      if (errorMessage.includes('expired')) {
        setError('Code expired. Please request a new one.')
      } else if (errorMessage.includes('Invalid')) {
        setError('Invalid code. Please try again.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (!firebaseUser || !email) return

    setResendLoading(true)
    setError('')

    try {
      await sendVerificationCode(email, firebaseUser.uid)
      setCodeSent(true)
      setCode('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send code'
      setError(errorMessage)
    } finally {
      setResendLoading(false)
    }
  }

  if (!firebaseUser) {
    return null
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 text-center">
        <div className="mb-3 text-4xl">✉️</div>
        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Verify your email
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Verification code
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-2xl font-mono tracking-widest dark:border-slate-700 dark:bg-slate-800"
            placeholder="000000"
            autoComplete="off"
            autoFocus
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify code'}
        </button>
      </form>

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Didn't receive the code?
        </p>
        <button
          onClick={handleResendCode}
          disabled={resendLoading}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {resendLoading ? 'Sending…' : 'Resend code'}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <button
          onClick={() => navigate('/signup')}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Back to sign up
        </button>
      </p>
    </div>
  )
}
