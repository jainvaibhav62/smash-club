import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { fetchUserProfile, updateUserProfile } from '../../services/auth'
import type { PlayingHand, SkillLevel, UserProfile } from '../../types'

export function AdminUserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner')
  const [gender, setGender] = useState('')
  const [playingHand, setPlayingHand] = useState<PlayingHand>('right')

  useEffect(() => {
    loadProfile()
  }, [userId])

  async function loadProfile() {
    if (!userId) return
    setLoading(true)
    try {
      const user = await fetchUserProfile(userId)
      if (user) {
        setProfile(user)
        setDisplayName(user.displayName)
        setSkillLevel(user.skillLevel)
        setGender(user.gender)
        setPlayingHand(user.playingHand)
      }
    } catch (err) {
      console.error('Failed to load user:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    try {
      await updateUserProfile(profile.uid, {
        displayName,
        skillLevel,
        gender,
        playingHand,
      })
      setProfile({
        ...profile,
        displayName,
        skillLevel,
        gender,
        playingHand,
      })
      setEditing(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>
  if (!profile) return <p className="text-slate-500 dark:text-slate-400">User not found.</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {profile.displayName}
        </h1>
        <button
          onClick={() => navigate('/admin/users')}
          className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Back
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-4">
          <Avatar src={profile.photoURL} name={profile.displayName} size={64} />
          <div className="flex-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{profile.email}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">ID</p>
            <p className="font-mono text-sm text-slate-600 dark:text-slate-400">{profile.uid}</p>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Display name</p>
              <p className="text-slate-900 dark:text-slate-100">{profile.displayName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Skill level</p>
              <p className="capitalize text-slate-900 dark:text-slate-100">{profile.skillLevel}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</p>
              <p className="text-slate-900 dark:text-slate-100">{profile.gender || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Playing hand</p>
              <p className="capitalize text-slate-900 dark:text-slate-100">{profile.playingHand}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Role</p>
              <p className="capitalize text-slate-900 dark:text-slate-100">{profile.role}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Edit profile
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Display name
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
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

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Gender
              </span>
              <input
                type="text"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Playing hand
              </span>
              <select
                value={playingHand}
                onChange={(e) => setPlayingHand(e.target.value as PlayingHand)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
