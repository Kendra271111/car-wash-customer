// src/components/pages/orders/orderPayment.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import axios from 'axios'
import useOrders, { type Order } from '../../../hooks/useOrder'
import usePayment from '../../../hooks/usePayment'
import { loadSnap } from '../../../libs/midtrans'
import { api } from '../../../api/api'

const METHODS = ['CASH', 'QRIS', 'E-MONEY', 'TRANSFER'] as const

type SnapWindow = Window & {
  snap?: {
    pay: (
      token: string,
      callbacks: {
        onSuccess?: () => void
        onPending?: () => void
        onError?: () => void
        onClose?: () => void
      }
    ) => void
  }
}

const formatRp = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(value || 0))

const OrderPayment = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('QRIS')
  const [amountReceived, setAmountReceived] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    ;(async () => {
      setError(null)
      setSuccess(false)
      setAmountReceived('')
      setNotes('')
      setPaymentMethod('QRIS')
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
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const total =
    order?.order_items?.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0
    ) || 0

  const receivedNum =
    paymentMethod === 'CASH'
      ? Number(amountReceived || 0)
      : Number(amountReceived || total)

  const change = receivedNum - total

  const payWithMidtrans = async () => {
    if (!id) return
    setError(null)
    setSubmitting(true)
    try {
      await loadSnap()
      const { data } = await api.post('/payments/midtrans/snap', {
        orderId: Number(id),
      })
      const token = data?.data?.token || data?.token
      if (!token) throw new Error('No snap token')

      const snap = (window as SnapWindow).snap
      if (!snap) throw new Error('Snap.js not loaded')

      snap.pay(token, {
        onSuccess: () => {
          setSuccess(true)
          setSubmitting(false)
          navigate(`/orders/${id}`, { replace: true })
        },
        onPending: () => {
          setError('Payment pending. Finish it in the Midtrans window.')
          setSubmitting(false)
        },
        onError: () => {
          setError('Payment failed.')
          setSubmitting(false)
        },
        onClose: () => {
          setSubmitting(false)
        },
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to start payment.')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to start payment.')
      }
      setSubmitting(false)
    }
  }

  const payWithCash = async () => {
    if (!id) return
    setError(null)

    const paid = Number(amountReceived || 0)
    if (!amountReceived || paid < total) {
      setError('Amount received must be at least the total.')
      return
    }

    setSubmitting(true)
    try {
      await usePayment.createPayment({
        orderId: Number(id),
        amount: total,
        change: change > 0 ? change : 0,
        method: 'CASH',
        status: 'PAID',
        notes: notes || undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate(`/orders/${id}`, { replace: true }), 800)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to process payment.')
      } else {
        setError('Failed to process payment.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (paymentMethod === 'CASH') {
      await payWithCash()
    } else {
      await payWithMidtrans()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:px-6">
          <Link
            to={`/orders/${id}`}
            className="btn btn-ghost btn-sm btn-circle text-slate-300 hover:bg-slate-800"
          >
            <span className="material-icons">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">Payment</h1>
            <p className="text-xs text-slate-500">Order #{id}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {loading && (
          <div className="flex flex-col items-center py-16">
            <span className="loading loading-spinner loading-lg text-teal-400" />
            <p className="mt-3 text-sm text-slate-500">Loading order...</p>
          </div>
        )}

        {!loading && error && !order && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <span className="material-icons text-4xl text-red-400">error_outline</span>
            <p className="mt-3 text-red-300">{error}</p>
            <Link to="/orders" className="btn btn-sm mt-4 rounded-xl bg-slate-800">
              Back
            </Link>
          </div>
        )}

        {!loading && order && (
          <>
            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 p-3 text-sm text-emerald-300">
                <span className="material-icons">check_circle</span>
                Payment successful!
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/20 p-3 text-sm text-red-300">
                <span className="material-icons">error_outline</span>
                {error}
              </div>
            )}

            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold">Order details</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Customer</span>
                  <span className="text-right">
                    {order.customer?.name || `Customer #${order.customerId}`}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Vehicle</span>
                  <span className="text-right">
                    {order.vehicle
                      ? `${order.vehicle.brand || ''} ${order.vehicle.model || ''}`.trim() ||
                        order.vehicle.plateNumber
                      : `Vehicle #${order.vehicleId}`}
                  </span>
                </div>
              </div>
            </section>

            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold">Services</h2>
              {(order.order_items || []).map((item, i) => (
                <div
                  key={item.id ?? i}
                  className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 last:mb-0 last:border-0"
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
                  <p className="text-sm font-medium">
                    {formatRp(Number(item.subtotal || 0))}
                  </p>
                </div>
              ))}
            </section>

            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span>{formatRp(total)}</span>
              </div>
              <div className="mb-4 flex justify-between border-t border-slate-800 pt-2">
                <span className="text-base font-bold">TOTAL</span>
                <span className="text-base font-bold text-teal-400">
                  {formatRp(total)}
                </span>
              </div>

              <p className="mb-2 text-sm text-slate-400">Payment method</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {METHODS.map((method) => {
                  const active = paymentMethod === method
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method)
                        if (method !== 'CASH') setAmountReceived(String(total))
                      }}
                      className={`rounded-xl px-3 py-2 text-sm font-medium ${
                        active
                          ? 'bg-teal-600 text-white'
                          : 'border border-slate-700 bg-slate-950 text-slate-300'
                      }`}
                    >
                      {method}
                    </button>
                  )
                })}
              </div>

              {paymentMethod === 'CASH' && (
                <>
                  <p className="mb-1.5 text-sm text-slate-400">Amount received</p>
                  <input
                    type="number"
                    min={0}
                    step="1000"
                    className="input input-bordered mb-3 w-full rounded-xl border-slate-700 bg-slate-950"
                    placeholder="0"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                  />
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-slate-400">Change</span>
                    <span
                      className={`text-lg font-bold ${
                        change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatRp(change >= 0 ? change : 0)}
                    </span>
                  </div>
                </>
              )}

              {paymentMethod !== 'CASH' && (
                <div className="mb-4 rounded-xl border border-dashed border-teal-600/40 bg-teal-500/10 p-4 text-center text-sm text-teal-100">
                  <span className="material-icons mb-1 text-3xl text-teal-400">
                    {paymentMethod === 'QRIS' ? 'qr_code_2' : 'account_balance'}
                  </span>
                  <p>
                    You will complete payment securely via Midtrans (
                    {paymentMethod}).
                  </p>
                  <p className="mt-1 font-semibold text-white">{formatRp(total)}</p>
                </div>
              )}

              <p className="mb-1.5 text-sm text-slate-400">Notes (optional)</p>
              <textarea
                className="textarea textarea-bordered w-full rounded-xl border-slate-700 bg-slate-950"
                placeholder="Add payment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </section>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || success}
              className="btn mb-2 w-full rounded-xl border-0 bg-indigo-500 text-white hover:bg-indigo-600"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : paymentMethod === 'CASH' ? (
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
          </>
        )}
      </main>
    </div>
  )
}

export default OrderPayment