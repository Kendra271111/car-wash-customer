// src/components/pages/orders/orderPayment.tsx
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import axios from 'axios'
import useOrders, { type Order } from '../../../hooks/useOrder'
import usePayment from '../../../hooks/usePayment'
import { loadSnap } from '../../../libs/midtrans'
import { api } from '../../../api/api'

const METHODS = [
  { id: 'QRIS', label: 'QRIS', icon: 'qr_code_2', hint: 'Scan & pay' },
  { id: 'E-MONEY', label: 'E-Money', icon: 'account_balance_wallet', hint: 'Digital wallet' },
  { id: 'TRANSFER', label: 'Transfer', icon: 'account_balance', hint: 'Bank transfer' },
  { id: 'CASH', label: 'Cash', icon: 'payments', hint: 'Pay at counter' },
] as const

type MethodId = (typeof METHODS)[number]['id']
type PaymentRow = { id?: number; status?: string; method?: string }

type SnapWindow = Window & {
  snap?: {
    pay: (
      token: string,
      cb: {
        onSuccess?: () => void
        onPending?: () => void
        onError?: () => void
        onClose?: () => void
      }
    ) => void
  }
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n || 0)

const paymentsOf = (order: Order | null): PaymentRow[] => {
  if (!order) return []
  const o = order as Order & { payments?: PaymentRow[]; payements?: PaymentRow[] }
  return o.payments ?? o.payements ?? []
}

const orderIsPaid = (order: Order | null) =>
  paymentsOf(order).some((p) => String(p.status).toUpperCase() === 'PAID')

async function pollUntil(
  check: () => Promise<boolean>,
  attempts = 12,
  delayMs = 1500
) {
  for (let i = 0; i < attempts; i++) {
    if (await check()) return true
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

const OrderPayment = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [method, setMethod] = useState<MethodId>('QRIS')
  const [received, setReceived] = useState('')
  const [notes, setNotes] = useState('')

  const total =
    order?.order_items?.reduce((s, i) => s + Number(i.subtotal || 0), 0) ?? 0
  const change = Number(received || 0) - total
  const paid = orderIsPaid(order)

  const vehicleLabel = order?.vehicle
    ? [
        order.vehicle.plateNumber,
        order.vehicle.brand,
        order.vehicle.model,
        order.vehicle.name,
      ]
        .filter(Boolean)
        .join(' · ') || `Vehicle #${order.vehicleId}`
    : order
      ? `Vehicle #${order.vehicleId}`
      : '—'

  const refreshOrder = async () => {
    if (!id) return null
    const data = await useOrders.fetchOrderById(id)
    setOrder(data)
    return data
  }

  useEffect(() => {
    if (!id) return
    let dead = false
    ;(async () => {
      try {
        const data = await useOrders.fetchOrderById(id)
        if (!dead) setOrder(data)
      } catch (err: unknown) {
        if (dead) return
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || 'Failed to load order.'
            : 'Failed to load order.'
        )
      } finally {
        if (!dead) setLoading(false)
      }
    })()
    return () => {
      dead = true
    }
  }, [id])

  const waitForPaid = () =>
    pollUntil(async () => {
      try {
        const { data } = await api.get(`/payments/order/${id}`)
        if (String(data?.data?.status || '').toUpperCase() === 'PAID') {
          await refreshOrder()
          return true
        }
      } catch {
        /* ignore */
      }
      const latest = await refreshOrder()
      return orderIsPaid(latest)
    })

  const payCash = async () => {
    if (!id) return
    if (!received || Number(received) < total) {
      setError('Amount received must cover the total.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await usePayment.createPayment({
        orderId: Number(id),
        amount: total,
        change: Math.max(change, 0),
        method: 'CASH',
        status: 'PAID',
        notes: notes.trim() || undefined,
      })
      await refreshOrder()
      navigate(`/orders/${id}`, { replace: true })
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Payment failed.'
          : 'Payment failed.'
      )
    } finally {
      setBusy(false)
    }
  }

  const payMidtrans = async () => {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      await loadSnap()
      const { data } = await api.post('/payments/midtrans/snap', {
        orderId: Number(id),
      })
      const token = data?.data?.token || data?.token
      if (!token) throw new Error('No Snap token from server.')

      const snap = (window as SnapWindow).snap
      if (!snap) throw new Error('Midtrans Snap failed to load.')

      snap.pay(token, {
        onSuccess: () => {
          void (async () => {
            const ok = await waitForPaid()
            if (!ok) {
              setError(
                'Payment sent. If status stays unpaid, check that the Midtrans webhook URL is public.'
              )
            }
            setBusy(false)
            navigate(`/orders/${id}`, { replace: true })
          })()
        },
        onPending: () => {
          void (async () => {
            setError('Payment is pending. We will update when Midtrans confirms.')
            await waitForPaid()
            setBusy(false)
          })()
        },
        onError: () => {
          setError('Payment failed in Midtrans.')
          setBusy(false)
        },
        onClose: () => setBusy(false),
      })
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || 'Could not start Midtrans.'
          : err instanceof Error
            ? err.message
            : 'Could not start Midtrans.'
      )
      setBusy(false)
    }
  }

  const onPay = () => {
    if (paid) {
      navigate(`/orders/${id}`, { replace: true })
      return
    }
    if (method === 'CASH') void payCash()
    else void payMidtrans()
  }

  if (loading) {
    return (
      <Shell id={id}>
        <div className="flex justify-center py-24">
          <span className="loading loading-spinner loading-lg text-teal-400" />
        </div>
      </Shell>
    )
  }

  if (!order) {
    return (
      <Shell id={id}>
        <Banner tone="error">{error || 'Order not found.'}</Banner>
        <Link to="/orders" className="btn mt-4 w-full rounded-xl bg-slate-800">
          Back to orders
        </Link>
      </Shell>
    )
  }

  return (
    <Shell id={id}>
      {error && <Banner tone="error">{error}</Banner>}

      {/* Status strip */}
      <div
        className={`mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 ${
          paid
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-amber-500/30 bg-amber-500/10'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`material-icons text-xl ${
              paid ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {paid ? 'verified' : 'pending'}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {paid ? 'Paid' : 'Awaiting payment'}
            </p>
            <p className="text-xs text-slate-400">Order #{id}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-teal-400">{formatRp(total)}</p>
      </div>

      {/* Summary */}
      <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Summary
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Customer</span>
            <span className="text-right font-medium">
              {order.customer?.name || `Customer #${order.customerId}`}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-500">Vehicle</span>
            <span className="text-right font-medium">{vehicleLabel}</span>
          </div>
        </div>

        <div className="my-4 border-t border-slate-800" />

        <ul className="space-y-3">
          {(order.order_items || []).map((item, i) => (
            <li key={item.id ?? i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {(item as { service?: { name?: string } }).service?.name ||
                    `Service #${item.serviceId}`}
                </p>
                <p className="text-xs text-slate-500">
                  {item.duration || 0} min · qty {item.qty || 1}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium">
                {formatRp(Number(item.subtotal || 0))}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
          <span className="text-sm font-semibold text-slate-300">Total</span>
          <span className="text-xl font-bold text-teal-400">{formatRp(total)}</span>
        </div>
      </section>

      {/* Methods */}
      {!paid && (
        <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment method
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {METHODS.map((m) => {
              const active = method === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition ${
                    active
                      ? 'border-teal-500 bg-teal-500/15 text-teal-300'
                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="material-icons text-2xl">{m.icon}</span>
                  <span className="text-xs font-semibold">{m.label}</span>
                  <span className="text-[10px] opacity-70">{m.hint}</span>
                </button>
              )
            })}
          </div>

          {method === 'CASH' ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-slate-400">
                  Amount received
                </label>
                <input
                  type="number"
                  min={0}
                  className="input input-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                  placeholder={String(total)}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950 px-3 py-2 text-sm">
                <span className="text-slate-500">Change</span>
                <span className="font-semibold text-emerald-400">
                  {formatRp(Math.max(change, 0))}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                rows={2}
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-950/80 px-3 py-3 text-center text-xs leading-relaxed text-slate-400">
              Opens Midtrans for <span className="text-teal-300">{method}</span>.
              Paid status updates automatically via webhook — no staff approval.
            </p>
          )}
        </section>
      )}

      {paid && (
        <Banner tone="ok">This order is already paid. You can go back to the order.</Banner>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-slate-800 bg-slate-950/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          disabled={busy}
          onClick={onPay}
          className="btn mb-2 w-full rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
        >
          {busy ? (
            <span className="loading loading-spinner loading-sm" />
          ) : paid ? (
            'Back to order'
          ) : method === 'CASH' ? (
            `Mark paid · ${formatRp(total)}`
          ) : (
            `Pay ${formatRp(total)}`
          )}
        </button>
        <Link
          to={`/orders/${id}`}
          className="btn w-full rounded-xl border border-slate-700 bg-transparent text-slate-300"
        >
          Cancel
        </Link>
      </div>
    </Shell>
  )
}

function Shell({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <Link
            to={`/orders/${id}`}
            className="btn btn-ghost btn-sm btn-circle text-slate-300"
          >
            <span className="material-icons">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">Checkout</h1>
            <p className="text-xs text-slate-500">Secure payment</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5 pb-8">{children}</main>
    </div>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: 'ok' | 'error'
  children: ReactNode
}) {
  const ok = tone === 'ok'
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-xl p-3 text-sm ${
        ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
      }`}
    >
      <span className="material-icons text-lg">
        {ok ? 'check_circle' : 'error_outline'}
      </span>
      <span>{children}</span>
    </div>
  )
}

export default OrderPayment