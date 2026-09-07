// src/components/pages/index.tsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import useAuth from '../../hooks/useAuth'
import { logout } from '../../api/api'
import useOrders, {
  statusColors,
  statusLabels,
  type Order,
  type OrderStatus,
} from '../../hooks/useOrder'
import useVehicle from '../../hooks/useVehicles'
import { useRealtimeRefresh } from '../../hooks/realTimeRefresh'
import ThemeToggle from '../ui/themeToggle'

const formatRp = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)

const orderTotal = (order: Order) =>
  (order.order_items || []).reduce(
    (sum, item) => sum + (item.subtotal ?? (item.price || 0) * (item.qty || 1)),
    0
  )

const serviceSummary = (order: Order) => {
  const qty =
    order.order_items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0
  if (!qty) return 'No services'
  return qty === 1 ? '1 service' : `${qty} services`
}

const vehicleLabel = (order: Order) => {
  const v = order.vehicle
  if (!v) return order.vehicleId ? `Vehicle #${order.vehicleId}` : '—'
  const plate = v.plateNumber || ''
  const name = [v.brand, v.model].filter(Boolean).join(' ') || v.name || ''
  return [plate, name].filter(Boolean).join(' · ') || `Vehicle #${v.id}`
}

const formatDate = (value?: string) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const isPaidOrder = (order: Order) => {
  const o = order as Order & {
    payments?: { status?: string }[]
    payements?: { status?: string }[]
  }
  const list = o.payments ?? o.payements ?? []
  return list.some((p) => String(p.status || '').toUpperCase() === 'PAID')
}

const StatusBadge = ({ status }: { status?: string }) => {
  const key = (status || 'PENDING') as OrderStatus
  return (
    <span className={`badge badge-sm border-0 ${statusColors[key] || 'badge-ghost'}`}>
      {statusLabels[key] || key}
    </span>
  )
}

const Index = () => {
  const user = useAuth.getUser() as { id?: number | string; name?: string } | null
  const customerName = user?.name ?? 'there'
  const rawId = user?.id
  const customerId =
    rawId != null && rawId !== '' ? Number(rawId) : NaN
  const hasCustomer = Number.isFinite(customerId) && customerId > 0

  const [orders, setOrders] = useState<Order[]>([])
  const [vehicleCount, setVehicleCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    const [orderData, vehicleData] = await Promise.all([
      useOrders.fetchOrders(),
      hasCustomer
        ? useVehicle.fetchVehiclesByCustomer(customerId)
        : Promise.resolve([]),
    ])
    setOrders(Array.isArray(orderData) ? orderData : [])
    setVehicleCount(Array.isArray(vehicleData) ? vehicleData.length : 0)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError('')
        await loadDashboard()
      } catch {
        if (!cancelled) setError('Could not load your dashboard. Try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCustomer, customerId])

  useRealtimeRefresh({
    tables: ['orders', 'vehicles', 'order_items', 'payments'],
    onChange: () => {
      void loadDashboard().catch(() => undefined)
    },
  })

  const mine = useMemo(() => {
    if (!hasCustomer) return orders
    return orders.filter((o) => Number(o.customerId) === customerId)
  }, [orders, hasCustomer, customerId])

  const computed = useOrders.computeStats(mine)
  const stats = {
    vehicles: vehicleCount,
    active: (computed.PENDING || 0) + (computed.PROCESSING || 0),
    completed: computed.COMPLETED || 0,
  }

  const sorted = useMemo(
    () =>
      [...mine].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return tb - ta
      }),
    [mine]
  )

  const activeOrders = sorted.filter(
    (o) => o.status === 'PENDING' || o.status === 'PROCESSING'
  )
  const unpaidOrders = sorted.filter(
    (o) =>
      o.status !== 'CANCELLED' &&
      o.status !== 'COMPLETED' &&
      !isPaidOrder(o)
  )
  const recentOrders = sorted.slice(0, 3)

  const isNewUser = !loading && stats.vehicles === 0 && mine.length === 0

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-teal-400 to-teal-700 text-white shadow-md shadow-teal-900/20">
              <span className="material-icons text-xl">local_car_wash</span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold tracking-tight">WASHINGTON</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Car wash
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle className="text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" />
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle btn-sm"
                aria-label="Account menu"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-700 text-sm font-bold text-white">
                  {customerName.charAt(0).toUpperCase()}
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content z-40 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                <li className="menu-title px-2 py-1">
                  <span className="text-[11px] font-normal text-slate-400">Signed in as</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {customerName}
                  </span>
                </li>
                <div className="divider my-1" />
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
                <li>
                  <Link to="/vehicles">My vehicles</Link>
                </li>
                <li>
                  <Link to="/orders">My orders</Link>
                </li>
                <li>
                  <Link to="/history">History</Link>
                </li>
                <div className="divider my-1" />
                <li>
                  <button type="button" className="text-red-500" onClick={() => logout()}>
                    Log out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Hero */}
        <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-teal-400 via-teal-600 to-teal-900 p-6 shadow-xl shadow-teal-900/20 sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-sm font-medium text-teal-50/90">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {customerName}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-teal-50/90">
            {isNewUser
              ? 'Add your car, then book a wash in a few taps.'
              : 'Track active washes and book your next one anytime.'}
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to="/orders/create"
              className="btn h-12 rounded-2xl border-0 bg-white text-base font-semibold text-teal-800 shadow-lg hover:bg-teal-50"
            >
              <span className="material-icons">add</span>
              Book a wash
            </Link>
            <Link
              to="/vehicles"
              className="btn h-12 rounded-2xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <span className="material-icons">directions_car</span>
              Vehicles
            </Link>
          </div>
        </section>

        {/* First-time guide */}
        {isNewUser && (
          <section className="mb-6 rounded-2xl border border-dashed border-teal-500/40 bg-teal-500/5 p-5 dark:bg-teal-500/10">
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
              Get started in 2 steps
            </p>
            <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  1
                </span>
                <span>
                  <Link to="/vehicles/create" className="font-semibold text-teal-600 dark:text-teal-400">
                    Add your vehicle
                  </Link>{' '}
                  (plate & model)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                  2
                </span>
                <span>
                  <Link to="/orders/create" className="font-semibold text-teal-600 dark:text-teal-400">
                    Book a wash
                  </Link>{' '}
                  and pay when ready
                </span>
              </li>
            </ol>
          </section>
        )}

        {/* Attention: unpaid / active */}
        {!loading && (unpaidOrders[0] || activeOrders[0]) && (
          <section className="mb-6 space-y-3">
            {unpaidOrders[0] && !isPaidOrder(unpaidOrders[0]) && (
              <Link
                to={`/orders/${unpaidOrders[0].id}/pay`}
                className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 transition hover:border-amber-500/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <span className="material-icons">payments</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Payment waiting
                  </p>
                  <p className="truncate text-sm text-amber-800/80 dark:text-amber-200/80">
                    Order #{unpaidOrders[0].id} · {formatRp(orderTotal(unpaidOrders[0]))}
                  </p>
                </div>
                <span className="material-icons text-amber-600 dark:text-amber-400">
                  chevron_right
                </span>
              </Link>
            )}

            {activeOrders
              .filter((o) => o.status === 'PROCESSING')
              .slice(0, 1)
              .map((o) => (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4 transition hover:border-sky-500/50"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
                    <span className="material-icons">local_car_wash</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sky-800 dark:text-sky-200">
                      Your car is being washed
                    </p>
                    <p className="truncate text-sm text-sky-800/80 dark:text-sky-200/80">
                      {vehicleLabel(o)} · Order #{o.id}
                    </p>
                  </div>
                  <span className="material-icons text-sky-600 dark:text-sky-400">
                    chevron_right
                  </span>
                </Link>
              ))}
          </section>
        )}

        {/* Stats */}
        <section className="mb-6 grid grid-cols-3 gap-3">
          {[
            {
              to: '/vehicles',
              label: 'Vehicles',
              value: stats.vehicles,
              icon: 'directions_car',
              tone: 'from-teal-500 to-teal-700',
            },
            {
              to: '/orders',
              label: 'Active',
              value: stats.active,
              icon: 'schedule',
              tone: 'from-orange-500 to-orange-600',
            },
            {
              to: '/history',
              label: 'Done',
              value: stats.completed,
              icon: 'check_circle',
              tone: 'from-emerald-500 to-emerald-600',
            },
          ].map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-teal-500/30 dark:border-slate-800 dark:bg-slate-900 sm:p-4"
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br ${s.tone} text-white`}
              >
                <span className="material-icons text-xl">{s.icon}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                {loading ? '—' : s.value}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {s.label}
              </p>
            </Link>
          ))}
        </section>

        {/* Recent */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold sm:text-lg">Recent orders</h2>
            <Link
              to="/orders"
              className="text-sm font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400"
            >
              See all
            </Link>
          </div>

          {loading && (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-md text-teal-500" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && recentOrders.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <span className="material-icons text-3xl text-slate-400">receipt_long</span>
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-200">No orders yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Book your first wash to see it here.
              </p>
              <Link
                to="/orders/create"
                className="btn btn-sm mt-4 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
              >
                Book a wash
              </Link>
            </div>
          )}

          {!loading && !error && recentOrders.length > 0 && (
            <ul className="flex flex-col gap-2">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/orders/${o.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-teal-500/40 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">#{o.id}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{serviceSummary(o)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {vehicleLabel(o)}
                        {o.createdAt ? ` · ${formatDate(o.createdAt)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatRp(orderTotal(o))}</p>
                      <span className="material-icons text-base text-slate-400">chevron_right</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Help */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <span className="material-icons">info</span>
            </div>
            <div>
              <h3 className="font-semibold">How it works</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Add a vehicle, book a wash, pay online, then track progress from waiting →
                washing → done.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-teal-600 dark:text-teal-400">
                <Link to="/vehicles/create" className="hover:underline">
                  Add vehicle
                </Link>
                <Link to="/orders/create" className="hover:underline">
                  Book a wash
                </Link>
                <Link to="/orders" className="hover:underline">
                  My orders
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Index