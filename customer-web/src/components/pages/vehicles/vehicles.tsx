// src/components/pages/vehicles/vehicles.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import useVehicles, { type Vehicle } from '../../../hooks/useVehicles'

const Vehicles = () => {
  const user = useAuth.getUser() as { id?: number | string } | null
  const rawId = user?.id
  const customerId =
    rawId != null && rawId !== '' ? Number(rawId) : NaN
  const hasCustomer = Number.isFinite(customerId) && customerId > 0

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(hasCustomer)
  const [error, setError] = useState(
    hasCustomer ? '' : 'Please sign in to see your vehicles.'
  )
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!hasCustomer) {
      setVehicles([])
      setError('Please sign in to see your vehicles.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await useVehicles.fetchVehiclesByCustomer(customerId)
      setVehicles(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Failed to load vehicles.'
          : 'Failed to load vehicles.'
      )
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [hasCustomer, customerId])

  useEffect(() => {
  if (!hasCustomer) {
    return
  }

  let cancelled = false

  ;(async () => {
    try {
      const data = await useVehicles.fetchVehiclesByCustomer(customerId)
      if (cancelled) return
      setVehicles(Array.isArray(data) ? data : [])
      setError('')
    } catch (err: unknown) {
      if (cancelled) return
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Failed to load vehicles.'
          : 'Failed to load vehicles.'
      )
      setVehicles([])
    } finally {
      if (!cancelled) setLoading(false)
    }
  })()

  return () => {
    cancelled = true
  }
}, [hasCustomer, customerId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicles
    return vehicles.filter((v) =>
      [v.plateNumber, v.brand, v.model, v.name, v.color]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q))
    )
  }, [vehicles, search])

  const title = (v: Vehicle) =>
    [v.brand, v.model].filter(Boolean).join(' ') ||
    v.name ||
    `Vehicle #${v.id}`

  const meta = (v: Vehicle) =>
    [v.color, v.type, v.year].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/dashboard"
              className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">
                My vehicles
              </h1>
              {!loading && (
                <p className="text-xs text-slate-500">
                  {vehicles.length} saved
                </p>
              )}
            </div>
          </div>
          <Link
            to="/vehicles/create"
            className="btn btn-sm shrink-0 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
          >
            <span className="material-icons text-lg">add</span>
            Add
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-1">
          <span className="material-icons text-slate-500">search</span>
          <input
            className="input input-ghost h-10 w-full border-0 bg-transparent px-0 text-white focus:outline-none"
            placeholder="Search plate, brand, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <span className="material-icons text-base">close</span>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
            <span className="material-icons shrink-0">error_outline</span>
            <span className="min-w-0 flex-1">{error}</span>
            <button
              type="button"
              className="shrink-0 font-semibold text-red-200"
              onClick={() => void load()}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <span className="loading loading-spinner loading-lg text-teal-400" />
            <p className="mt-3 text-sm text-slate-500">Loading vehicles…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800">
              <span className="material-icons text-4xl text-slate-500">
                directions_car
              </span>
            </div>
            <p className="font-medium text-slate-300">
              {search ? 'No matches' : 'No vehicles yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'Try another plate or brand.'
                : 'Add a vehicle so you can book a wash faster.'}
            </p>
            {!search && (
              <Link
                to="/vehicles/create"
                className="btn mt-5 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
              >
                <span className="material-icons text-lg">add</span>
                Add vehicle
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtered.map((v) => (
              <li
                key={v.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-teal-500/25 to-teal-700/20 text-teal-300">
                    <span className="material-icons text-2xl">directions_car</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="truncate font-semibold text-white">
                        {title(v)}
                      </p>
                      {v.plateNumber && (
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-xs tracking-wide text-teal-200">
                          {v.plateNumber}
                        </span>
                      )}
                    </div>
                    {meta(v) ? (
                      <p className="mt-1 text-sm text-slate-400">{meta(v)}</p>
                    ) : (
                      v.name &&
                      [v.brand, v.model].filter(Boolean).length > 0 && (
                        <p className="mt-1 text-sm text-slate-500">{v.name}</p>
                      )
                    )}
                    {v.name &&
                      [v.brand, v.model].filter(Boolean).join(' ') !== v.name &&
                      !meta(v) && (
                        <p className="mt-0.5 text-xs text-slate-500">{v.name}</p>
                      )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && vehicles.length > 0 && (
          <p className="mt-6 text-center text-xs text-slate-600">
            Vehicles are used when you book a wash.
          </p>
        )}
      </main>
    </div>
  )
}

export default Vehicles