import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateUserProfile } from '../services/auth'
import type { SkillLevel } from '../types'

export function OnboardingModal() {
  const { profile, dismissOnboarding, refreshProfile } = useAuth()
  if (!profile) return null
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile.skillLevel ?? 'beginner')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!displayName.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateUserProfile(profile!.uid, { displayName, skillLevel })
      await refreshProfile()
      dismissOnboarding()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
          Welcome to Smash Club! 🏸
        </h2>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-300">
          Let's set up your profile so other players can find you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Display name
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              autoFocus
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
            disabled={saving}
            className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  )
}
