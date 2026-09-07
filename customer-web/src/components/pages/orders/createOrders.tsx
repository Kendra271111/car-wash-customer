// src/components/pages/orders/createOrders.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import axios from "axios";
import useAuth from "../../../hooks/useAuth";
import useOrders from "../../../hooks/useOrder";
import useVehicle, { type Vehicle } from "../../../hooks/useVehicles";
import { api } from "../../../api/api";
import ThemeToggle from "../../ui/themeToggle";

type Service = {
  id: number;
  name: string;
  price?: number;
  duration?: number;
};

type CartItem = {
  key: string;
  serviceId?: number;
  name?: string;
  duration: number;
  price: number;
  qty: number;
  subtotal: number;
};

const formatRp = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);

const CreateOrders = () => {
  const navigate = useNavigate();
  const user = useAuth.getUser() as {
    id?: number | string;
    name?: string;
  } | null;
  const rawId = user?.id;
  const customerId = rawId != null && rawId !== "" ? Number(rawId) : NaN;
  const hasCustomer = Number.isFinite(customerId) && customerId > 0;

  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [serviceRow, setServiceRow] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [booting, setBooting] = useState(() => hasCustomer);
  const [error, setError] = useState<string | null>(() =>
    hasCustomer ? null : "You must be logged in as a customer.",
  );

  useEffect(() => {
    if (!hasCustomer) return;

    let cancelled = false;
    (async () => {
      try {
        const [vList, sRes] = await Promise.all([
          useVehicle.fetchVehiclesByCustomer(customerId),
          api.get("/services"),
        ]);
        if (cancelled) return;
        setVehicles(Array.isArray(vList) ? vList : []);
        const raw = sRes.data?.data ?? sRes.data ?? [];
        setServices(Array.isArray(raw) ? raw : []);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.message || "Failed to load data."
            : "Failed to load data.",
        );
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasCustomer, customerId]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const vehicleOptions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!vehicleOpen || !s) return vehicles;
    return vehicles.filter((v) =>
      [v.name, v.plateNumber, v.brand, v.model]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s)),
    );
  }, [vehicles, q, vehicleOpen]);

  const serviceOptions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (serviceRow == null || !s) return services;
    return services.filter((x) =>
      String(x.name || "")
        .toLowerCase()
        .includes(s),
    );
  }, [services, q, serviceRow]);

  const closeMenus = () => {
    setVehicleOpen(false);
    setServiceRow(null);
    setQ("");
  };

  const addEmptyService = () => {
    setCart((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        duration: 0,
        price: 0,
        qty: 1,
        subtotal: 0,
      },
    ]);
  };

  const chooseService = (row: number, svc: Service) => {
    const price = Number(svc.price || 0);
    setCart((prev) =>
      prev.map((item, i) =>
        i === row
          ? {
              ...item,
              serviceId: svc.id,
              name: svc.name,
              duration: Number(svc.duration || 0),
              price,
              qty: 1,
              subtotal: price,
            }
          : item,
      ),
    );
    closeMenus();
  };

  const removeRow = (row: number) => {
    setCart((prev) => prev.filter((_, i) => i !== row));
  };

  const filled = cart.filter((c) => c.serviceId != null);
  const totals = {
    qty: filled.reduce((s, c) => s + c.qty, 0),
    mins: filled.reduce((s, c) => s + c.duration * c.qty, 0),
    amount: filled.reduce((s, c) => s + c.subtotal, 0),
  };

  const submit = async () => {
    setError(null);
    if (!hasCustomer) {
      setError("You must be logged in.");
      return;
    }
    if (vehicleId == null) {
      setError("Select your vehicle.");
      return;
    }
    if (filled.length === 0) {
      setError("Add at least one service.");
      return;
    }

    setSaving(true);
    try {
      await useOrders.createOrder({
        vehicleId,
        customerId,
        staffId: null,
        status: "PENDING",
        note: note.trim() || undefined,
        items: filled.map((c) => ({
          serviceId: Number(c.serviceId),
          duration: c.duration,
          price: c.price,
          qty: c.qty,
          subtotal: c.subtotal,
          amount: c.subtotal,
        })),
      });
      navigate("/orders", { replace: true });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message || "Failed to create order."
          : "Failed to create order.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <span className="loading loading-spinner loading-lg text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <Link
              to="/orders"
              className="btn btn-ghost btn-sm btn-circle text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span className="material-icons">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold">Book a wash</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose vehicle & services</p>
            </div>
          </div>
          <ThemeToggle className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {error && (
          <div className="flex gap-2 rounded-xl bg-red-500/15 p-3 text-sm text-red-700 dark:text-red-300">
            <span className="material-icons">error_outline</span>
            {error}
          </div>
        )}

        {/* Customer (read-only) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">Booking as</p>
          <p className="font-medium text-slate-900 dark:text-white">
            {user?.name || (hasCustomer ? `Customer #${customerId}` : "—")}
          </p>
        </section>

        {/* Vehicle */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Your vehicle</p>

          {vehicles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No vehicles on your account.
              </p>
              <Link
                to="/vehicles/create"
                className="btn btn-sm mt-3 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
              >
                Add vehicle
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left shadow-xs transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
                onClick={() => {
                  setServiceRow(null);
                  setQ("");
                  setVehicleOpen((o) => !o);
                }}
              >
                <span
                  className={selectedVehicle ? "font-medium text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}
                >
                  {selectedVehicle
                    ? `${selectedVehicle.plateNumber || ""} · ${
                        selectedVehicle.name ||
                        [selectedVehicle.brand, selectedVehicle.model]
                          .filter(Boolean)
                          .join(" ")
                      }`
                    : "Select vehicle"}
                </span>
                <span className="material-icons text-slate-400 dark:text-slate-500">
                  {vehicleOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {vehicleOpen && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
                    <span className="material-icons text-slate-400 dark:text-slate-500">
                      search
                    </span>
                    <input
                      className="input input-ghost h-10 w-full border-0 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
                      placeholder="Search plate or name…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {vehicleOptions.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                        onClick={() => {
                          setVehicleId(v.id);
                          closeMenus();
                        }}
                      >
                        <span className="font-medium text-slate-900 dark:text-white">{v.plateNumber}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {" "}
                          ·{" "}
                          {v.name ||
                            [v.brand, v.model].filter(Boolean).join(" ")}
                        </span>
                      </button>
                    ))}
                    {vehicleOptions.length === 0 && (
                      <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        No match
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Services */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Services</p>
            <button
              type="button"
              className="btn btn-sm rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
              onClick={addEmptyService}
            >
              <span className="material-icons text-base">add</span>
              Add service
            </button>
          </div>

          {cart.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Tap “Add service”, then pick Basic Wash, Wax, etc.
            </p>
          )}

          <div className="space-y-2">
            {cart.map((item, index) => (
              <div
                key={item.key}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
              >
                {!item.serviceId ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-500 shadow-xs hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-600"
                      onClick={() => {
                        setVehicleOpen(false);
                        setQ("");
                        setServiceRow((r) => (r === index ? null : index));
                      }}
                    >
                      Choose a service…
                      <span className="material-icons text-slate-400 dark:text-slate-500">
                        expand_more
                      </span>
                    </button>
                    {serviceRow === index && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
                          <span className="material-icons text-slate-400 dark:text-slate-500">
                            search
                          </span>
                          <input
                            className="input input-ghost h-10 w-full border-0 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
                            placeholder="Search services…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {serviceOptions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                              onClick={() => chooseService(index, s)}
                            >
                              <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                              <span className="text-slate-500 dark:text-slate-400">
                                {" "}
                                · {formatRp(Number(s.price || 0))}
                                {s.duration ? ` · ${s.duration} min` : ""}
                              </span>
                            </button>
                          ))}
                          {serviceOptions.length === 0 && (
                            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                              No match
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.duration} min · {formatRp(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-teal-600 dark:text-teal-400">
                        {formatRp(item.subtotal)}
                      </p>
                      <button type="button" onClick={() => removeRow(index)}>
                        <span className="material-icons text-red-500 hover:text-red-600 dark:text-red-400">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Note (optional)
          </label>
          <textarea
            className="textarea textarea-bordered mt-1 w-full rounded-xl border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything the crew should know…"
          />

          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-center dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Items</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{totals.qty}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{totals.mins} min</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
              <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {formatRp(totals.amount)}
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-3 pb-6">
          <Link
            to="/orders"
            className="btn flex-1 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="btn flex-1 rounded-xl border-0 bg-teal-600 text-white hover:bg-teal-500"
            disabled={saving || !hasCustomer}
            onClick={() => void submit()}
          >
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Create order"
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default CreateOrders;
