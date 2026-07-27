import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../context/AuthContext'
import { deleteUserDataDirectly } from '../../services/userManagement'
import type { UserProfile } from '../../types'

export function AdminUsersPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const querySnapshot = await getDocs(collection(db, 'users'))
      const userList = querySnapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      setUsers(userList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(uid: string, displayName: string) {
    if (!window.confirm(`Delete user "${displayName}"? This will delete all their data (profile, registrations, matches).`)) {
      return
    }

    setDeleting(uid)
    setError('')

    try {
      await deleteUserDataDirectly(uid)
      setUsers(users.filter((u) => u.uid !== uid))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user'
      setError(errorMessage)
      setDeleting(null)
    }
  }

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading users…</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Users</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {users.length} total user{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        Deletes all user data: profile, registrations, and matches. To also delete their Firebase Auth account, use the Firebase Console.
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                Name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                Skill
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                Role
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                Verified
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                Joined
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.uid}
                className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 cursor-pointer"
                onClick={() => navigate(`/admin/users/${user.uid}`)}
              >
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {user.displayName}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs capitalize dark:bg-slate-800">
                    {user.skillLevel}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs capitalize dark:bg-slate-800">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                      ✗ Pending
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                  {user.createdAt?.toDate().toLocaleDateString() ?? '—'}
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDeleteUser(user.uid, user.displayName)}
                    disabled={deleting === user.uid || user.uid === profile?.uid}
                    title={user.uid === profile?.uid ? 'Cannot delete yourself' : 'Delete user'}
                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting === user.uid ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
            No users found
          </div>
        )}
      </div>
    </div>
  )
}
