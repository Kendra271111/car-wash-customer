// src/components/pages/orders/viewOrder.tsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import axios from 'axios'
import useOrders, {
  type Order,
  type OrderStatus,
} from '../../../hooks/useOrder'
import { api } from '../../../api/api'
import { useRealtimeRefresh } from '../../../hooks/realTimeRefresh'

type PaymentInfo = {
  id?: number
  status?: string
  method?: string
  amount?: number
}

const STEPS: {
  key: OrderStatus
  label: string
  hint: string
  icon: string
}[] = [
  {
    key: 'PENDING',
    label: 'Waiting',
    hint: 'Order received, waiting to start',
    icon: 'schedule',
  },
  {
    key: 'PROCESSING',
    label: 'In Progress',
    hint: 'Your car is being washed',
    icon: 'local_car_wash',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    hint: 'All done — ready for pickup',
    icon: 'check_circle',
  },
]

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('id-ID', {
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

const paymentsOf = (order: Order | null): PaymentInfo[] => {
  if (!order) return []
  const o = order as Order & {
    payments?: PaymentInfo[]
    payements?: PaymentInfo[]
  }
  return [...(o.payments ?? o.payements ?? [])]
}

const pickPayment = (list: PaymentInfo[]): PaymentInfo | null => {
  if (!list.length) return null
  const paid = list.find((p) => String(p.status).toUpperCase() === 'PAID')
  if (paid) return paid
  return [...list].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0] ?? null
}

const stepIndex = (status: OrderStatus) => {
  if (status === 'CANCELLED') return -1
  const i = STEPS.findIndex((s) => s.key === status)
  return i >= 0 ? i : 0
}

const ViewOrder = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [extraPayment, setExtraPayment] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
  if (!id) return
  let cancelled = false;

  (async () => {
    setError(null)
    try {
      const data = await useOrders.fetchOrderById(id)
      if (cancelled) return
      setOrder(data)
      try {
        const { data: payRes } = await api.get(`/payments/order/${id}`)
        if (!cancelled) setExtraPayment((payRes?.data as PaymentInfo) ?? null)
      } catch {
        if (!cancelled) setExtraPayment(null)
      }
    } catch (err: unknown) {
      if (cancelled) return
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Failed to load order.'
          : 'Failed to load order.'
      )
      setOrder(null)
    } finally {
      if (!cancelled) setLoading(false)
    }
  })()

  return () => {
    cancelled = true
  }
}, [id])

const silentReload = useCallback(async () => {
  if (!id) return
  try {
    const data = await useOrders.fetchOrderById(id)
    setOrder(data)
    try {
      const { data: payRes } = await api.get(`/payments/order/${id}`)
      setExtraPayment((payRes?.data as PaymentInfo) ?? null)
    } catch {
      // Payment endpoint failed — order data still updated above
      setExtraPayment(null)
    }
  } catch {
    // Realtime refresh failed — do nothing, leave current order visible
  }
}, [id])

useRealtimeRefresh({
  tables: ['orders', 'payments'],
  onChange: () => {
    void silentReload()
  },
})

  const status = (order?.status || 'PENDING') as OrderStatus
  const fromOrder = pickPayment(paymentsOf(order))
  const payment = pickPayment(
    [fromOrder, extraPayment].filter(Boolean) as PaymentInfo[]
  )
  const paid = String(payment?.status || '').toUpperCase() === 'PAID'
  const total = (order?.order_items || []).reduce(
    (sum, item) =>
      sum + Number(item.subtotal ?? (item.price || 0) * (item.qty || 1)),
    0
  )
  const canPay = status !== 'CANCELLED' && !paid
  const active = stepIndex(status)
  const cancelled = status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
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
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {loading && (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-teal-400" />
          </div>
        )}

        {!loading && (error || !order) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <span className="material-icons text-4xl text-red-400">
              error_outline
            </span>
            <p className="mt-3 text-red-300">{error || 'Order not found.'}</p>
            <Link to="/orders" className="btn btn-sm mt-4 rounded-xl bg-slate-800">
              Back to orders
            </Link>
          </div>
        )}

        {!loading && order && (
          <div className="print:text-black">
            <div className="mb-4 hidden print:block">
              <h1 className="text-2xl font-bold">WASHINGTON</h1>
              <p className="text-sm text-slate-600">
                Service Ticket · Order #{order.id}
              </p>
            </div>

            {cancelled ? (
              <section className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-3xl text-red-400">
                    cancel
                  </span>
                  <div>
                    <p className="font-semibold text-red-300">Order cancelled</p>
                    <p className="text-sm text-red-200/70">
                      This wash request is no longer active.
                    </p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mb-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Order progress
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {STEPS.map((step, i) => {
                    const done = i < active
                    const current = i === active
                    return (
                      <div
                        key={step.key}
                        className={`relative rounded-2xl border p-4 transition-all ${
                          current
                            ? 'border-teal-500/60 bg-linear-to-br from-teal-500/20 to-teal-800/30 shadow-lg shadow-teal-900/20'
                            : done
                              ? 'border-emerald-500/30 bg-emerald-500/10'
                              : 'border-slate-800 bg-slate-900/80 opacity-60'
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`material-icons text-2xl ${
                              current
                                ? 'text-teal-300'
                                : done
                                  ? 'text-emerald-400'
                                  : 'text-slate-600'
                            }`}
                          >
                            {done ? 'check_circle' : step.icon}
                          </span>
                          {current && (
                            <span className="rounded-full bg-teal-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-200">
                              Now
                            </span>
                          )}
                          {done && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                              Done
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm font-semibold ${
                            current
                              ? 'text-white'
                              : done
                                ? 'text-emerald-200'
                                : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${
                            current ? 'text-teal-100/80' : 'text-slate-500'
                          }`}
                        >
                          {step.hint}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 px-1">
                  <span
                    className={`text-xs font-medium ${
                      paid ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {paid ? 'Payment: Paid' : 'Payment: Unpaid'}
                  </span>
                  {payment?.method && (
                    <span className="text-xs text-slate-500">
                      {payment.method}
                    </span>
                  )}
                </div>
              </section>
            )}

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
                value={
                  order.staff?.name ||
                  (order.staffId ? `Staff ${order.staffId}` : '—')
                }
                last
              />
            </section>

            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
              <h2 className="mb-3 text-sm font-semibold print:text-black">
                Services
              </h2>
              {(order.order_items || []).length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">
                  No services.
                </p>
              ) : (
                (order.order_items || []).map((item, i) => (
                  <div
                    key={item.id ?? i}
                    className="mb-2 flex items-start justify-between border-b border-slate-800 pb-2 last:mb-0 last:border-0 print:border-slate-200"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {(item as { service?: { name?: string } }).service
                          ?.name || `Service #${item.serviceId}`}
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
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                  Notes
                </p>
                <p className="text-sm text-slate-300 print:text-slate-700">
                  {order.note}
                </p>
              </section>
            )}

            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 print:border-slate-300 print:bg-white">
              <p className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Payment
              </p>
              {payment ? (
                <p className="text-sm font-medium">
                  {String(payment.status).toUpperCase()}
                  {payment.method ? ` · ${payment.method}` : ''}
                  {payment.amount != null
                    ? ` · ${formatRp(Number(payment.amount))}`
                    : ''}
                </p>
              ) : (
                <p className="text-sm text-slate-500">No payment yet</p>
              )}
            </section>

            <div className="flex flex-col gap-2 print:hidden">
              {canPay && (
                <Link
                  to={`/orders/${id}/pay`}
                  className="btn w-full rounded-xl border-0 bg-pink-500 text-white hover:bg-pink-600"
                >
                  Go to Payment
                </Link>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="btn w-full rounded-xl border border-slate-700 bg-transparent text-slate-300"
              >
                <span className="material-icons text-lg">print</span>
                Print service ticket
              </button>
              <Link
                to="/orders"
                className="btn w-full rounded-xl border-0 bg-slate-800 text-slate-200"
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