import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/axios";

const LIMIT = 15;

const REASONS = {
  stock_in: [
    { value: "purchase", label: "Purchase" },
    { value: "initial", label: "Opening stock" },
    { value: "return", label: "Customer return" },
    { value: "other", label: "Other" },
  ],
  stock_out: [
    { value: "damaged", label: "Damaged" },
    { value: "expired", label: "Expired" },
    { value: "other", label: "Other" },
  ],
};

const REASON_LABELS = {
  purchase: "Purchase",
  initial: "Opening stock",
  return: "Customer return",
  sale: "Sale",
  damaged: "Damaged",
  expired: "Expired",
  correction: "Correction",
  other: "Other",
};

const TYPE_META = {
  stock_in: { label: "Stock in", badge: "badge-success" },
  stock_out: { label: "Stock out", badge: "badge-error" },
  adjustment: { label: "Adjustment", badge: "badge-info" },
};

const MODES = {
  stock_in: {
    title: "Stock in",
    submit: "Add stock",
    endpoint: "/inventory/stock-in",
  },
  stock_out: {
    title: "Stock out",
    submit: "Remove stock",
    endpoint: "/inventory/stock-out",
  },
  adjust: {
    title: "Adjust stock",
    submit: "Save adjustment",
    endpoint: "/inventory/adjust",
  },
};

const emptyForm = {
  productId: "",
  quantity: "",
  newStock: "",
  reason: "",
  note: "",
};

function AlertCard({ title, tone, items, loading, emptyText }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium opacity-70">{title}</h2>
        <span className={`badge badge-soft ${tone}`}>{items.length}</span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-3/4"></div>
        </div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm opacity-60">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.slice(0, 5).map((p) => (
            <li key={p._id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                {p.name}{" "}
                <span className="font-mono text-xs opacity-50">{p.sku}</span>
              </span>
              <span className="font-semibold">{p.stock}</span>
            </li>
          ))}
          {items.length > 5 && (
            <li className="text-xs opacity-60">+ {items.length - 5} more</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function InventoryPage() {
  // stock data (alerts + products for the dropdowns)
  const [alerts, setAlerts] = useState({ outOfStock: [], lowStock: [] });
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // history
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [productFilter, setProductFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // modal
  const [mode, setMode] = useState("stock_in");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef(null);

  const reload = () => setReloadKey((k) => k + 1);

  const loadStockData = useCallback(async () => {
    try {
      const [alertsRes, productsRes] = await Promise.all([
        api.get("/inventory/alerts"),
        api.get("/products", {
          params: { limit: 100, sortBy: "name", order: "asc" },
        }),
      ]);
      setAlerts(alertsRes.data);
      setProducts(productsRes.data.products);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load stock data");
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { page, limit: LIMIT };
        if (productFilter) params.product = productFilter;
        if (typeFilter) params.type = typeFilter;

        const res = await api.get("/inventory/transactions", {
          params,
          signal: controller.signal,
        });

        setTransactions(res.data.transactions);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        setLoading(false);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load history");
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [page, productFilter, typeFilter, reloadKey]);

  const openModal = (nextMode) => {
    setMode(nextMode);
    setForm({
      ...emptyForm,
      reason: nextMode === "stock_in" ? "purchase" : nextMode === "stock_out" ? "damaged" : "",
    });
    modalRef.current?.showModal();
  };

  const selectedProduct = products.find((p) => p._id === form.productId);

  const diff =
    mode === "adjust" &&
    selectedProduct &&
    form.newStock !== "" &&
    Number.isInteger(Number(form.newStock))
      ? Number(form.newStock) - selectedProduct.stock
      : null;

  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error("Select a product");
      return;
    }

    let body;

    if (mode === "adjust") {
      if (form.newStock === "") {
        toast.error("Enter the counted stock");
        return;
      }
      const newStock = Number(form.newStock);
      if (!Number.isInteger(newStock) || newStock < 0) {
        toast.error("Counted stock must be a whole number, 0 or more");
        return;
      }
      if (newStock === selectedProduct.stock) {
        toast.error("That is the same as the current stock");
        return;
      }
      if (!form.note.trim()) {
        toast.error("A note is required for adjustments");
        return;
      }
      body = {
        productId: form.productId,
        newStock,
        note: form.note.trim(),
      };
    } else {
      const quantity = Number(form.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        toast.error("Quantity must be a whole number greater than 0");
        return;
      }
      if (mode === "stock_out" && quantity > selectedProduct.stock) {
        toast.error(`Only ${selectedProduct.stock} in stock`);
        return;
      }
      body = {
        productId: form.productId,
        quantity,
        reason: form.reason,
        note: form.note.trim(),
      };
    }

    setSaving(true);
    try {
      await api.post(MODES[mode].endpoint, body);
      toast.success("Stock updated");
      modalRef.current?.close();
      loadStockData();
      setPage(1);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = productFilter || typeFilter;
  const initialLoading = loading && transactions.length === 0;
  const from = (page - 1) * LIMIT + 1;
  const to = from + transactions.length - 1;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={() => openModal("stock_in")}>
          Stock in
        </button>
        <button className="btn btn-outline" onClick={() => openModal("stock_out")}>
          Stock out
        </button>
        <button className="btn btn-outline" onClick={() => openModal("adjust")}>
          Adjust stock
        </button>
      </div>

      {/* Alerts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AlertCard
          title="Out of stock"
          tone="badge-error"
          items={alerts.outOfStock}
          loading={alertsLoading}
          emptyText="Nothing is out of stock."
        />
        <AlertCard
          title="Low stock"
          tone="badge-warning"
          items={alerts.lowStock}
          loading={alertsLoading}
          emptyText="No products are running low."
        />
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold sm:mr-auto">History</h2>

          <select
            className="select w-full sm:w-56"
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="select w-full sm:w-44"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            <option value="stock_in">Stock in</option>
            <option value="stock_out">Stock out</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>

        <div
          className={`overflow-x-auto rounded-box border border-base-300 bg-base-100 transition-opacity ${
            loading && !initialLoading ? "opacity-60" : ""
          }`}
        >
          {error ? (
            <div className="p-10 text-center">
              <p className="text-error">{error}</p>
              <button className="btn btn-outline btn-sm mt-4" onClick={reload}>
                Try again
              </button>
            </div>
          ) : initialLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="skeleton h-4 w-32"></div>
                  <div className="skeleton h-4 w-40"></div>
                  <div className="skeleton h-4 w-20"></div>
                  <div className="skeleton h-4 w-16"></div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center text-sm opacity-60">
              {hasFilters
                ? "No movements match your filters"
                : "No stock movements yet. Use Stock in to add your first stock."}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Stock</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id} className="hover:bg-base-200/50">
                    <td className="whitespace-nowrap text-sm opacity-70">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="font-medium">{t.product?.name || "-"}</div>
                      <div className="font-mono text-xs opacity-50">
                        {t.product?.sku}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-soft ${TYPE_META[t.type].badge}`}>
                        {TYPE_META[t.type].label}
                      </span>
                    </td>
                    <td
                      className={`font-semibold ${
                        t.change > 0 ? "text-success" : "text-error"
                      }`}
                    >
                      {t.change > 0 ? "+" : ""}
                      {t.change}
                    </td>
                    <td className="whitespace-nowrap opacity-70">
                      {t.stockBefore} → {t.stockAfter}
                    </td>
                    <td>{REASON_LABELS[t.reason] || t.reason}</td>
                    <td className="max-w-xs truncate opacity-70">{t.note || "-"}</td>
                    <td className="whitespace-nowrap opacity-70">
                      {t.createdBy?.name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!error && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm opacity-60">
              Showing {from}-{to} of {total}
            </p>
            {totalPages > 1 && (
              <div className="join">
                <button
                  className="btn btn-sm join-item"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button className="btn btn-sm join-item pointer-events-none">
                  Page {page} of {totalPages}
                </button>
                <button
                  className="btn btn-sm join-item"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stock modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">{MODES[mode].title}</h3>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Product
              </label>
              <select
                className="select w-full"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                <option value="">Select a product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="mt-1.5 text-sm opacity-70">
                  Current stock:{" "}
                  <span className="font-semibold">{selectedProduct.stock}</span>
                </p>
              )}
            </div>

            {mode === "adjust" ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  Counted stock
                </label>
                <input
                  type="number"
                  className="input w-full"
                  min="0"
                  step="1"
                  placeholder="Actual quantity you counted"
                  value={form.newStock}
                  onChange={(e) => setForm({ ...form, newStock: e.target.value })}
                />
                {diff !== null && (
                  <p className="mt-1.5 text-sm">
                    {diff === 0 ? (
                      <span className="opacity-70">No change</span>
                    ) : (
                      <>
                        Change:{" "}
                        <span
                          className={`font-semibold ${
                            diff > 0 ? "text-success" : "text-error"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium opacity-70">
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium opacity-70">
                    Reason
                  </label>
                  <select
                    className="select w-full"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  >
                    {REASONS[mode].map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Note {mode === "adjust" ? "" : "(optional)"}
              </label>
              <textarea
                className="textarea w-full"
                rows={2}
                maxLength={200}
                placeholder={
                  mode === "adjust" ? "e.g. Monthly stocktake" : "e.g. Supplier invoice #1042"
                }
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => modalRef.current?.close()}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  MODES[mode].submit
                )}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}