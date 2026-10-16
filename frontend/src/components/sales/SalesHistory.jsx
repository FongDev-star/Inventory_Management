import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../lib/axios";
import { money, PAYMENT_METHODS } from "../../lib/format";
import { useAuthStore } from "../../store/useAuthStore";

const LIMIT = 10;

const startOfDay = (d) => new Date(`${d}T00:00:00`).toISOString();
const endOfDay = (d) => new Date(`${d}T23:59:59.999`).toISOString();

export default function SalesHistory({ onView }) {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [markingId, setMarkingId] = useState(null);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (fromDate && toDate && fromDate > toDate) {
      setError("The From date must be before the To date");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { page, limit: LIMIT };
        if (statusFilter) params.paymentStatus = statusFilter;
        if (fromDate) params.from = startOfDay(fromDate);
        if (toDate) params.to = endOfDay(toDate);

        const res = await api.get("/sales", {
          params,
          signal: controller.signal,
        });

        setSales(res.data.sales);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        setLoading(false);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load sales");
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [page, statusFilter, fromDate, toDate, reloadKey]);

  const markPaid = async (sale) => {
    setMarkingId(sale._id);
    try {
      await api.patch(`/sales/${sale._id}/payment`, { paymentStatus: "paid" });
      toast.success("Marked as paid");
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update payment");
    } finally {
      setMarkingId(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasFilters = statusFilter || fromDate || toDate;
  const initialLoading = loading && sales.length === 0;
  const from = (page - 1) * LIMIT + 1;
  const to = from + sales.length - 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <select
          className="select w-full lg:w-44"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-60">From</span>
          <input
            type="date"
            className="input"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="opacity-60">To</span>
          <input
            type="date"
            className="input"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
          />
        </label>

        {hasFilters && (
          <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}

        {!isAdmin && (
          <p className="text-xs opacity-60 lg:ml-auto">Showing your own sales</p>
        )}
      </div>

      {/* Table */}
      <div
        className={`overflow-x-auto rounded-box border border-base-300 bg-base-100 transition-opacity ${
          loading && !initialLoading ? "opacity-60" : ""
        }`}
      >
        {error ? (
          <div className="p-10 text-center">
            <p className="text-error">{error}</p>
            {!error.startsWith("The From date") && (
              <button className="btn btn-outline btn-sm mt-4" onClick={reload}>
                Try again
              </button>
            )}
          </div>
        ) : initialLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-4 w-32"></div>
                <div className="skeleton h-4 w-36"></div>
                <div className="skeleton h-4 w-24"></div>
                <div className="skeleton h-4 w-16"></div>
              </div>
            ))}
          </div>
        ) : sales.length === 0 ? (
          <div className="p-10 text-center text-sm opacity-60">
            {hasFilters
              ? "No sales match your filters"
              : "No sales yet. Complete a sale on the New sale tab."}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Receipt</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                {isAdmin && <th>By</th>}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s._id} className="hover:bg-base-200/50">
                  <td className="whitespace-nowrap text-sm opacity-70">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="font-mono text-xs">{s.receiptNumber}</td>
                  <td>{s.customerName}</td>
                  <td>{s.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                  <td className="font-semibold">{money(s.total)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge badge-soft ${
                          s.paymentStatus === "paid"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {s.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </span>
                      <span className="text-xs opacity-60">
                        {PAYMENT_METHODS[s.paymentMethod]}
                      </span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap opacity-70">
                      {s.createdBy?.name || "-"}
                    </td>
                  )}
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onView(s)}
                    >
                      View
                    </button>
                    {isAdmin && s.paymentStatus === "unpaid" && (
                      <button
                        className="btn btn-ghost btn-sm text-success"
                        onClick={() => markPaid(s)}
                        disabled={markingId === s._id}
                      >
                        {markingId === s._id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Mark paid"
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
  );
}