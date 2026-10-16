import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/axios";
import { money } from "../lib/format";

const RANGES = [7, 30, 90];

const shortDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

function StatCard({ label, value, hint, valueClass = "" }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-5">
      <p className="text-sm opacity-60">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs opacity-50">{hint}</p>}
    </div>
  );
}

function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 0);
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div>
      <div className="flex h-52 items-end gap-1 border-b border-base-300">
        {data.map((d) => {
          const height =
            max > 0 && d.revenue > 0 ? Math.max((d.revenue / max) * 100, 2) : 0;
          return (
            <div
              key={d.date}
              className="group flex h-full min-w-0 flex-1 items-end"
              title={`${shortDate(d.date)}: ${money(d.revenue)} · ${d.sales} ${
                d.sales === 1 ? "sale" : "sales"
              }`}
            >
              <div
                className="w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                style={{ height: `${height}%` }}
              ></div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <div key={d.date} className="relative h-4 min-w-0 flex-1">
            {i % labelEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] opacity-60">
                {shortDate(d.date)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-28 w-full"></div>
        ))}
      </div>
      <div className="skeleton h-72 w-full"></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-64 w-full"></div>
        <div className="skeleton h-64 w-full"></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/dashboard/summary", {
          params: { days },
          signal: controller.signal,
        });
        setData(res.data);
        setLoading(false);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load the dashboard");
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [days, reloadKey]);

  if (error) {
    return (
      <div className="rounded-box border border-base-300 bg-base-100 p-10 text-center">
        <p className="text-error">{error}</p>
        <button
          className="btn btn-outline btn-sm mt-4"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  const { totals, topProducts, salesChart, recentSales } = data;

  const maxUnits = Math.max(...topProducts.map((p) => p.unitsSold), 1);
  const peak = Math.max(...salesChart.map((d) => d.revenue), 0);

  const alertItems = [
    ...data.outOfStockProducts.map((p) => ({ ...p, out: true })),
    ...data.lowStockProducts.map((p) => ({ ...p, out: false })),
  ];
  const alertTotal = totals.lowStockCount + totals.outOfStockCount;

  return (
    <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
      {/* Range switch */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm opacity-60">Last {data.rangeDays} days</h2>
        <div className="join">
          {RANGES.map((r) => (
            <button
              key={r}
              className={`btn btn-sm join-item ${days === r ? "btn-active" : ""}`}
              onClick={() => setDays(r)}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Revenue"
          value={money(totals.revenue)}
          hint="Paid sales only"
        />
        <StatCard
          label="Profit"
          value={money(totals.profit)}
          valueClass={totals.profit >= 0 ? "text-success" : "text-error"}
          hint="Revenue minus cost of goods"
        />
        <StatCard
          label="Sales"
          value={totals.salesCount}
          hint="Paid and unpaid"
        />
        <StatCard
          label="Outstanding"
          value={money(totals.outstanding)}
          valueClass={totals.outstanding > 0 ? "text-warning" : ""}
          hint="Unpaid sales"
        />
        <StatCard label="Products" value={totals.products} hint="Active products" />
        <StatCard
          label="Stock alerts"
          value={alertTotal}
          valueClass={totals.outOfStockCount > 0 ? "text-error" : ""}
          hint={`${totals.outOfStockCount} out of stock`}
        />
      </div>

      {/* Chart */}
      <div className="rounded-box border border-base-300 bg-base-100 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Revenue per day</h2>
          {peak > 0 && (
            <span className="text-xs opacity-60">Peak day: {money(peak)}</span>
          )}
        </div>

        {totals.salesCount === 0 ? (
          <p className="py-16 text-center text-sm opacity-60">
            No sales in this period.
          </p>
        ) : (
          <RevenueChart data={salesChart} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <h2 className="font-semibold">Top products</h2>

          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-sm opacity-60">
              No sales in this period.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {topProducts.map((p) => (
                <li key={p.productId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">
                      {p.name}{" "}
                      <span className="font-mono text-xs opacity-50">{p.sku}</span>
                    </span>
                    <span className="whitespace-nowrap opacity-70">
                      {p.unitsSold} sold · {money(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-base-200">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(p.unitsSold / maxUnits) * 100}%` }}
                    ></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stock alerts */}
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Stock alerts</h2>
            <Link to="/inventory" className="btn btn-ghost btn-xs">
              Manage stock
            </Link>
          </div>

          {alertItems.length === 0 ? (
            <p className="py-10 text-center text-sm opacity-60">
              All products are well stocked.
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-3">
                {alertItems.slice(0, 8).map((p) => (
                  <li
                    key={p._id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate">
                      {p.name}{" "}
                      <span className="font-mono text-xs opacity-50">{p.sku}</span>
                    </span>
                    {p.out ? (
                      <span className="badge badge-error badge-soft">
                        Out of stock
                      </span>
                    ) : (
                      <span className="badge badge-warning badge-soft">
                        {p.stock} left
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {alertTotal > 8 && (
                <p className="mt-3 text-xs opacity-60">
                  + {alertTotal - 8} more on the Inventory page
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent sales */}
      <div className="rounded-box border border-base-300 bg-base-100">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-semibold">Recent sales</h2>
          <Link to="/sales" className="btn btn-ghost btn-xs">
            View all
          </Link>
        </div>

        {recentSales.length === 0 ? (
          <p className="px-5 pb-10 pt-4 text-center text-sm opacity-60">
            No sales yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>By</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => (
                  <tr key={s._id}>
                    <td className="font-mono text-xs">{s.receiptNumber}</td>
                    <td>{s.customerName}</td>
                    <td className="font-semibold">{money(s.total)}</td>
                    <td>
                      <span
                        className={`badge badge-soft ${
                          s.paymentStatus === "paid"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {s.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td className="opacity-70">{s.createdBy?.name || "-"}</td>
                    <td className="whitespace-nowrap text-sm opacity-70">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}