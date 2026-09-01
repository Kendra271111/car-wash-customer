// src/components/pages/orders/viewOrder.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import axios from 'axios'
import useOrders, {
  statusColors,
  statusLabels,
  type Order,
  type OrderStatus,
} from '../../../hooks/useOrder'

type PaymentInfo = {
  id?: number
  status?: string
  method?: string
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n)

const paymentsOf = (order: Order): PaymentInfo[] => {
  const raw =
    order.payements ||
    (order as { payments?: PaymentInfo[] }).payments ||
    []
  return raw as PaymentInfo[]
}
const ViewOrder = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await useOrders.fetchOrderById(id)
      setOrder(data)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load order.')
      } else {
        setError('Failed to load order.')
      }
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
  if (!id) return
  let cancelled = false

  ;(async () => {
    setError(null)
    try {
      const data = await useOrders.fetchOrderById(id)
      if (!cancelled) setOrder(data)
    } catch (err: unknown) {
      if (cancelled) return
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load order.')
      } else {
        setError('Failed to load order.')
      }
      if (!cancelled) setOrder(null)
    } finally {
      if (!cancelled) setLoading(false)
    }
  })()

  return () => {
    cancelled = true
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when id changes
}, [id])

  const payment = paymentsOf(order || ({} as Order))[0] || null
  const status = (order?.status || 'PENDING') as OrderStatus
  const isPaid =
    payment?.status === 'PAID' || payment?.status === 'paid'
  const total = (order?.order_items || []).reduce(
    (sum, item) => sum + Number(item.subtotal ?? (item.price || 0) * (item.qty || 1)),
    0
  )
  const showPay = status !== 'CANCELLED' && !isPaid
  const showCancel = status === 'PENDING' && !isPaid

  const handleCancel = async () => {
    if (!id || !confirm('Cancel this order?')) return
    setCancelling(true)
    try {
      await useOrders.updateOrderStatus(id, 'CANCELLED')
      await loadOrder()
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to cancel order.')
      } else {
        setError('Failed to cancel order.')
      }
    } finally {
      setCancelling(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            <div>
              <h1 className="text-lg font-bold leading-tight">Order #{id}</h1>
              <p className="text-xs text-slate-500">
                {order ? formatDate(order.createdAt) : '…'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {loading && (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-teal-400" />
          </div>
        )}

        {!loading && (error || !order) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <span className="material-icons text-4xl text-red-400">error_outline</span>
            <p className="mt-3 text-red-300">{error || 'Order not found.'}</p>
            <Link to="/orders" className="btn btn-sm mt-4 rounded-xl bg-slate-800">
              Back to orders
            </Link>
          </div>
        )}

        {!loading && order && (
          <div className="print:text-black">
            {/* Print header */}
            <div className="mb-4 hidden print:block">
              <h1 className="text-2xl font-bold">WASHINGTON</h1>
              <p className="text-sm text-slate-600">Service Ticket · Order #{order.id}</p>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className={`badge ${statusColors[status] || 'badge-ghost'}`}>
                {statusLabels[status] || status}
              </span>
              <span className="text-sm text-slate-400">
                {isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>

            {/* Summary */}
            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
              <Row
                label="Customer"
                value={order.customer?.name || `Customer #${order.customerId}`}
                sub={order.customer?.phone || order.customer?.email}
              />
              <Row
                label="Vehicle"
                value={
                  order.vehicle
                    ? `${order.vehicle.brand || ''} ${order.vehicle.model || ''}`.trim() ||
                      order.vehicle.name ||
                      `Vehicle #${order.vehicleId}`
                    : `Vehicle #${order.vehicleId}`
                }
                sub={order.vehicle?.plateNumber}
              />
              <Row
                label="Staff"
                value={order.staff?.name || (order.staffId ? `Staff #${order.staffId}` : '—')}
                last
              />
            </section>

            {/* Items */}
            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
              <h2 className="mb-3 text-sm font-semibold text-white print:text-black">
                Services
              </h2>
              {(order.order_items || []).length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No services.</p>
              ) : (
                (order.order_items || []).map((item, i) => (
                  <div
                    key={item.id ?? i}
                    className="mb-2 flex items-start justify-between border-b border-slate-800 pb-2 last:mb-0 last:border-0 print:border-slate-200"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {(item as { service?: { name?: string } }).service?.name ||
                          `Service #${item.serviceId}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.duration || 0} min · qty {item.qty || 1}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatRp(Number(item.subtotal || 0))}
                    </p>
                  </div>
                ))
              )}
              <div className="mt-3 flex items-center justify-between pt-2">
                <span className="font-semibold text-slate-300 print:text-slate-700">
                  Total
                </span>
                <span className="text-xl font-bold text-teal-400 print:text-teal-700">
                  {formatRp(total)}
                </span>
              </div>
            </section>

            {!!order.note && (
              <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Notes</p>
                <p className="text-sm text-slate-300 print:text-slate-700">{order.note}</p>
              </section>
            )}

            {payment && (
              <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Payment</p>
                <p className="text-sm font-medium">
                    {payment.status}
                    {payment.method ? ` · ${payment.method}` : ''}
                </p>
              </section>
            )}

            {/* Actions — customer */}
            <div className="flex flex-col gap-2 justify-center print:hidden">
                <div className="flex flex-row gap-3 w-[49%] items-center print:hidden">
                    {showPay && (
                  <Link
                    to={`/orders/${id}/pay`}
                    className="btn rounded-xl border-0 w-full bg-pink-500 text-white hover:bg-pink-600"
                  >
                    Go to Payment
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn rounded-xl border w-full border-slate-700 bg-transparent text-slate-300"
                >
                  <span className="material-icons text-lg">print</span>
                  Print service ticket
                </button>
              </div>
              
              <Link
                to="/orders"
                className="btn rounded-xl border-0 bg-slate-800 text-slate-200"
              >
                Back to orders
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function Row({
  label,
  value,
  sub,
  last,
}: {
  label: string
  value: string
  sub?: string | number
  last?: boolean
}) {
  return (
    <div
      className={`flex items-start justify-between py-2 ${
        last ? '' : 'border-b border-slate-800 print:border-slate-200'
      }`}
    >
      <span className="w-24 text-xs text-slate-500">{label}</span>
      <div className="min-w-0 flex-1 text-right">
        <p className="text-sm font-medium text-white print:text-black">{value}</p>
        {sub != null && sub !== '' && (
          <p className="text-xs text-slate-500">{String(sub)}</p>
        )}
      </div>
    </div>
  )
}

export default ViewOrder