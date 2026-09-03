// src/components/pages/orders/orderPayment.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import axios from 'axios'
import useOrders, { type Order } from '../../../hooks/useOrder'
import usePayment from '../../../hooks/usePayment'
import { loadSnap } from '../../../libs/midtrans'
import { api } from '../../../api/api'

const METHODS = ['QRIS', 'E-MONEY', 'TRANSFER', 'CASH'] as const

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

const isPaid = (order: Order | null) =>
  paymentsOf(order).some((p) => String(p.status).toUpperCase() === 'PAID')

async function poll(
  check: () => Promise<boolean>,
  attempts = 12,
  delayMs = 1500
): Promise<boolean> {
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
  const [success, setSuccess] = useState(false)
  const [method, setMethod] = useState<string>('QRIS')
  const [received, setReceived] = useState('')
  const [notes, setNotes] = useState('')

  const total =
    order?.order_items?.reduce((s, i) => s + Number(i.subtotal || 0), 0) ?? 0
  const change = Number(received || 0) - total
  const paid = isPaid(order)

  const load = async () => {
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

  const confirmPaid = async () => {
    return poll(async () => {
      try {
        const { data } = await api.get(`/payments/order/${id}`)
        if (String(data?.data?.status || '').toUpperCase() === 'PAID') {
          await load()
          return true
        }
      } catch {
        /* unpaid / 404 */
      }
      const latest = await load()
      return isPaid(latest)
    })
  }

  const payCash = async () => {
    if (!id) return
    if (!received || Number(received) < total) {
      setError('Amount received must be at least the total.')
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
        notes: notes || undefined,
      })
      setSuccess(true)
      await load()
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
      if (!token) throw new Error('No Snap token')

      const snap = (window as SnapWindow).snap
      if (!snap) throw new Error('Snap.js not loaded')

      snap.pay(token, {
        onSuccess: () => {
          void (async () => {
            setSuccess(true)
            const ok = await confirmPaid()
            if (!ok) {
              setError(
                'Payment submitted. Waiting for confirmation — ensure Midtrans webhook URL is reachable.'
              )
            }
            setBusy(false)
            navigate(`/orders/${id}`, { replace: true })
          })()
        },
        onPending: () => {
          void (async () => {
            setError('Payment pending. Status updates when Midtrans confirms.')
            await confirmPaid()
            setBusy(false)
          })()
        },
        onError: () => {
          setError('Payment failed.')
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
        <div className="flex flex-col items-center py-16">
          <span className="loading loading-spinner loading-lg text-teal-400" />
        </div>
      </Shell>
    )
  }

  if (!order) {
    return (
      <Shell id={id}>
        <Alert tone="error">{error || 'Order not found.'}</Alert>
        <Link to="/orders" className="btn btn-sm mt-4 rounded-xl bg-slate-800">
          Back
        </Link>
      </Shell>
    )
  }

  return (
    <Shell id={id}>
      {paid && <Alert tone="ok">This order is paid.</Alert>}
      {success && !paid && <Alert tone="ok">Payment successful.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <Row label="Status" value={paid ? 'PAID' : 'UNPAID'} highlight={paid} />
        <Row
          label="Customer"
          value={order.customer?.name || `Customer #${order.customerId}`}
        />
        <Row
          label="Vehicle"
          value={
            order.vehicle
              ? `${order.vehicle.brand || ''} ${order.vehicle.model || ''}`.trim() ||
                order.vehicle.plateNumber ||
                '—'
              : `Vehicle #${order.vehicleId}`
          }
        />
      </Card>

      <Card title="Services">
        {(order.order_items || []).map((item, i) => (
          <div
            key={item.id ?? i}
            className="mb-2 flex justify-between border-b border-slate-800 pb-2 last:mb-0 last:border-0"
          >
            <div>
              <p className="text-sm">
                {(item as { service?: { name?: string } }).service?.name ||
                  `Service #${item.serviceId}`}
              </p>
              <p className="text-xs text-slate-500">
                {item.duration || 0} min · qty {item.qty || 1}
              </p>
            </div>
            <p className="text-sm font-medium">{formatRp(Number(item.subtotal || 0))}</p>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-slate-800 pt-3">
          <span className="font-bold">TOTAL</span>
          <span className="font-bold text-teal-400">{formatRp(total)}</span>
        </div>
      </Card>

      {!paid && (
        <Card title="Pay">
          <div className="mb-4 flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`rounded-xl px-3 py-2 text-sm font-medium ${
                  method === m
                    ? 'bg-teal-600 text-white'
                    : 'border border-slate-700 bg-slate-950 text-slate-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {method === 'CASH' ? (
            <>
              <label className="mb-1 block text-sm text-slate-400">Amount received</label>
              <input
                type="number"
                className="input input-bordered mb-3 w-full rounded-xl border-slate-700 bg-slate-950"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-slate-400">Change</span>
                <span className="font-bold text-emerald-400">
                  {formatRp(Math.max(change, 0))}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                placeholder="Notes (optional)"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-teal-600/40 bg-teal-500/10 p-4 text-center text-sm text-teal-100">
              Pay with Midtrans ({method}). Paid status is set by the server webhook — no
              admin approval.
            </p>
          )}
        </Card>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={onPay}
        className="btn mb-2 w-full rounded-xl border-0 bg-indigo-500 text-white"
      >
        {busy ? (
          <span className="loading loading-spinner loading-sm" />
        ) : paid ? (
          'View order'
        ) : method === 'CASH' ? (
          'Mark as Paid'
        ) : (
          'Pay with Midtrans'
        )}
      </button>
      <Link
        to={`/orders/${id}`}
        className="btn w-full rounded-xl border border-slate-700 bg-transparent text-slate-300"
      >
        Cancel
      </Link>
    </Shell>
  )
}

function Shell({
  id,
  children,
}: {
  id?: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link
            to={`/orders/${id}`}
            className="btn btn-ghost btn-sm btn-circle text-slate-300"
          >
            <span className="material-icons">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">Payment</h1>
            <p className="text-xs text-slate-500">Order #{id}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      {title && <h2 className="mb-3 text-sm font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="mb-2 flex justify-between gap-2 text-sm last:mb-0">
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? 'font-semibold text-emerald-400' : 'text-right'}>
        {value}
      </span>
    </div>
  )
}

function Alert({
  tone,
  children,
}: {
  tone: 'ok' | 'error'
  children: React.ReactNode
}) {
  const ok = tone === 'ok'
  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm ${
        ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
      }`}
    >
      <span className="material-icons text-base">
        {ok ? 'check_circle' : 'error_outline'}
      </span>
      {children}
    </div>
  )
}

export default OrderPayment