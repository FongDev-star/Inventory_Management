import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/axios";
import { money } from "../../lib/format";
import { useCartStore } from "../../store/useCartStore";

function QtyInput({ value, max, onChange }) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const n = parseInt(text, 10);
    if (isNaN(n)) {
      setText(String(value));
      return;
    }
    if (n > max) toast.error(`Only ${max} in stock`);
    onChange(n);
    setText(String(Math.min(Math.max(n, 1), max)));
  };

  return (
    <input
      type="number"
      className="input input-sm w-16 text-center"
      min="1"
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export default function NewSale({ onSaleCreated }) {
  const { items, addItem, setQuantity, removeItem, clear } = useCartStore();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { limit: 24, sortBy: "name", order: "asc" };
        if (search) params.search = search;

        const res = await api.get("/products", {
          params,
          signal: controller.signal,
        });
        setProducts(res.data.products);
        setLoading(false);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load products");
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [search, reloadKey]);

  const handleAdd = (product) => {
    const inCart = items.find((i) => i.productId === product._id)?.quantity || 0;
    if (inCart >= product.stock) {
      toast.error("No more stock available");
      return;
    }
    addItem(product);
  };

  const units = items.reduce((sum, i) => sum + i.quantity, 0);
  const total =
    Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      const res = await api.post("/sales", {
        customerName: customerName.trim(),
        paymentMethod,
        paymentStatus,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      toast.success("Sale completed");
      clear();
      setCustomerName("");
      setPaymentMethod("cash");
      setPaymentStatus("paid");
      setReloadKey((k) => k + 1);
      onSaleCreated(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
      setReloadKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Product picker */}
      <div className="space-y-4 lg:col-span-3">
        <input
          type="text"
          className="input w-full"
          placeholder="Search products by name or SKU"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        {error ? (
          <div className="rounded-box border border-base-300 bg-base-100 p-10 text-center">
            <p className="text-error">{error}</p>
            <button
              className="btn btn-outline btn-sm mt-4"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Try again
            </button>
          </div>
        ) : loading && products.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-20 w-full"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-box border border-base-300 bg-base-100 p-10 text-center text-sm opacity-60">
            {search ? `No products match "${search}"` : "No products available"}
          </div>
        ) : (
          <div
            className={`grid gap-3 sm:grid-cols-2 transition-opacity ${
              loading ? "opacity-60" : ""
            }`}
          >
            {products.map((p) => (
              <button
                key={p._id}
                type="button"
                disabled={p.stock === 0}
                onClick={() => handleAdd(p)}
                className="rounded-box border border-base-300 bg-base-100 p-4 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="font-semibold">{money(p.price)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-mono opacity-60">{p.sku}</span>
                  {p.stock === 0 ? (
                    <span className="badge badge-error badge-soft badge-sm">
                      Out of stock
                    </span>
                  ) : (
                    <span className="opacity-60">{p.stock} in stock</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="lg:col-span-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-5 lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cart</h2>
            {items.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={clear}
                disabled={submitting}
              >
                Clear
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">
              The cart is empty. Select products to add them.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {items.map((i) => (
                <li key={i.productId} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.name}</p>
                    <p className="text-xs opacity-60">{money(i.price)} each</p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-xs btn-square"
                        disabled={i.quantity <= 1}
                        onClick={() => setQuantity(i.productId, i.quantity - 1)}
                      >
                        -
                      </button>
                      <QtyInput
                        value={i.quantity}
                        max={i.stock}
                        onChange={(n) => setQuantity(i.productId, n)}
                      />
                      <button
                        type="button"
                        className="btn btn-xs btn-square"
                        disabled={i.quantity >= i.stock}
                        onClick={() => setQuantity(i.productId, i.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {money(i.price * i.quantity)}
                    </p>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs mt-1 text-error"
                      onClick={() => removeItem(i.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="divider my-4"></div>

          <div className="space-y-3">
            <input
              type="text"
              className="input w-full"
              placeholder="Customer name (optional)"
              maxLength={80}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                className="select w-full"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank transfer</option>
                <option value="other">Other</option>
              </select>

              <select
                className="select w-full"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm opacity-70">
              Total ({units} {units === 1 ? "item" : "items"})
            </span>
            <span className="text-2xl font-semibold">{money(total)}</span>
          </div>

          <button
            className="btn btn-primary mt-4 w-full"
            onClick={handleCheckout}
            disabled={items.length === 0 || submitting}
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "Complete sale"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}