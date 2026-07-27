import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendPasswordReset } from '../services/auth'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email) {
        setError('Please enter your email address.')
        setLoading(false)
        return
      }

      await sendPasswordReset(email)
      setEmailSent(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email'
      if (errorMessage.includes('user-not-found')) {
        setError('No account found with this email address.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 text-center">
          <div className="mb-2 text-4xl">📧</div>
          <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">
            Check your email
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-3 rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
          <p className="text-blue-700 dark:text-blue-300">
            1️⃣ Open your email inbox
          </p>
          <p className="text-blue-700 dark:text-blue-300">
            2️⃣ Click the reset link
          </p>
          <p className="text-blue-700 dark:text-blue-300">
            3️⃣ Set your new password
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Didn't get an email? Check your spam folder or{' '}
          <button
            onClick={() => setEmailSent(false)}
            className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            try again
          </button>
        </p>

        <button
          onClick={() => navigate('/signin')}
          className="mt-4 w-full rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Reset password 🔐
      </h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        Enter your email and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="you@example.com"
            required
          />
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <button
        onClick={() => navigate('/signin')}
        className="mt-4 w-full rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Back to sign in
      </button>
    </div>
  )
}
