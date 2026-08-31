import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import useAuth from '../../hooks/useAuth' // adjust path
 // adjust path
import { logout } from '../../api/api' // adjust path
import useOrders, { statusColors, statusLabels, type Order, type OrderStatus } from '../../hooks/useOrder'

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
  const items = order.order_items || []
  if (!items.length) return 'No services'
  return items.length === 1 ? '1 service' : `${items.length} services`
}

const vehicleLabel = (order: Order) => {
  const v = order.vehicle
  if (!v) return '—'
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
  const customerName = user?.name || 'Customer'

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
        if (!cancelled) setOrders(data)
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

  const stats = useMemo(() => {
    const computed = useOrders.computeStats(orders)
    const active = computed.PENDING + computed.PROCESSING
    return {
      vehicles: '—', // wire useVehicles later
      active,
      completed: computed.COMPLETED,
    }
  }, [orders])

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Top bar */}
      <div className="navbar bg-base-100 border-b border-base-300 px-4 sm:px-6 sticky top-0 z-20">
        <div className="flex-1">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-content flex items-center justify-center">
              <span className="material-icons text-xl">directions_car</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">WASHINGTON</span>
          </Link>
        </div>
        <div className="flex-none gap-1 sm:gap-2">
          <Link to="/vehicles" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            My Vehicles
          </Link>
          <Link to="/orders" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            My Orders
          </Link>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-9">
                <span className="text-sm">{customerName.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box z-30 w-48 p-2 shadow-lg border border-base-300"
            >
              <li className="menu-title px-3 pt-1 pb-0">
                <span className="text-xs opacity-60">Signed in as</span>
                <span className="font-semibold text-sm">{customerName}</span>
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
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Welcome */}
        <div className="card bg-primary text-primary-content shadow-md mb-6 overflow-hidden">
          <div className="card-body p-5 sm:p-6">
            <p className="text-sm opacity-80">Welcome back</p>
            <h1 className="text-2xl sm:text-3xl font-bold">{customerName} 👋</h1>
            <p className="text-sm opacity-90 mt-1 max-w-md">
              Book a wash, track your order, and manage your vehicles in one place.
            </p>
            <div className="card-actions mt-4 flex flex-wrap gap-2">
              <Link
                to="/orders/create"
                className="btn btn-sm sm:btn-md bg-base-100 text-base-content border-0 rounded-xl"
              >
                <span className="material-icons text-lg">add</span>
                Book a Wash
              </Link>
              <Link
                to="/vehicles"
                className="btn btn-sm sm:btn-md btn-outline border-primary-content/40 text-primary-content rounded-xl"
              >
                <span className="material-icons text-lg">directions_car</span>
                My Vehicles
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              label: 'My Vehicles',
              value: stats.vehicles,
              sub: 'Registered cars',
              icon: 'directions_car',
            },
            {
              label: 'Active Orders',
              value: String(stats.active),
              sub: 'Pending / in progress',
              icon: 'local_car_wash',
            },
            {
              label: 'Completed',
              value: String(stats.completed),
              sub: 'Washes done',
              icon: 'check_circle',
            },
          ].map((s) => (
            <div key={s.label} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-3 sm:p-4 items-center text-center">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-icons text-xl">{s.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold mt-1">{s.value}</p>
                <p className="text-xs sm:text-sm font-medium leading-tight">{s.label}</p>
                <p className="text-[10px] sm:text-xs opacity-50 hidden sm:block">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">My Orders</h2>
              <Link to="/orders" className="btn btn-ghost btn-xs sm:btn-sm">
                See all
              </Link>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md text-primary" />
              </div>
            )}

            {!loading && error && (
              <div role="alert" className="alert alert-error text-sm">
                <span className="material-icons text-lg">error</span>
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && recentOrders.length === 0 && (
              <div className="text-center py-8 opacity-60 text-sm">
                <span className="material-icons text-3xl mb-2 opacity-40">receipt_long</span>
                <p>No orders yet.</p>
                <Link to="/orders/create" className="btn btn-primary btn-sm rounded-xl mt-3">
                  Book a Wash
                </Link>
              </div>
            )}

            {!loading && !error && recentOrders.length > 0 && (
              <div className="flex flex-col gap-3">
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    to={`/orders/${o.id}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-base-200/50 border border-base-300 hover:border-primary/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">#{o.id}</p>
                        {statusBadge(o.status)}
                      </div>
                      <p className="text-sm mt-1 truncate">{serviceSummary(o)}</p>
                      <p className="text-xs opacity-50 mt-0.5">
                        {vehicleLabel(o)}
                        {o.createdAt ? ` · ${formatDate(o.createdAt)}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{formatRp(orderTotal(o))}</p>
                      <span className="material-icons text-base opacity-40">chevron_right</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-base-100 border border-base-300 text-sm opacity-70 flex gap-3">
          <span className="material-icons text-primary shrink-0">info</span>
          <p>
            Add your vehicle first, then tap <strong>Book a Wash</strong> to choose services and
            pay.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Index