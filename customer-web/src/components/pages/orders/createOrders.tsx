// src/components/pages/orders/createOrders.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import useOrders from '../../../hooks/useOrder'
import useVehicle, { type Vehicle } from '../../../hooks/useVehicles'
import { api } from '../../../api/api'

type Service = {
  id: number
  name: string
  price?: number
  duration?: number
}

type CartItem = {
  id: string
  serviceId?: number
  service?: string
  duration: number
  price: number
  quantity: number
  subtotal: number
  empty?: boolean
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

const CreateOrders = () => {
  const navigate = useNavigate()
  const user = useAuth.getUser()
  const customerId = typeof user?.id === 'number' ? user.id : null
  const customerName = user?.name ?? ''

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [vehicleId, setVehicleId] = useState('')
  const [note, setNote] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  const [openVehicle, setOpenVehicle] = useState(false)
  const [serviceDropdownIndex, setServiceDropdownIndex] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const [v, sv] = await Promise.all([
          customerId != null
            ? useVehicle.fetchVehiclesByCustomer(customerId)
            : useVehicle.fetchVehicles(),
          api.get('/services').then((r) => r.data?.data || r.data || []),
        ])
        setVehicles(Array.isArray(v) ? v : [])
        setServices(Array.isArray(sv) ? sv : [])
      } catch (e) {
        console.error(e)
      } finally {
        setInitialLoading(false)
      }
    })()
  }, [customerId])

  const vehicleLabel = (id: string) => {
    const v = vehicles.find((x) => String(x.id) === id)
    if (!v) return null
    return `${v.name || [v.brand, v.model].filter(Boolean).join(' ')} · ${v.plateNumber || ''}`
  }

  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || !openVehicle) return vehicles
    return vehicles.filter(
      (v) =>
        String(v.name || '').toLowerCase().includes(q) ||
        String(v.plateNumber || '').toLowerCase().includes(q) ||
        String(v.brand || '').toLowerCase().includes(q) ||
        String(v.model || '').toLowerCase().includes(q)
    )
  }, [vehicles, search, openVehicle])

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || serviceDropdownIndex == null) return services
    return services.filter((s) => String(s.name || '').toLowerCase().includes(q))
  }, [services, search, serviceDropdownIndex])

  const closeDropdowns = () => {
    setOpenVehicle(false)
    setServiceDropdownIndex(null)
    setSearch('')
  }

  const addService = () => {
    setCartItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        duration: 0,
        price: 0,
        quantity: 1,
        subtotal: 0,
        empty: true,
      },
    ])
  }

  const selectService = (index: number, service: Service) => {
    const price = Number(service.price || 0)
    setCartItems((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        serviceId: service.id,
        service: service.name,
        duration: Number(service.duration || 0),
        price,
        quantity: 1,
        subtotal: price,
        empty: false,
      }
      return next
    })
    closeDropdowns()
  }

  const removeItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = useMemo(() => {
    const valid = cartItems.filter((i) => !i.empty && i.serviceId)
    return {
      items: valid.reduce((s, i) => s + i.quantity, 0),
      duration: valid.reduce((s, i) => s + i.duration * i.quantity, 0),
      amount: valid.reduce((s, i) => s + i.subtotal, 0),
    }
  }, [cartItems])

  const handleSubmit = async () => {
    setError(null)
    const validItems = cartItems.filter((i) => !i.empty && i.serviceId != null)

    if (!customerId) {
      setError('You must be logged in.')
      return
    }
    if (!vehicleId) {
      setError('Please select a vehicle.')
      return
    }
    if (validItems.length === 0) {
      setError('Please add at least one service.')
      return
    }

    setLoading(true)
    try {
      await useOrders.createOrder({
        vehicleId: Number(vehicleId),
        customerId,
        staffId: null,
        status: 'PENDING',
        note: note || undefined,
        items: validItems.map((item) => ({
          serviceId: Number(item.serviceId),
          duration: Number(item.duration),
          price: Number(item.price),
          qty: Number(item.quantity),
          subtotal: Number(item.subtotal),
          amount: Number(item.subtotal),
        })),
      })
      setSuccess(true)
      setTimeout(() => navigate('/orders', { replace: true }), 800)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to create order.')
      } else {
        setError('Failed to create order.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <span className="loading loading-spinner loading-lg text-teal-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <Link
            to="/orders"
            className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
          >
            <span className="material-icons">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">Book a Wash</h1>
            <p className="text-xs text-slate-500">New car wash order</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 p-3 text-sm text-emerald-300">
            <span className="material-icons">check_circle</span>
            Order created successfully!
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/20 p-3 text-sm text-red-300">
            <span className="material-icons">error_outline</span>
            {error}
          </div>
        )}

        {/* Details */}
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-4 text-lg font-semibold">Details</h2>

          <div className="mb-3">
            <p className="mb-1.5 text-sm text-slate-400">Customer</p>
            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-300">
              {customerName || `Customer #${customerId}`}
            </div>
          </div>

          {/* Vehicle searchable */}
          <div className="mb-1">
            <p className="mb-1.5 text-sm text-slate-400">Vehicle</p>
            <button
              type="button"
              onClick={() => {
                setServiceDropdownIndex(null)
                setSearch('')
                setOpenVehicle((o) => !o)
              }}
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-left"
            >
              <span className={vehicleId ? 'text-white' : 'text-slate-500'}>
                {vehicleLabel(vehicleId) ||
                  (vehicles.length === 0 ? 'No vehicles — add one first' : 'Search vehicle...')}
              </span>
              <span className="material-icons text-slate-500">
                {openVehicle ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {openVehicle && (
              <div className="mt-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                <div className="flex items-center border-b border-slate-800 px-3">
                  <span className="material-icons text-slate-500 text-lg">search</span>
                  <input
                    className="input input-ghost w-full border-0 bg-transparent"
                    placeholder="Type to search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {filteredVehicles.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">No results</p>
                  ) : (
                    filteredVehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className="block w-full border-b border-slate-800 px-4 py-3 text-left text-sm hover:bg-slate-900"
                        onClick={() => {
                          setVehicleId(String(v.id))
                          closeDropdowns()
                        }}
                      >
                        {v.name || [v.brand, v.model].filter(Boolean).join(' ')} ·{' '}
                        {v.plateNumber}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
            {vehicles.length === 0 && (
              <Link to="/vehicles/create" className="mt-2 inline-block text-sm text-teal-400">
                + Add a vehicle
              </Link>
            )}
          </div>
        </section>

        {/* Services cart */}
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Services</h2>
            <button
              type="button"
              onClick={addService}
              className="btn btn-sm rounded-xl border-0 bg-indigo-500 text-white"
            >
              <span className="material-icons text-lg">add</span>
              Add
            </button>
          </div>

          {cartItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No services yet. Tap Add.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {cartItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3"
                >
                  {item.empty ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenVehicle(false)
                          setSearch('')
                          setServiceDropdownIndex((i) => (i === index ? null : index))
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-700 px-4 py-3 text-left"
                      >
                        <span className="text-slate-500">Search service...</span>
                        <span className="material-icons text-slate-500">expand_more</span>
                      </button>
                      {serviceDropdownIndex === index && (
                        <div className="mt-1 overflow-hidden rounded-xl border border-slate-700">
                          <div className="flex items-center border-b border-slate-800 px-3">
                            <span className="material-icons text-slate-500 text-lg">search</span>
                            <input
                              className="input input-ghost w-full border-0 bg-transparent"
                              placeholder="Type to search..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-44 overflow-y-auto">
                            {filteredServices.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-slate-500">No results</p>
                            ) : (
                              filteredServices.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="block w-full border-b border-slate-800 px-4 py-3 text-left text-sm hover:bg-slate-900"
                                  onClick={() => selectService(index, s)}
                                >
                                  {s.name} · {formatRp(Number(s.price || 0))}
                                  {s.duration ? ` · ${s.duration} min` : ''}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{item.service}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.duration} min · {formatRp(item.price)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-semibold">{formatRp(item.subtotal)}</p>
                        <button type="button" onClick={() => removeItem(index)}>
                          <span className="material-icons text-red-400">delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mb-1.5 mt-5 text-sm text-slate-400">Notes</p>
          <textarea
            className="textarea textarea-bordered w-full rounded-xl border-slate-700 bg-slate-950"
            placeholder="Optional notes..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />

          <div className="mt-5 flex justify-between border-t border-slate-800 pt-4">
            <div className="text-center">
              <p className="text-xs text-slate-500">Items</p>
              <p className="text-lg font-bold">{totals.items}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-lg font-bold">{totals.duration} min</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-lg font-bold text-teal-400">{formatRp(totals.amount)}</p>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <Link
            to="/orders"
            className="btn flex-1 rounded-xl border-slate-700 bg-transparent text-slate-300"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn flex-1 rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              'Create Order'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

export default CreateOrders