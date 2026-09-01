// src/components/pages/history/history.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import axios from 'axios'
import type { Order } from '../../hooks/useOrder'
import useAuth from '../../hooks/useAuth'
import useOrders from '../../hooks/useOrder'


const formatDate = (dateString?: string) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

const orderTotal = (order: Order) =>
  (order.order_items || []).reduce(
    (sum, item) => sum + (item.subtotal ?? (item.price || 0) * (item.qty || 1)),
    0
  )

const isPaid = (order: Order) =>
  (order.payements || (order as { payments?: { status?: string }[] }).payments || []).some(
    (p) => p.status === 'PAID' || p.status === 'paid'
  )

const History = () => {
  const user = useAuth.getUser()
  const customerId = typeof user?.id === 'number' ? user.id : null

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setError(null)
      try {
        const data = await useOrders.fetchOrders(search, {
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        })
        if (!cancelled) setOrders(Array.isArray(data) ? data : [])
      } catch (err: unknown) {
        if (cancelled) return
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || 'Failed to load history.')
        } else {
          setError('Failed to load history.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search, startDate, endDate])

  const mine =
    customerId == null
      ? orders
      : orders.filter((o) => o.customerId === customerId)

  const completedOrders = mine.filter((o) => {
    const done = (o.status || '') === 'COMPLETED'
    const paid = isPaid(o)
    // History = completed; paid preferred but show completed if payments missing
    if (!done) return false
    if (o.payements?.length || (o as { payments?: unknown[] }).payments?.length) {
      return paid
    }
    return true
  })

  const filtered = completedOrders.filter((o) => {
    if (startDate && o.createdAt) {
      const d = new Date(o.createdAt).toISOString().split('T')[0]
      if (d < startDate) return false
    }
    if (endDate && o.createdAt) {
      const d = new Date(o.createdAt).toISOString().split('T')[0]
      if (d > endDate) return false
    }
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      String(o.id).includes(q) ||
      (o.vehicle?.brand || '').toLowerCase().includes(q) ||
      (o.vehicle?.model || '').toLowerCase().includes(q) ||
      (o.vehicle?.name || '').toLowerCase().includes(q) ||
      (o.vehicle?.plateNumber || '').toLowerCase().includes(q)
    )
  })

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
    setLoading(true)
  }

  const clearDates = () => {
    setStartDate('')
    setEndDate('')
    setLoading(true)
  }

  const reload = () => {
    setLoading(true)
    setStartDate((s) => s)
    setEndDate((e) => e)
    setSearch((q) => q)
    // trigger effect by toggling — simpler: void fetch again
    void useOrders
      .fetchOrders(search, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false))
  }

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
            <h1 className="text-lg font-bold">Order History</h1>
          </div>
          <button
            type="button"
            onClick={reload}
            className="btn btn-sm rounded-xl border-0 bg-slate-800 text-slate-300"
          >
            <span className="material-icons text-lg">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {/* Date + search */}
        <section className="mb-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
            Date range
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset(0)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300"
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(30)}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300"
            >
              Last 30 days
            </button>
          </div>

          <div className="mb-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              className="input input-bordered flex-1 rounded-xl border-slate-700 bg-slate-950"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setLoading(true)
              }}
            />
            <span className="hidden text-slate-500 sm:inline">→</span>
            <input
              type="date"
              className="input input-bordered flex-1 rounded-xl border-slate-700 bg-slate-950"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setLoading(true)
              }}
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={clearDates}
              className="mb-3 text-sm text-teal-400"
            >
              Clear dates
            </button>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3">
            <span className="material-icons text-slate-500">search</span>
            <input
              className="input input-ghost w-full border-0 bg-transparent focus:outline-none"
              placeholder="Search history..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setLoading(true)
              }}
            />
            {search.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setSearch('')
                  setLoading(true)
                }}
              >
                <span className="material-icons text-base">close</span>
              </button>
            )}
          </div>
        </section>

        <div className="mb-4">
          <span className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white">
            Completed ({filtered.length})
          </span>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-500/20 p-4 text-sm text-red-300">
            <span className="material-icons">error_outline</span>
            <span className="flex-1">{error}</span>
            <button type="button" className="font-semibold text-red-400" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <span className="loading loading-spinner loading-lg text-teal-400" />
            <p className="mt-3 text-sm text-slate-500">Loading history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="material-icons mb-2 text-5xl text-slate-600">inventory_2</span>
            <p>No completed orders found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => {
              const vehicle = order.vehicle
              const serviceCount =
                order.order_items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-slate-400">#{order.id}</span>
                    <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                      Completed
                    </span>
                  </div>

                  <p className="font-semibold text-white">
                    {vehicle
                      ? `${vehicle.brand || ''} ${vehicle.model || ''}`.trim() ||
                        vehicle.name ||
                        `Vehicle #${order.vehicleId}`
                      : `Vehicle #${order.vehicleId}`}
                  </p>
                  {vehicle?.plateNumber && (
                    <p className="mt-0.5 text-sm text-slate-500">{vehicle.plateNumber}</p>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {formatDate(order.createdAt)}
                    </span>
                    <span className="text-sm text-slate-400">
                      {serviceCount} service{serviceCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="font-semibold text-teal-400">
                      {formatRp(orderTotal(order))}
                    </p>
                    <Link
                      to={`/orders/${order.id}`}
                      className="btn btn-sm rounded-xl border-0 bg-slate-800 text-white"
                    >
                      View
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default History