// src/components/pages/orders/orderPayment.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import axios from "axios";
import useOrders, { type Order } from "../../../hooks/useOrder";
import { loadSnap } from "../../../libs/midtrans";
import { api } from "../../../api/api";
import ThemeToggle from "../../ui/themeToggle";

const METHODS = [
  { id: "QRIS", label: "QRIS", icon: "qr_code_2", hint: "Scan QR at checkout" },
  {
    id: "TRANSFER",
    label: "Transfer",
    icon: "account_balance",
    hint: "Bank transfer",
  },
] as const;

type PaymentRow = { id?: number; status?: string; method?: string };

type SnapWindow = Window & {
  snap?: {
    pay: (
      token: string,
      cb: {
        onSuccess?: () => void;
        onPending?: () => void;
        onError?: () => void;
        onClose?: () => void;
      },
    ) => void;
  };
};

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);

const paymentsOf = (order: Order | null): PaymentRow[] => {
  if (!order) return [];
  const o = order as Order & {
    payments?: PaymentRow[];
    payements?: PaymentRow[];
  };
  return o.payments ?? o.payements ?? [];
};

const isPaid = (order: Order | null) =>
  paymentsOf(order).some((p) => String(p.status).toUpperCase() === "PAID");

async function pollUntilPaid(
  check: () => Promise<boolean>,
  attempts = 12,
  delayMs = 1500,
) {
  for (let i = 0; i < attempts; i++) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

const OrderPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<string>("QRIS");

  const total =
    order?.order_items?.reduce((s, i) => s + Number(i.subtotal || 0), 0) ?? 0;
  const paid = isPaid(order);
  const selected = METHODS.find((m) => m.id === method) ?? METHODS[0];

  const refresh = async () => {
    if (!id) return null;
    const data = await useOrders.fetchOrderById(id);
    setOrder(data);
    return data;
  };

  useEffect(() => {
    if (!id) return;
    let dead = false;
    (async () => {
      try {
        const data = await useOrders.fetchOrderById(id);
        if (!dead) setOrder(data);
      } catch (err: unknown) {
        if (dead) return;
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || "Failed to load order."
            : "Failed to load order.",
        );
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [id]);

  const confirmPaid = () =>
    pollUntilPaid(async () => {
      try {
        const { data } = await api.get(`/payments/order/${id}`);
        if (String(data?.data?.status || "").toUpperCase() === "PAID") {
          await refresh();
          return true;
        }
      } catch {
        /* ignore */
      }
      return isPaid(await refresh());
    });

  const payMidtrans = async () => {
    if (!id || paid) return;
    setBusy(true);
    setError(null);
    try {
      await loadSnap();
      const { data } = await api.post("/payments/midtrans/snap", {
        orderId: Number(id),
      });
      const token = data?.data?.token || data?.token;
      if (!token) throw new Error("No Snap token from server");

      const snap = (window as SnapWindow).snap;
      if (!snap) throw new Error("Midtrans Snap failed to load");

      snap.pay(token, {
        onSuccess: () => {
          void (async () => {
            const ok = await confirmPaid();
            setBusy(false);
            navigate(`/orders/${id}`, { replace: true });
            if (!ok) {
              // optional: toast only; do not stay on payment page
            }
          })();
        },
        onPending: () => {
          void (async () => {
            await confirmPaid();
            setBusy(false);
            navigate(`/orders/${id}`, { replace: true });
          })();
        },
        onError: () => {
          setError("Payment failed. Try again.");
          setBusy(false);
        },
        onClose: () => setBusy(false),
      });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || "Could not open payment."
          : err instanceof Error
            ? err.message
            : "Could not open payment.",
      );
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Page id={id}>
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-teal-400" />
        </div>
      </Page>
    );
  }

  if (!order) {
    return (
      <Page id={id}>
        <Banner tone="error">{error || "Order not found."}</Banner>
        <Link to="/orders" className="btn mt-4 w-full rounded-xl bg-slate-800">
          Back to orders
        </Link>
      </Page>
    );
  }

  const vehicleLabel = order.vehicle
    ? [order.vehicle.brand, order.vehicle.model].filter(Boolean).join(" ") ||
      order.vehicle.name ||
      order.vehicle.plateNumber ||
      "—"
    : `Vehicle #${order.vehicleId}`;

  return (
    <Page id={id}>
      {paid && (
        <Banner tone="ok">
          This order is already paid.
          <Link to={`/orders/${id}`} className="ml-1 font-semibold underline">
            View order
          </Link>
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      {/* Summary hero */}
      <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Order #{order.id}</p>
            <p className="font-semibold text-slate-900 dark:text-white">
              {order.customer?.name || `Customer #${order.customerId}`}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {vehicleLabel}
              {order.vehicle?.plateNumber
                ? ` · ${order.vehicle.plateNumber}`
                : ""}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
              paid
                ? "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            }`}
          >
            {paid ? "PAID" : "UNPAID"}
          </span>
        </div>

        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Services
          </p>
          {(order.order_items || []).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No services</p>
          ) : (
            (order.order_items || []).map((item, i) => (
              <div
                key={item.id ?? i}
                className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 last:border-0 dark:border-slate-800/80"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {(item as { service?: { name?: string } }).service?.name ||
                      `Service #${item.serviceId}`}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.duration || 0} min · qty {item.qty || 1}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatRp(Number(item.subtotal || 0))}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Total due
          </span>
          <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {formatRp(total)}
          </span>
        </div>
      </section>

      {!paid && (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Payment method
          </p>
          <div className="grid grid-cols-2 gap-2 w-full">
            {METHODS.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition ${
                    active
                      ? "border-teal-500/60 bg-teal-500/15 text-teal-700 dark:text-teal-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="material-icons text-2xl">{m.icon}</span>
                  <span className="text-xs font-semibold">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/80">
            <span className="material-icons text-teal-600 dark:text-teal-400">info</span>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Pay with <strong className="text-slate-900 dark:text-white">{selected.label}</strong>.
              A secure payment window will open. After you finish, we will bring
              you back to your order. Confirmation can take a few seconds.
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-2 pb-6">
        {paid ? (
          <Link
            to={`/orders/${id}`}
            className="btn w-full rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
          >
            Back to order
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void payMidtrans()}
            className="btn w-full rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
          >
            {busy ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Opening payment…
              </>
            ) : (
              <>
                Pay {formatRp(total)}
                <span className="opacity-80">· {selected.label}</span>
              </>
            )}
          </button>
        )}
        <Link
          to={`/orders/${id}`}
          className="btn w-full rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </Link>
      </div>
    </Page>
  );
};

function Page({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Link
              to={`/orders/${id}`}
              className="btn btn-ghost btn-sm btn-circle text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold leading-tight">Checkout</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Order #{id}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "ok" | "error";
  children: React.ReactNode;
}) {
  const ok = tone === "ok";
  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
        ok ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
      }`}
    >
      <span className="material-icons text-lg">
        {ok ? "check_circle" : "error_outline"}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export default OrderPayment;
