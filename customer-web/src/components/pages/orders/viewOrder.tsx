// src/components/pages/orders/viewOrder.tsx
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import axios from 'axios'
import useOrders, {
  type Order,
  type OrderStatus,
} from '../../../hooks/useOrder'
import { api } from '../../../api/api'
import { useRealtimeRefresh } from '../../../hooks/realTimeRefresh'
import ThemeToggle from '../../ui/themeToggle'

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
    hint: 'Booking received',
    icon: 'schedule',
  },
  {
    key: 'PROCESSING',
    label: 'Washing',
    hint: 'In the bay',
    icon: 'local_car_wash',
  },
  {
    key: 'COMPLETED',
    label: 'Done',
    hint: 'Ready for pickup',
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

const methodLabel = (method?: string) => {
  if (!method) return ''
  const m = method.toLowerCase()
  if (m.includes('bank') || m === 'transfer') return 'Bank transfer'
  if (m.includes('qris')) return 'QRIS'
  if (
    m.includes('gopay') ||
    m.includes('ovo') ||
    m.includes('dana') ||
    m.includes('e-money') ||
    m.includes('emoney')
  )
    return 'E-money'
  if (m === 'cash') return 'Cash'
  return method.replace(/_/g, ' ')
}

const hasStaff = (order: Order | null) => {
  if (!order) return false
  if (order.staff?.name || order.staff?.id) return true
  if (order.staffId != null && Number(order.staffId) > 0) return true
  return false
}

const ViewOrder = () => {
  const { id } = useParams()

  const [order, setOrder] = useState<Order | null>(null)
  const [extraPayment, setExtraPayment] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    ;(async () => {
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
            ? err.response?.data?.message || 'Could not load this order.'
            : 'Could not load this order.'
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
        setExtraPayment(null)
      }
    } catch {
      /* keep UI */
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

  const payStatus = String(payment?.status || '').toUpperCase()
  const paid = payStatus === 'PAID'
  const paymentPending =
    !paid &&
    (payStatus === 'PENDING' ||
      payStatus === 'SETTLEMENT' ||
      payStatus === 'CAPTURE')

  const total = (order?.order_items || []).reduce(
    (sum, item) =>
      sum + Number(item.subtotal ?? (item.price || 0) * (item.qty || 1)),
    0
  )

  const canPay = status !== 'CANCELLED' && !paid && !paymentPending
  const active = stepIndex(status)
  const cancelled = status === 'CANCELLED'
  const staffReady = hasStaff(order)
  const waitingForShop =
    !cancelled && status === 'PENDING' && paid && !staffReady
  const waitingInQueue =
    !cancelled && status === 'PENDING' && paid && staffReady

  const vehicleTitle = order?.vehicle
    ? [order.vehicle.brand, order.vehicle.model].filter(Boolean).join(' ') ||
      order.vehicle.name ||
      '—'
    : '—'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 print:bg-white print:text-black">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to="/orders"
              className="btn btn-ghost btn-sm btn-circle text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">
                Order #{id}
              </h1>
              <p className="text-xs text-slate-500">
                {order ? formatDate(order.createdAt) : '…'}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 print:max-w-none print:px-8 print:py-6">
        {loading && (
          <div className="flex justify-center py-20 print:hidden">
            <span className="loading loading-spinner loading-lg text-teal-500" />
          </div>
        )}

        {!loading && (error || !order) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center print:hidden dark:border-slate-800 dark:bg-slate-900">
            <span className="material-icons text-4xl text-red-400">error_outline</span>
            <p className="mt-3 text-red-600 dark:text-red-300">
              {error || 'Order not found.'}
            </p>
            <Link
              to="/orders"
              className="btn btn-sm mt-4 rounded-xl bg-slate-800 text-white"
            >
              Back to my orders
            </Link>
          </div>
        )}

        {!loading && order && (
          <>
            {/* PRINT TICKET */}
            <div className="hidden print:block">
              <div className="border-b border-black pb-3">
                <h1 className="text-2xl font-bold tracking-tight">WASHINGTON</h1>
                <p className="text-sm">Service ticket</p>
                <p className="mt-2 text-sm">
                  Order #{order.id}
                  <span className="mx-2">·</span>
                  {formatDate(order.createdAt)}
                </p>
              </div>

              <table className="mt-4 w-full text-sm">
                <tbody>
                  <tr>
                    <td className="w-28 py-1 align-top text-slate-600">Customer</td>
                    <td className="py-1 font-medium">
                      {order.customer?.name || '—'}
                      {(order.customer?.phone || order.customer?.email) && (
                        <span className="block text-xs font-normal text-slate-600">
                          {order.customer?.phone || order.customer?.email}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top text-slate-600">Vehicle</td>
                    <td className="py-1 font-medium">
                      {vehicleTitle}
                      {order.vehicle?.plateNumber && (
                        <span className="block font-mono text-xs font-normal">
                          {order.vehicle.plateNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top text-slate-600">Crew</td>
                    <td className="py-1 font-medium">{order.staff?.name || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 align-top text-slate-600">Status</td>
                    <td className="py-1 font-medium">
                      {cancelled
                        ? 'Cancelled'
                        : STEPS.find((s) => s.key === status)?.label || status}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-5 border-t border-black pt-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide">
                  Services
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-left text-xs text-slate-600">
                      <th className="pb-1 font-medium">Item</th>
                      <th className="pb-1 text-center font-medium">Qty</th>
                      <th className="pb-1 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.order_items || []).map((item, i) => (
                      <tr key={item.id ?? i} className="border-b border-slate-200">
                        <td className="py-2">
                          {(item as { service?: { name?: string } }).service?.name ||
                            'Service'}
                          <span className="block text-xs text-slate-600">
                            {item.duration || 0} min
                          </span>
                        </td>
                        <td className="py-2 text-center">{item.qty || 1}</td>
                        <td className="py-2 text-right">
                          {formatRp(Number(item.subtotal || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex justify-between border-t-2 border-black pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatRp(total)}</span>
                </div>
              </div>

              <div className="mt-4 border-t border-black pt-3 text-sm">
                <p>
                  <span className="text-slate-600">Payment: </span>
                  <strong>
                    {paid
                      ? `Paid${payment?.method ? ` · ${methodLabel(payment.method)}` : ''}`
                      : paymentPending
                        ? 'Confirming…'
                        : 'Unpaid'}
                  </strong>
                </p>
                {!!order.note && (
                  <p className="mt-2">
                    <span className="text-slate-600">Notes: </span>
                    {order.note}
                  </p>
                )}
              </div>

              <p className="mt-8 text-center text-xs text-slate-500">
                Thank you · Please show this ticket at the bay
              </p>
            </div>

            {/* SCREEN */}
            <div className="print:hidden space-y-4">
              {cancelled ? (
                <section className="flex gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
                  <span className="material-icons text-3xl text-red-500">cancel</span>
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-300">
                      This order was cancelled
                    </p>
                    <p className="mt-0.5 text-sm text-red-700/80 dark:text-red-200/70">
                      It is no longer active. Contact the shop if you need help.
                    </p>
                  </div>
                </section>
              ) : (
                <>
                  {/* Progress */}
                  <section>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Progress
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {STEPS.map((step, i) => {
                        const done = i < active
                        const current = i === active
                        return (
                          <div
                            key={step.key}
                            className={`rounded-2xl border p-3 sm:p-4 ${
                              current
                                ? 'border-teal-500/50 bg-linear-to-br from-teal-500/15 to-teal-700/20'
                                : done
                                  ? 'border-emerald-500/30 bg-emerald-500/10'
                                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                            }`}
                          >
                            <span
                              className={`material-icons text-2xl ${
                                current
                                  ? 'text-teal-600 dark:text-teal-300'
                                  : done
                                    ? 'text-emerald-500'
                                    : 'text-slate-400'
                              }`}
                            >
                              {done ? 'check_circle' : step.icon}
                            </span>
                            <p
                              className={`mt-2 text-sm font-semibold ${
                                current || done
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-500'
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {step.hint}
                            </p>
                            {current && (
                              <span className="mt-2 inline-block rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-200">
                                Now
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  {/* Waiting banners */}
                  {waitingForShop && (
                    <section className="flex gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                      <span className="material-icons text-2xl text-sky-600 dark:text-sky-300">
                        hourglass_top
                      </span>
                      <div>
                        <p className="font-semibold text-sky-900 dark:text-sky-100">
                          Please wait a moment
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-sky-900/80 dark:text-sky-100/80">
                          We are assigning a crew member to start your wash. You will
                          see progress move to <strong>Washing</strong> once work begins.
                          Other cars may finish ahead of you — thanks for your patience.
                        </p>
                      </div>
                    </section>
                  )}

                  {waitingInQueue && (
                    <section className="flex gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
                      <span className="material-icons text-2xl text-teal-700 dark:text-teal-300">
                        groups
                      </span>
                      <div>
                        <p className="font-semibold text-teal-900 dark:text-teal-100">
                          Crew assigned — almost ready
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-teal-900/80 dark:text-teal-100/80">
                          <strong>{order.staff?.name || 'Your crew'}</strong> will start
                          when the bay is free. Hang tight while other orders finish if
                          needed.
                        </p>
                      </div>
                    </section>
                  )}

                  {status === 'PROCESSING' && (
                    <section className="flex gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-4">
                      <span className="material-icons text-2xl text-teal-600 dark:text-teal-300">
                        local_car_wash
                      </span>
                      <div>
                        <p className="font-semibold text-teal-900 dark:text-teal-100">
                          Your car is being washed
                        </p>
                        <p className="mt-1 text-sm text-teal-900/80 dark:text-teal-100/80">
                          {order.staff?.name
                            ? `${order.staff.name} is on it.`
                            : 'Our crew is working on your vehicle.'}{' '}
                          We will mark it done when it is ready for pickup.
                        </p>
                      </div>
                    </section>
                  )}

                  {status === 'COMPLETED' && (
                    <section className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <span className="material-icons text-2xl text-emerald-600">
                        check_circle
                      </span>
                      <div>
                        <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                          Ready for pickup
                        </p>
                        <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-100/80">
                          Your wash is complete. Please collect your vehicle at the bay.
                        </p>
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Details */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <DetailRow
                  label="Name"
                  value={order.customer?.name || '—'}
                  sub={order.customer?.phone || order.customer?.email}
                />
                <DetailRow
                  label="Vehicle"
                  value={vehicleTitle}
                  sub={order.vehicle?.plateNumber}
                />
                <DetailRow
                  label="Crew"
                  value={
                    staffReady
                      ? order.staff?.name || `Staff #${order.staffId}`
                      : 'Waiting for assignment'
                  }
                  last
                />
              </section>

              {/* Services — no heavy ==== lines */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h2 className="text-sm font-semibold">Services</h2>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(order.order_items || []).length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-slate-500">
                      No services listed.
                    </li>
                  ) : (
                    (order.order_items || []).map((item, i) => (
                      <li
                        key={item.id ?? i}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {(item as { service?: { name?: string } }).service?.name ||
                              'Service'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.duration || 0} min · ×{item.qty || 1}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatRp(Number(item.subtotal || 0))}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Total
                  </span>
                  <span className="text-lg font-bold text-teal-600 dark:text-teal-400">
                    {formatRp(total)}
                  </span>
                </div>
              </section>

              {!!order.note && (
                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{order.note}</p>
                </section>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment
                </p>
                {paid ? (
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Paid
                    {payment?.method ? ` · ${methodLabel(payment.method)}` : ''}
                    {payment?.amount != null
                      ? ` · ${formatRp(Number(payment.amount))}`
                      : ` · ${formatRp(total)}`}
                  </p>
                ) : paymentPending ? (
                  <p className="text-sm text-sky-600 dark:text-sky-300">
                    Confirming your payment — this can take a moment.
                  </p>
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Not paid yet
                  </p>
                )}
              </section>

              <div className="flex flex-col gap-2 pb-4">
                {canPay && (
                  <Link
                    to={`/orders/${id}/pay`}
                    className="btn h-12 w-full rounded-2xl border-0 bg-teal-600 text-white hover:bg-teal-500"
                  >
                    Pay now
                  </Link>
                )}
                {paymentPending && (
                  <button
                    type="button"
                    className="btn h-12 w-full rounded-2xl border-0 bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                    onClick={() => void silentReload()}
                  >
                    Check payment status
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn h-12 w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-transparent"
                >
                  <span className="material-icons text-lg">print</span>
                  Print ticket
                </button>
                <Link
                  to="/orders"
                  className="btn h-12 w-full rounded-2xl border-0 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  Back to my orders
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function DetailRow({
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
      className={`flex items-start justify-between gap-3 py-2.5 ${
        last ? '' : 'border-b border-slate-100 dark:border-slate-800'
      }`}
    >
      <span className="w-20 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <div className="min-w-0 text-right">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
        {sub != null && sub !== '' && (
          <p className="text-xs text-slate-500">{String(sub)}</p>
        )}
      </div>
    </div>
  )
}

export default ViewOrder