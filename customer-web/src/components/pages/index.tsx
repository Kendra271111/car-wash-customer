import { Link } from 'react-router'

const stats = [
  { label: 'Orders Today', value: '12', sub: '+3 from yesterday', icon: 'receipt_long' },
  { label: 'Pending Payment', value: '4', sub: 'Awaiting payment', icon: 'pending_actions' },
  { label: 'In Progress', value: '3', sub: 'Being washed', icon: 'local_car_wash' },
  { label: 'Completed', value: '28', sub: 'This week', icon: 'check_circle' },
]

const recentOrders = [
  { id: 'ORD-1042', customer: 'Budi Santoso', vehicle: 'B 1234 ABC', total: 'Rp 85.000', status: 'paid' },
  { id: 'ORD-1041', customer: 'Siti Aminah', vehicle: 'D 5678 XYZ', total: 'Rp 150.000', status: 'pending_payment' },
  { id: 'ORD-1040', customer: 'Andi Wijaya', vehicle: 'F 9012 DEF', total: 'Rp 50.000', status: 'in_progress' },
  { id: 'ORD-1039', customer: 'Rina Putri', vehicle: 'B 3456 GHI', total: 'Rp 200.000', status: 'completed' },
]

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    paid: 'badge-success',
    pending_payment: 'badge-warning',
    in_progress: 'badge-info',
    completed: 'badge-ghost',
    cancelled: 'badge-error',
  }
  const label = status.replace('_', ' ')
  return <span className={`badge badge-sm ${map[status] || 'badge-ghost'} capitalize`}>{label}</span>
}

const Index = () => {
  return (
    <div className="min-h-screen bg-base-200">
      {/* Top bar */}
      <div className="navbar bg-base-100 border-b border-base-300 px-4 sm:px-6 sticky top-0 z-20">
        <div className="flex-1">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-content flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">directions_car</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">WASHINGTON</span>
          </Link>
        </div>
        <div className="flex-none gap-2">
          <Link to="/vehicles" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Vehicles
          </Link>
          <Link to="/orders" className="btn btn-ghost btn-sm hidden sm:inline-flex">
            Orders
          </Link>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-9">
                <span className="text-sm">U</span>
              </div>
            </div>
            <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-30 w-44 p-2 shadow-lg border border-base-300">
              <li><Link to="/profile">Profile</Link></li>
              <li><button type="button">Logout</button></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm opacity-60 mt-0.5">Car wash overview & quick actions</p>
          </div>
          <div className="flex gap-2">
            <Link to="/vehicles" className="btn btn-outline btn-sm sm:btn-md rounded-xl">
              <span className="material-symbols-outlined text-lg">directions_car</span>
              Vehicles
            </Link>
            <Link to="/orders/create" className="btn btn-primary btn-sm sm:btn-md rounded-xl">
              <span className="material-symbols-outlined text-lg">add</span>
              Create Order
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">{s.icon}</span>
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold mt-2">{s.value}</p>
                <p className="text-sm font-medium opacity-80">{s.label}</p>
                <p className="text-xs opacity-50">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent orders */}
        <div className="card bg-base-100 shadow-sm border border-base-300">
          <div className="card-body p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title text-lg">Recent Orders</h2>
              <Link to="/orders" className="btn btn-ghost btn-sm">
                View all
              </Link>
            </div>

            {/* Mobile: cards */}
            <div className="flex flex-col gap-3 sm:hidden">
              {recentOrders.map((o) => (
                <div key={o.id} className="p-3 rounded-xl bg-base-200/60 border border-base-300">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-sm">{o.id}</p>
                      <p className="text-sm opacity-70">{o.customer}</p>
                      <p className="text-xs opacity-50 mt-0.5">{o.vehicle}</p>
                    </div>
                    {statusBadge(o.status)}
                  </div>
                  <p className="text-sm font-medium mt-2">{o.total}</p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover">
                      <td className="font-medium">{o.id}</td>
                      <td>{o.customer}</td>
                      <td className="font-mono text-sm">{o.vehicle}</td>
                      <td>{o.total}</td>
                      <td>{statusBadge(o.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Placeholder note */}
        <p className="text-center text-xs opacity-40 mt-8">
          Placeholder dashboard — wire up real data from your API when ready
        </p>
      </div>
    </div>
  )
}

export default Index