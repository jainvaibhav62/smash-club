import { useEffect, useState } from 'react'
import {
  createCourt,
  createLocation,
  deleteCourt,
  deleteLocation,
  listCourtsForLocation,
  listLocations,
  renameCourt,
} from '../../services/locations'
import type { Court, Location } from '../../types'

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

export function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [courtsByLocation, setCourtsByLocation] = useState<Record<string, Court[]>>({})
  const [newLocationName, setNewLocationName] = useState('')
  const [newCourtName, setNewCourtName] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const locs = await listLocations()
      setLocations(locs)
      const courtLists = await Promise.all(locs.map((loc) => listCourtsForLocation(loc.id)))
      const map: Record<string, Court[]> = {}
      locs.forEach((loc, i) => {
        map[loc.id] = courtLists[i]
      })
      setCourtsByLocation(map)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAddLocation(event: React.FormEvent) {
    event.preventDefault()
    if (!newLocationName.trim()) return
    setError('')
    try {
      await createLocation(newLocationName.trim())
      setNewLocationName('')
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleAddCourt(locationId: string) {
    const name = newCourtName[locationId]?.trim()
    if (!name) return
    setError('')
    try {
      await createCourt(locationId, name)
      setNewCourtName((prev) => ({ ...prev, [locationId]: '' }))
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDeleteLocation(locationId: string) {
    setError('')
    try {
      await deleteLocation(locationId)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleRenameCourt(courtId: string, name: string) {
    setError('')
    try {
      await renameCourt(courtId, name)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDeleteCourt(courtId: string) {
    setError('')
    try {
      await deleteCourt(courtId)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Locations & courts</h1>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleAddLocation} className="flex gap-2">
        <input
          value={newLocationName}
          onChange={(e) => setNewLocationName(e.target.value)}
          placeholder="New location name"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add location
        </button>
      </form>

      <div className="space-y-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">{location.name}</h2>
              <button
                onClick={() => handleDeleteLocation(location.id)}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                Delete location
              </button>
            </div>

            <ul className="mb-3 space-y-1">
              {(courtsByLocation[location.id] ?? []).map((court) => (
                <li
                  key={court.id}
                  className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-800"
                >
                  <input
                    defaultValue={court.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== court.name) {
                        handleRenameCourt(court.id, e.target.value.trim())
                      }
                    }}
                    className="bg-transparent text-slate-700 focus:outline-none dark:text-slate-200"
                  />
                  <button
                    onClick={() => handleDeleteCourt(court.id)}
                    className="text-red-600 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <input
                value={newCourtName[location.id] ?? ''}
                onChange={(e) =>
                  setNewCourtName((prev) => ({ ...prev, [location.id]: e.target.value }))
                }
                placeholder="New court name"
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                onClick={() => handleAddCourt(location.id)}
                className="rounded-md bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Add court
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
