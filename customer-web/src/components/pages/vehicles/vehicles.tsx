// src/components/pages/vehicles/vehicles.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import type { Vehicle } from '../../../hooks/useVehicles'
import useVehicles from '../../../hooks/useVehicles'

const Vehicles = () => {
  const user = useAuth.getUser()
  const customerId = typeof user?.id === 'number' ? user.id : null

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch semua vehicles
      const data = await useVehicles.fetchVehicles()

      setVehicles(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load vehicles.')
      } else {
        setError('Failed to load vehicles.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadVehicles = async () => {
      await load()
    }

    void loadVehicles()
  }, [load])

  const mine = useMemo(() => {
    if (customerId == null) return vehicles

    return vehicles.filter((v) => v.customerId === customerId)
  }, [vehicles, customerId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return mine

    return mine.filter(
      (v) =>
        (v.plateNumber || '').toLowerCase().includes(q) ||
        (v.brand || '').toLowerCase().includes(q) ||
        (v.model || '').toLowerCase().includes(q) ||
        (v.name || '').toLowerCase().includes(q) ||
        (v.color || '').toLowerCase().includes(q)
    )
  }, [mine, search])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </Link>

            <h1 className="text-lg font-bold">My Vehicles</h1>
          </div>

          <Link
            to="/vehicles/create"
            className="btn btn-sm rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
          >
            <span className="material-icons text-lg">add</span>
            Add
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3">
          <span className="material-icons text-slate-500">search</span>

          <input
            className="input input-ghost w-full border-0 bg-transparent text-white focus:outline-none"
            placeholder="Search plate, brand, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSearch('')}
            >
              <span className="material-icons text-base">close</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/20 p-4 text-sm text-red-300">
            <span className="material-icons">error_outline</span>

            <span className="flex-1">{error}</span>

            <button
              type="button"
              className="font-semibold text-red-400"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <span className="loading loading-spinner loading-lg text-teal-400" />
            <p className="mt-3 text-sm text-slate-500">
              Loading vehicles...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="material-icons mb-2 text-5xl text-slate-600">
              directions_car
            </span>

            <p>No vehicles found.</p>

            <Link
              to="/vehicles/create"
              className="btn btn-sm mt-4 rounded-xl border-0 bg-indigo-500 text-white"
            >
              Add vehicle
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
                    <span className="material-icons">directions_car</span>
                  </div>

                  {v.plateNumber && (
                    <span className="rounded-full bg-slate-800 px-3 py-1 font-mono text-xs text-slate-300">
                      {v.plateNumber}
                    </span>
                  )}
                </div>

                <p className="text-base font-semibold text-white">
                  {[v.brand, v.model].filter(Boolean).join(' ') ||
                    v.name ||
                    `Vehicle #${v.id}`}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {[v.color, v.type, v.year].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Vehicles