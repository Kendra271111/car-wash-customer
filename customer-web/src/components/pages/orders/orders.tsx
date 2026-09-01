// src/components/pages/orders/orders.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import axios from 'axios'
import useAuth from '../../../hooks/useAuth'
import useOrders, {
  type Order,
  type OrderStatus,
  statusLabels,
  statusColors,
} from '../../../hooks/useOrder'

const FILTERS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Waiting' },
  { key: 'PROCESSING', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

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

const Orders = () => {
  const user = useAuth.getUser()
  const customerId = typeof user?.id === 'number' ? user.id : null

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [search, setSearch] = useState('')

 const loadOrders = useCallback(async () => {
  setError(null)
  try {
    const data = await useOrders.fetchOrders(search)
    setOrders(Array.isArray(data) ? data : [])
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.message || 'Failed to load orders.')
    } else {
      setError('Failed to load orders.')
    }
  } finally {
    setLoading(false)
  }
}, [search])

useEffect(() => {
  let cancelled = false;
  (async () => {
    setError(null)
    try {
      const data = await useOrders.fetchOrders(search)
      if (!cancelled) setOrders(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      if (cancelled) return
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load orders.')
      } else {
        setError('Failed to load orders.')
      }
    } finally {
      if (!cancelled) setLoading(false)
    }
  })()

  return () => {
    cancelled = true
  }
}, [search])

  const mine = useMemo(() => {
    if (customerId == null) return orders
    return orders.filter((o) => o.customerId === customerId)
  }, [orders, customerId])

  const stats = useMemo(() => useOrders.computeStats(mine), [mine])

  const filtered = useMemo(() => {
    let data = mine
    if (filter !== 'all') {
      data = data.filter((o) => (o.status || 'PENDING') === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(
        (o) =>
          String(o.id).includes(q) ||
          o.vehicle?.brand?.toLowerCase().includes(q) ||
          o.vehicle?.model?.toLowerCase().includes(q) ||
          o.vehicle?.plateNumber?.toLowerCase().includes(q)
      )
    }
    return data
  }, [mine, filter, search])

  const badgeClass = (status: OrderStatus) => {
    // DaisyUI badges from your hook, fallback to RN-style colors
    const map = statusColors as Record<string, string>
    return map[status] || 'badge-ghost'
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
            <h1 className="text-lg font-bold">My Orders</h1>
          </div>
          <Link
            to="/orders/create"
            className="btn btn-sm rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
          >
            <span className="material-icons text-lg">add</span>
            Book a Wash
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {/* Search */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3">
          <span className="material-icons text-slate-500">search</span>
          <input
            className="input input-ghost w-full border-0 bg-transparent focus:outline-none"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.length > 0 && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setSearch('')}>
              <span className="material-icons text-base">close</span>
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              { key: 'PENDING', label: 'Waiting', value: stats.PENDING, color: 'bg-amber-500', icon: 'schedule' },
              { key: 'PROCESSING', label: 'In Progress', value: stats.PROCESSING, color: 'bg-blue-500', icon: 'build' },
              { key: 'COMPLETED', label: 'Completed', value: stats.COMPLETED, color: 'bg-emerald-500', icon: 'check_circle' },
              { key: 'CANCELLED', label: 'Cancelled', value: stats.CANCELLED, color: 'bg-red-500', icon: 'cancel' },
            ] as const
          ).map((card) => (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}>
                  <span className="material-icons text-xl text-white">{card.icon}</span>
                </div>
                <span className="text-2xl font-bold">{card.value}</span>
              </div>
              <p className="text-sm text-slate-300">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => {
            const count = key === 'all' ? mine.length : stats[key] || 0
            const active = filter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  active ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-500/20 p-4 text-sm text-red-300">
            <span className="material-icons">error_outline</span>
            <span className="flex-1">{error}</span>
            <button type="button" className="font-semibold text-red-400" onClick={loadOrders}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <span className="loading loading-spinner loading-lg text-teal-400" />
            <p className="mt-3 text-sm text-slate-500">Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="material-icons mb-2 text-5xl text-slate-600">inventory_2</span>
            <p>No orders found.</p>
            <Link
              to="/orders/create"
              className="btn btn-sm mt-4 rounded-xl border-0 bg-indigo-500 text-white"
            >
              Book a Wash
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => {
              const status = (order.status || 'PENDING') as OrderStatus
              const serviceCount =
                order.order_items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0
              const total =
                order.order_items?.reduce(
                  (s, i) => s + (i.subtotal ?? (i.price || 0) * (i.qty || 1)),
                  0
                ) || 0

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-slate-400">#{order.id}</span>
                    <span className={`badge badge-sm ${badgeClass(status)}`}>
                      {statusLabels[status]}
                    </span>
                  </div>
                  <p className="font-semibold text-white">
                    {order.vehicle
                      ? `${order.vehicle.brand || ''} ${order.vehicle.model || ''}`.trim() ||
                        order.vehicle.name ||
                        `Vehicle #${order.vehicleId}`
                      : `Vehicle #${order.vehicleId}`}
                  </p>
                  {order.vehicle?.plateNumber && (
                    <p className="mt-0.5 text-sm text-slate-400">{order.vehicle.plateNumber}</p>
                  )}
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                      <p className="text-sm text-slate-400">
                        {serviceCount} service{serviceCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="font-semibold text-teal-400">{formatRp(total)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/orders/${order.id}`}
                      className="btn btn-sm flex-1 rounded-xl border-0 bg-slate-800 text-white"
                    >
                      View
                    </Link>
                    {status === 'PENDING' && (
                      <Link
                        to={`/orders/${order.id}/pay`}
                        className="btn btn-sm flex-1 rounded-xl border-0 bg-indigo-500/20 text-indigo-300"
                      >
                        Pay
                      </Link>
                    )}
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

export default Orders