import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import useAuth from '../../hooks/useAuth'
import { logout} from '../../api/api'
import useOrders, {
  statusColors,
  statusLabels,
  type Order,
  type OrderStatus,
} from '../../hooks/useOrder'
import { useRealtimeRefresh } from '../../hooks/RealTimeRefresh'
import { supabase } from '../../libs/supabase'

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

const statusBadge = (status?: string) => {
  const key = (status || 'PENDING') as OrderStatus
  const color = statusColors[key] || 'badge-ghost'
  const label = statusLabels[key] || key
  return <span className={`badge badge-sm ${color}`}>{label}</span>
}

const Index = () => {
  const user = useAuth.getUser()
  const customerName = user?.name ?? 'Customer'
  const customerId = typeof user?.id === 'number' ? user.id : null

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await useOrders.fetchOrders()
        if (!cancelled) setOrders(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setError('Failed to load orders.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // 2) Realtime — top level, NOT inside the other useEffect
  useRealtimeRefresh({
    tables: ['orders'], // start with one table
    onChange: () => {
      useOrders.fetchOrders().then((data) => {
        setOrders(Array.isArray(data) ? data : [])
      })
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('debug-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('RAW EVENT', payload)
          useOrders.fetchOrders().then(setOrders)
        }
      )
      .subscribe((status) => console.log('STATUS', status))

  return () => {
    supabase.removeChannel(channel)
  }
}, [])


  const mine =
    customerId === null
      ? orders
      : orders.filter((o) => o.customerId === customerId)

  const computed = useOrders.computeStats(mine)
  const stats = {
    vehicles: '—',
    active: computed.PENDING + computed.PROCESSING,
    completed: computed.COMPLETED,
  }

  const myRecentOrders = [...mine]
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    .slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar — fixed structure */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-teal-400 to-teal-700 text-white shadow">
              <span className="material-icons text-xl">directions_car</span>
            </div>
            <span className="truncate font-bold tracking-tight">WASHINGTON</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/vehicles"
              className="btn btn-ghost btn-sm hidden rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white sm:inline-flex"
            >
              My Vehicles
            </Link>
            <Link
              to="/orders"
              className="btn btn-ghost btn-sm hidden rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white sm:inline-flex"
            >
              My Orders
            </Link>
            <Link
              to="/history"
              className="btn btn-ghost btn-sm hidden rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white sm:inline-flex"
            >
              My History
            </Link>
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle btn-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-teal-400 to-teal-700 text-sm font-semibold text-white">
                  {customerName.charAt(0).toUpperCase()}
                </div>
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content z-40 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-xl"
              >
                <li className="menu-title px-3 py-1">
                  <span className="text-xs text-slate-500">Signed in as</span>
                  <span className="text-sm font-semibold text-slate-100">
                    {customerName}
                  </span>
                </li>
                <div className="divider my-1" />
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
                <li>
                  <Link to="/vehicles">My Vehicles</Link>
                </li>
                <li>
                  <Link to="/orders">My Orders</Link>
                </li>
                <li>
                  <Link to="/history">My History</Link>
                </li>
                <li>
                  <button type="button" onClick={() => logout()}>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Hero — teal gradient like reference */}
        <section className="mb-5 overflow-hidden rounded-2xl bg-linear-to-br from-teal-400 to-teal-800 p-5 shadow-lg sm:p-6">
          <p className="text-sm text-teal-50/90">Welcome back</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            {customerName}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-teal-50">
            Book a wash, track your order, and manage your vehicles in one place.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/orders/create"
              className="btn btn-sm rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600 sm:btn-md"
            >
              <span className="material-icons text-lg">add</span>
              Book a Wash
            </Link>
            <Link
              to="/vehicles"
              className="btn btn-sm rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 sm:btn-md"
            >
              <span className="material-icons text-lg">directions_car</span>
              My Vehicles
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-5 grid grid-cols-3 gap-3">
          {[
            {
              label: 'My Vehicles',
              value: stats.vehicles,
              desc: 'Registered cars',
              icon: 'directions_car',
              iconBg: 'bg-teal-500',
            },
            {
              label: 'Active',
              value: String(stats.active),
              desc: 'Pending / processing',
              icon: 'schedule',
              iconBg: 'bg-orange-500',
            },
            {
              label: 'Completed',
              value: String(stats.completed),
              desc: 'Washes done',
              icon: 'check_circle',
              iconBg: 'bg-teal-500',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4"
            >
              <div
                className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${s.iconBg}`}
              >
                <span className="material-icons text-xl text-white">{s.icon}</span>
              </div>
              <p className="text-xl font-bold text-white sm:text-2xl">{s.value}</p>
              <p className="text-xs font-medium text-slate-300 sm:text-sm">{s.label}</p>
              <p className="mt-0.5 hidden text-[10px] text-slate-500 sm:block">
                {s.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Recent orders */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Orders</h2>
            <Link
              to="/orders"
              className="text-sm font-medium text-teal-400 hover:text-teal-300"
            >
              See all
            </Link>
          </div>

          {loading && (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-md text-teal-400" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-red-500/20 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && myRecentOrders.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              <span className="material-icons mb-2 text-3xl text-slate-600">
                receipt_long
              </span>
              <p>No orders yet.</p>
              <Link
                to="/orders/create"
                className="btn btn-sm mt-3 rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
              >
                Book a Wash
              </Link>
            </div>
          )}

          {!loading && !error && myRecentOrders.length > 0 && (
            <div className="flex flex-col gap-3">
              {myRecentOrders.map((o) => (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition-colors hover:border-teal-500/40"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm text-slate-400">#{o.id}</p>
                      {statusBadge(o.status)}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-white">
                      {serviceSummary(o)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {vehicleLabel(o)}
                      {o.createdAt ? ` · ${formatDate(o.createdAt)}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-white">
                      {formatRp(orderTotal(o))}
                    </p>
                    <span className="material-icons text-base text-slate-600">
                      chevron_right
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Help card — same gradient as reference */}
        <section className="mt-5 rounded-2xl bg-linear-to-br from-teal-400 to-teal-800 p-5">
          <h3 className="text-lg font-semibold text-white">Need a hand?</h3>
          <p className="mt-2 text-sm leading-relaxed text-teal-50">
            Add your vehicle first, then book a wash to choose services and pay.
          </p>
          <Link
            to="/orders"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white"
          >
            Go to Orders
            <span className="material-icons text-lg">arrow_forward</span>
          </Link>
        </section>
      </main>
    </div>
  )
}

export default Index