import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Avatar } from '../components/Avatar'
import { updateUserProfile } from '../services/auth'
import { resizeImageToDataUrl } from '../services/photo'
import { deleteUserAccount } from '../services/verification'
import type { PlayingHand, SkillLevel } from '../types'

export function ProfilePage() {
  const { profile, refreshProfile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [photoURL, setPhotoURL] = useState(profile?.photoURL ?? '')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile?.skillLevel ?? 'beginner')
  const [gender, setGender] = useState(profile?.gender ?? '')
  const [playingHand, setPlayingHand] = useState<PlayingHand>(profile?.playingHand ?? 'right')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [deletingUser, setDeletingUser] = useState(false)

  if (!profile) return null

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoError('')
    setProcessingPhoto(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      setPhotoURL(dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not process that image.')
    } finally {
      setProcessingPhoto(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setSavedMessage('')
    setError('')
    try {
      await updateUserProfile(profile!.uid, { displayName, photoURL, skillLevel, gender, playingHand })
      await refreshProfile()
      setSavedMessage('Profile saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser() {
    if (!window.confirm(`Delete user ${displayName}? This action cannot be undone and will delete all their data.`)) {
      return
    }

    setDeletingUser(true)
    setError('')

    try {
      await deleteUserAccount(profile!.uid)
      navigate('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      setDeletingUser(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Your profile</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Close"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ✕
        </button>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center gap-4">
          <Avatar src={photoURL} name={displayName || profile.email} size={56} />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingPhoto}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {processingPhoto ? 'Processing…' : 'Change photo'}
            </button>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
            {photoError && <p className="text-sm text-red-600 dark:text-red-400">{photoError}</p>}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name
          </span>
          <input
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
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Preferred playing hand
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
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
        {savedMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{savedMessage}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {isAdmin && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <h2 className="mb-3 text-sm font-bold text-red-700 dark:text-red-400">Admin: Delete user</h2>
          <p className="mb-3 text-xs text-red-600 dark:text-red-300">
            Permanently delete this user account and all associated data (registrations, matches).
          </p>
          <button
            onClick={handleDeleteUser}
            disabled={deletingUser}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deletingUser ? 'Deleting…' : 'Delete user'}
          </button>
        </div>
      )}
    </div>
  )
}
