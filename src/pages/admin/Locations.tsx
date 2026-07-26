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

export function AdminLocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [courtsByLocation, setCourtsByLocation] = useState<Record<string, Court[]>>({})
  const [newLocationName, setNewLocationName] = useState('')
  const [newCourtName, setNewCourtName] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const locs = await listLocations()
    setLocations(locs)
    const courtLists = await Promise.all(locs.map((loc) => listCourtsForLocation(loc.id)))
    const map: Record<string, Court[]> = {}
    locs.forEach((loc, i) => {
      map[loc.id] = courtLists[i]
    })
    setCourtsByLocation(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAddLocation(event: React.FormEvent) {
    event.preventDefault()
    if (!newLocationName.trim()) return
    await createLocation(newLocationName.trim())
    setNewLocationName('')
    await load()
  }

  async function handleAddCourt(locationId: string) {
    const name = newCourtName[locationId]?.trim()
    if (!name) return
    await createCourt(locationId, name)
    setNewCourtName((prev) => ({ ...prev, [locationId]: '' }))
    await load()
  }

  if (loading) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Locations & courts</h1>

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
                onClick={async () => {
                  await deleteLocation(location.id)
                  await load()
                }}
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
                    onBlur={async (e) => {
                      if (e.target.value.trim() && e.target.value !== court.name) {
                        await renameCourt(court.id, e.target.value.trim())
                        await load()
                      }
                    }}
                    className="bg-transparent text-slate-700 focus:outline-none dark:text-slate-200"
                  />
                  <button
                    onClick={async () => {
                      await deleteCourt(court.id)
                      await load()
                    }}
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
