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
import ThemeToggle from '../../ui/themeToggle'
import { useRealtimeRefresh } from '../../../hooks/realTimeRefresh'

const FILTERS: {
  key: 'all' | 'PENDING' | 'PROCESSING' | 'NEED_PAYMENT'
  label: string
}[] = [
  { key: 'all', label: 'All active' },
  { key: 'PENDING', label: 'Waiting' },
  { key: 'PROCESSING', label: 'Washing' },
  { key: 'NEED_PAYMENT', label: 'Need payment' },
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

const paymentsOf = (order: Order) => {
  const o = order as Order & {
    payments?: { status?: string }[]
    payements?: { status?: string }[]
  }
  return o.payments ?? o.payements ?? []
}

const isPaid = (order: Order) =>
  paymentsOf(order).some((p) => String(p.status || '').toUpperCase() === 'PAID')

/** Still open: not cancelled, not completed+paid */
const isActiveOrder = (order: Order) => {
  const status = (order.status || 'PENDING') as OrderStatus
  if (status === 'CANCELLED') return false
  if (status === 'COMPLETED' && isPaid(order)) return false
  return true
}

const orderTotal = (order: Order) =>
  (order.order_items || []).reduce(
    (s, i) => s + (i.subtotal ?? (i.price || 0) * (i.qty || 1)),
    0
  )

const Orders = () => {
  const user = useAuth.getUser()
  const customerId = typeof user?.id === 'number' ? user.id : null

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const applyOrdersResult = useCallback((data: unknown) => {
    setOrders(Array.isArray(data) ? (data as Order[]) : [])
  }, [])

  const applyError = useCallback((err: unknown) => {
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.message || 'Failed to load orders.')
    } else {
      setError('Failed to load orders.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const data = await useOrders.fetchOrders(query)
          if (!cancelled) applyOrdersResult(data)
        } catch (err: unknown) {
          if (!cancelled) applyError(err)
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, applyOrdersResult, applyError])

  useRealtimeRefresh({
    tables: ['orders', 'order_items', 'payments', 'payements'],
    onChange: () => {
      void (async () => {
        try {
          const data = await useOrders.fetchOrders(query)
          applyOrdersResult(data)
        } catch {
          /* keep list */
        }
      })()
    },
  })

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const data = await useOrders.fetchOrders(query)
        applyOrdersResult(data)
      } catch (err: unknown) {
        applyError(err)
      } finally {
        setLoading(false)
      }
    })()
  }

  const mine = useMemo(() => {
    if (customerId == null) return orders
    return orders.filter((o) => o.customerId === customerId)
  }, [orders, customerId])

  const active = useMemo(() => mine.filter(isActiveOrder), [mine])

  /** Block new booking while any active order exists */
  const hasRunningOrder = active.length > 0
  const blockingOrder = active[0] ?? null

  const stats = useMemo(() => {
    let waiting = 0
    let washing = 0
    let needPayment = 0
    for (const o of active) {
      const status = (o.status || 'PENDING') as OrderStatus
      if (status === 'PROCESSING') washing += 1
      else if (!isPaid(o)) needPayment += 1
      else waiting += 1
    }
    return { waiting, washing, needPayment, total: active.length }
  }, [active])

  const filtered = useMemo(() => {
    let data = active
    if (filter === 'PENDING') {
      data = data.filter((o) => (o.status || 'PENDING') === 'PENDING')
    } else if (filter === 'PROCESSING') {
      data = data.filter((o) => o.status === 'PROCESSING')
    } else if (filter === 'NEED_PAYMENT') {
      data = data.filter((o) => !isPaid(o))
    }
    return [...data].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
  }, [active, filter])

  const badgeClass = (status: OrderStatus) => {
    const map = statusColors as Record<string, string>
    return map[status] || 'badge-ghost'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="btn btn-ghost btn-sm btn-circle text-slate-600 dark:text-slate-300"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold leading-tight">Active orders</h1>
              <p className="text-xs text-slate-500">In progress or waiting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-slate-600 dark:text-slate-300" />
            {hasRunningOrder ? (
              <button
                type="button"
                disabled
                className="btn btn-sm rounded-xl border-0 bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                title="Finish or pay your current order first"
              >
                <span className="material-icons text-lg">block</span>
                Book
              </button>
            ) : (
              <Link
                to="/orders/create"
                className="btn btn-sm rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
              >
                <span className="material-icons text-lg">add</span>
                Book
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {hasRunningOrder && blockingOrder && (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <span className="material-icons shrink-0 text-amber-600 dark:text-amber-400">
              info
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">You already have an active order</p>
              <p className="mt-0.5 text-amber-800/80 dark:text-amber-200/80">
                Order #{blockingOrder.id} is still open. Finish or pay it before
                booking another wash.
              </p>
              <Link
                to={`/orders/${blockingOrder.id}`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-400"
              >
                View order
                <span className="material-icons text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="material-icons text-slate-400">search</span>
          <input
            className="input input-ghost w-full border-0 bg-transparent focus:outline-none"
            placeholder="Search plate, car, order #…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSearch('')}
            >
              <span className="material-icons text-base">close</span>
            </button>
          )}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-2xl font-bold text-amber-500">{stats.waiting}</p>
            <p className="text-xs text-slate-500">Waiting</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-2xl font-bold text-blue-500">{stats.washing}</p>
            <p className="text-xs text-slate-500">Washing</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-2xl font-bold text-pink-500">{stats.needPayment}</p>
            <p className="text-xs text-slate-500">Need pay</p>
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ key, label }) => {
            const count =
              key === 'all'
                ? stats.total
                : key === 'PENDING'
                  ? stats.waiting
                  : key === 'PROCESSING'
                    ? stats.washing
                    : stats.needPayment
            const on = filter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  on
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Finished and cancelled orders are in{' '}
          <Link
            to="/history"
            className="font-semibold text-teal-600 dark:text-teal-400"
          >
            History
          </Link>
          .
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-500/15 p-4 text-sm text-red-700 dark:text-red-300">
            <span className="material-icons">error_outline</span>
            <span className="flex-1">{error}</span>
            <button
              type="button"
              className="font-semibold underline"
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <span className="loading loading-spinner loading-lg text-teal-500" />
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <span className="material-icons mb-2 text-5xl text-slate-400">
              local_car_wash
            </span>
            <p className="font-medium text-slate-700 dark:text-slate-300">
              No active orders
            </p>
            <p className="mt-1 text-sm">
              Book a wash or check History for past visits.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {!hasRunningOrder && (
                <Link
                  to="/orders/create"
                  className="btn btn-sm rounded-xl border-0 bg-indigo-500 text-white"
                >
                  Book a wash
                </Link>
              )}
              <Link
                to="/history"
                className="btn btn-sm rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                History
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((order) => {
              const status = (order.status || 'PENDING') as OrderStatus
              const paid = isPaid(order)
              const serviceCount =
                order.order_items?.reduce(
                  (sum, item) => sum + (item.qty || 0),
                  0
                ) || 0
              const total = orderTotal(order)
              const canPay = !paid && status !== 'CANCELLED'

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm text-slate-500">
                      #{order.id}
                    </span>
                    <div className="flex items-center gap-2">
                      {!paid && (
                        <span className="badge badge-sm badge-warning">
                          Unpaid
                        </span>
                      )}
                      <span className={`badge badge-sm ${badgeClass(status)}`}>
                        {statusLabels[status] || status}
                      </span>
                    </div>
                  </div>

                  <p className="font-semibold text-slate-900 dark:text-white">
                    {order.vehicle
                      ? [order.vehicle.brand, order.vehicle.model]
                          .filter(Boolean)
                          .join(' ') ||
                        order.vehicle.name ||
                        `Vehicle #${order.vehicleId}`
                      : `Vehicle #${order.vehicleId}`}
                  </p>
                  {order.vehicle?.plateNumber && (
                    <p className="mt-0.5 font-mono text-sm text-slate-600 dark:text-slate-400">
                      {order.vehicle.plateNumber}
                    </p>
                  )}

                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-slate-500">
                        {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {serviceCount} service{serviceCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="font-semibold text-teal-600 dark:text-teal-400">
                      {formatRp(total)}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/orders/${order.id}`}
                      className="btn btn-sm flex-1 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 dark:border-0 dark:bg-slate-800 dark:text-white"
                    >
                      View
                    </Link>
                    {canPay && (
                      <Link
                        to={`/orders/${order.id}/pay`}
                        className="btn btn-sm flex-1 rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
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