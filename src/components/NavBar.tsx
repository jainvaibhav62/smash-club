import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Avatar } from './Avatar'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-emerald-600 text-white'
      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

const dropdownLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-emerald-600 text-white'
      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

export function NavBar() {
  const navigate = useNavigate()
  const { profile, isAdmin, signOutUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const adminMenuRef = useRef<HTMLDivElement>(null)

  async function handleSignOut() {
    await signOutUser()
    navigate('/')
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur print:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-lg font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            🏸 Smash Club
          </button>
          {profile && (
            <nav className="flex items-center gap-1">
              <NavLink to="/" end className={linkClass}>
                Home
              </NavLink>
              <NavLink to="/tournaments" className={linkClass}>
                Tournaments
              </NavLink>
              <NavLink to="/leaderboard" className={linkClass}>
                Leaderboard
              </NavLink>
              {isAdmin && (
                <div className="relative" ref={adminMenuRef}>
                  <button
                    onClick={() => setAdminMenuOpen((open) => !open)}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      adminMenuOpen
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    Admin ▾
                  </button>
                  {adminMenuOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                      <NavLink
                        to="/admin/users"
                        className={dropdownLinkClass}
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Users
                      </NavLink>
                      <NavLink
                        to="/admin/locations"
                        className={dropdownLinkClass}
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Locations
                      </NavLink>
                      <NavLink
                        to="/admin/tournaments"
                        className={dropdownLinkClass}
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Manage
                      </NavLink>
                      <NavLink
                        to="/admin/announcements"
                        className={dropdownLinkClass}
                        onClick={() => setAdminMenuOpen(false)}
                      >
                        Announcements
                      </NavLink>
                    </div>
                  )}
                </div>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          {profile ? (
            <>
              <NavLink
                to="/profile"
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <Avatar src={profile.photoURL} name={profile.displayName || profile.email} size={24} />
                {profile.displayName}
              </NavLink>
              <button
                onClick={handleSignOut}
                className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/signup')}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                New Member? Sign Up
              </button>
              <button
                onClick={() => navigate('/signin')}
                className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Already a member? Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
