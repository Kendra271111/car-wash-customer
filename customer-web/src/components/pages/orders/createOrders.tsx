// src/components/pages/orders/createOrders.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import useOrders from '../../../hooks/useOrder'
import useVehicle, { type Vehicle } from '../../../hooks/useVehicles'
import { api } from '../../../api/api'
import ThemeToggle from '../../ui/themeToggle'

type Service = {
  id: number
  name: string
  price?: number
  duration?: number
}

type CartItem = {
  serviceId: number
  name: string
  duration: number
  price: number
  qty: number
  subtotal: number
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

const CreateOrders = () => {
  const navigate = useNavigate()
  const user = useAuth.getUser() as {
    id?: number | string
    name?: string
  } | null
  const rawId = user?.id
  const customerId = rawId != null && rawId !== '' ? Number(rawId) : NaN
  const hasCustomer = Number.isFinite(customerId) && customerId > 0

  const [saving, setSaving] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [vehicleId, setVehicleId] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [vehicleQ, setVehicleQ] = useState('')
  const [serviceQ, setServiceQ] = useState('')
  const [booting, setBooting] = useState(() => hasCustomer)
  const [error, setError] = useState<string | null>(() =>
    hasCustomer ? null : 'You must be logged in as a customer.'
  )

  useEffect(() => {
    if (!hasCustomer) return

    let cancelled = false
    ;(async () => {
      try {
        const [vList, sRes] = await Promise.all([
          useVehicle.fetchVehiclesByCustomer(customerId),
          api.get('/services', { params: { limit: 100 } }),
        ])
        if (cancelled) return
        setVehicles(Array.isArray(vList) ? vList : [])
        const raw = sRes.data?.data ?? sRes.data ?? []
        setServices(Array.isArray(raw) ? raw : [])
      } catch (err: unknown) {
        if (cancelled) return
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || 'Failed to load data.'
            : 'Failed to load data.'
        )
      } finally {
        if (!cancelled) setBooting(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [hasCustomer, customerId])

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId)

  const vehicleOptions = useMemo(() => {
    const s = vehicleQ.trim().toLowerCase()
    if (!s) return vehicles
    return vehicles.filter((v) =>
      [v.name, v.plateNumber, v.brand, v.model]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s))
    )
  }, [vehicles, vehicleQ])

  /** Services list for checklist (search + hide nothing, but disable if already selected) */
  const filteredServices = useMemo(() => {
    const s = serviceQ.trim().toLowerCase()
    if (!s) return services
    return services.filter((x) =>
      String(x.name || '')
        .toLowerCase()
        .includes(s)
    )
  }, [services, serviceQ])

  const cart: CartItem[] = useMemo(() => {
    return selectedIds
      .map((id) => {
        const svc = services.find((s) => s.id === id)
        if (!svc) return null
        const price = Number(svc.price || 0)
        return {
          serviceId: svc.id,
          name: svc.name,
          duration: Number(svc.duration || 0),
          price,
          qty: 1,
          subtotal: price,
        }
      })
      .filter(Boolean) as CartItem[]
  }, [selectedIds, services])

  const toggleService = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const totals = {
    qty: cart.reduce((s, c) => s + c.qty, 0),
    mins: cart.reduce((s, c) => s + c.duration * c.qty, 0),
    amount: cart.reduce((s, c) => s + c.subtotal, 0),
  }

  const submit = async () => {
    setError(null)
    if (!hasCustomer) {
      setError('You must be logged in.')
      return
    }
    if (vehicleId == null) {
      setError('Select your vehicle.')
      return
    }
    if (cart.length === 0) {
      setError('Select at least one service.')
      return
    }

    setSaving(true)
    try {
      await useOrders.createOrder({
        vehicleId,
        customerId,
        staffId: null,
        status: 'PENDING',
        note: note.trim() || undefined,
        items: cart.map((c) => ({
          serviceId: c.serviceId,
          duration: c.duration,
          price: c.price,
          qty: c.qty,
          subtotal: c.subtotal,
          amount: c.subtotal,
        })),
      })
      navigate('/orders', { replace: true })
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Failed to create order.'
          : 'Failed to create order.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <span className="loading loading-spinner loading-lg text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Link
              to="/orders"
              className="btn btn-ghost btn-sm btn-circle text-slate-600 dark:text-slate-300"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Book a wash</h1>
              <p className="text-xs text-slate-500">Choose vehicle & services</p>
            </div>
          </div>
          <ThemeToggle className="text-slate-600 dark:text-slate-300" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {error && (
          <div className="flex gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-700 dark:text-red-300">
            <span className="material-icons">error_outline</span>
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-1 text-xs text-slate-500">Booking as</p>
          <p className="font-medium">
            {user?.name || (hasCustomer ? `Customer #${customerId}` : '—')}
          </p>
        </section>

        {/* Vehicle */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-sm font-semibold">Your vehicle</p>

          {vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500">No vehicles on your account.</p>
              <Link
                to="/vehicles/create"
                className="btn btn-sm mt-3 rounded-xl border-0 bg-teal-600 text-white"
              >
                Add vehicle
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left dark:border-slate-700 dark:bg-slate-950"
                onClick={() => {
                  setVehicleOpen((o) => !o)
                  setVehicleQ('')
                }}
              >
                <span
                  className={
                    selectedVehicle
                      ? 'font-medium'
                      : 'text-slate-400 dark:text-slate-500'
                  }
                >
                  {selectedVehicle
                    ? `${selectedVehicle.plateNumber || ''} · ${
                        selectedVehicle.name ||
                        [selectedVehicle.brand, selectedVehicle.model]
                          .filter(Boolean)
                          .join(' ')
                      }`
                    : 'Select vehicle'}
                </span>
                <span className="material-icons text-slate-400">
                  {vehicleOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {vehicleOpen && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
                    <span className="material-icons text-slate-400">search</span>
                    <input
                      className="input input-ghost h-10 w-full border-0 bg-transparent focus:outline-none"
                      placeholder="Search plate or name…"
                      value={vehicleQ}
                      onChange={(e) => setVehicleQ(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {vehicleOptions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        onClick={() => {
                          setVehicleId(v.id)
                          setVehicleOpen(false)
                          setVehicleQ('')
                        }}
                      >
                        <span className="font-medium">{v.plateNumber}</span>
                        <span className="text-slate-500">
                          {' '}
                          ·{' '}
                          {v.name ||
                            [v.brand, v.model].filter(Boolean).join(' ')}
                        </span>
                      </button>
                    ))}
                    {vehicleOptions.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-500">No match</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Services — 2-col checklist */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Services</p>
              <p className="text-xs text-slate-500">
                Tap to select · each service once
              </p>
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-red-500"
                onClick={() => setSelectedIds([])}
              >
                Clear all
              </button>
            )}
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
            <span className="material-icons text-slate-400">search</span>
            <input
              className="input input-ghost h-10 w-full border-0 bg-transparent focus:outline-none"
              placeholder="Search services…"
              value={serviceQ}
              onChange={(e) => setServiceQ(e.target.value)}
            />
            {serviceQ && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setServiceQ('')}
              >
                <span className="material-icons text-base">close</span>
              </button>
            )}
          </div>

          {/* Scrollable 2-column grid */}
          <div className="max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 dark:border-slate-800 sm:max-h-72">
            {filteredServices.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No services found
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                {filteredServices.map((svc) => {
                  const checked = selectedIds.includes(svc.id)
                  return (
                    <label
                      key={svc.id}
                      className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-3 transition sm:border-r dark:border-slate-800 ${
                        checked
                          ? 'bg-teal-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-950'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary mt-0.5"
                        checked={checked}
                        onChange={() => toggleService(svc.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">
                          {svc.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {formatRp(Number(svc.price || 0))}
                          {svc.duration ? ` · ${svc.duration} min` : ''}
                        </span>
                      </span>
                      {checked && (
                        <span className="material-icons text-base text-teal-600">
                          check_circle
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selected summary chips */}
          {cart.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {cart.map((c) => (
                <button
                  key={c.serviceId}
                  type="button"
                  onClick={() => toggleService(c.serviceId)}
                  className="inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-800 dark:text-teal-200"
                  title="Remove"
                >
                  {c.name}
                  <span className="material-icons text-sm">close</span>
                </button>
              ))}
            </div>
          )}

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Note (optional)
          </label>
          <textarea
            className="textarea textarea-bordered mt-1 w-full rounded-xl border-slate-300 bg-white focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the crew should know…"
          />

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-center dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500">Items</p>
              <p className="text-lg font-bold">{totals.qty}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-lg font-bold">{totals.mins} min</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {formatRp(totals.amount)}
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-3 pb-6">
          <Link
            to="/orders"
            className="btn flex-1 rounded-xl border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-transparent dark:text-slate-300"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="btn flex-1 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
            disabled={saving || !hasCustomer}
            onClick={() => void submit()}
          >
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Create order'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

export default CreateOrders