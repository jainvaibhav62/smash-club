import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../../components/Avatar'
import { fetchUserProfile } from '../../services/auth'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  toggleAnnouncement,
} from '../../services/announcements'
import type { Announcement, UserProfile } from '../../types'

export function AdminAnnouncementsPage() {
  const { profile } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [creators, setCreators] = useState<Record<string, UserProfile>>({})
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const anns = await listAnnouncements()
    setAnnouncements(anns)

    // Fetch creator profiles
    const creatorIds = [...new Set(anns.map((a) => a.createdBy))]
    const profiles: Record<string, UserProfile> = {}
    await Promise.all(
      creatorIds.map(async (id) => {
        const p = await fetchUserProfile(id)
        if (p) profiles[id] = p
      }),
    )
    setCreators(profiles)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    if (!text.trim() || !profile) return
    setSubmitting(true)
    try {
      await createAnnouncement(text, profile.uid)
      setText('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create announcement')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await toggleAnnouncement(id, !active)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to toggle announcement')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this announcement?')) return
    setDeletingId(id)
    try {
      await deleteAnnouncement(id)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete announcement')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Announcements</h1>

      {/* Create new announcement */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            New announcement
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter announcement text…"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
            rows={3}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!text.trim() || submitting}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create announcement'}
        </button>
      </div>

      {/* Announcements list */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          All announcements
        </h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No announcements yet.</p>
        ) : (
          <ul className="space-y-2">
            {announcements.map((ann) => {
              const creator = creators[ann.createdBy]
              return (
                <li
                  key={ann.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {ann.text}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Avatar
                          src={creator?.photoURL}
                          name={creator?.displayName}
                          size={20}
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          by {creator?.displayName || ann.createdBy} ·{' '}
                          {ann.createdAt?.toDate?.().toLocaleDateString() ?? ''}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        ann.active
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {ann.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggle(ann.id, ann.active)}
                      className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {ann.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      disabled={deletingId === ann.id}
                      className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300"
                    >
                      {deletingId === ann.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
