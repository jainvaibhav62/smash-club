import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUpWithEmail, signInWithGoogle } from '../services/auth'
import type { SkillLevel } from '../types'

export function SignUpPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleSignUp() {
    setError('')
    try {
      await signInWithGoogle()
      navigate('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign-up failed'
      setError(errorMessage)
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email || !password || !displayName) {
        setError('Please fill in all fields.')
        setLoading(false)
        return
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.')
        setLoading(false)
        return
      }

      await signUpWithEmail(email, password, displayName, skillLevel)
      // Redirect to verification page with email in state
      navigate('/verify-email', { state: { email } })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed'
      if (errorMessage.includes('email-already-in-use')) {
        setError('This email is already registered. Try signing in instead.')
      } else if (errorMessage.includes('weak-password')) {
        setError('Password is too weak. Please use a stronger password.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Join Smash Club 🏸
      </h1>
      <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
        Sign up with your email to start playing badminton tournaments.
      </p>

      <form onSubmit={handleSignUp} className="space-y-4">
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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="At least 6 characters"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Display name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            placeholder="Your name"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Skill level
          </span>
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">Or sign up with</p>
        <button
          onClick={handleGoogleSignUp}
          disabled={loading}
          className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          🔍 Sign up with Google
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{' '}
        <button
          onClick={() => navigate('/signin')}
          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}
