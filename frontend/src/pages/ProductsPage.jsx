import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const LIMIT = 10;
const money = (n) => "$" + Number(n || 0).toFixed(2);

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  price: "",
  cost: "",
  lowStockThreshold: "10",
};

function StockBadge({ product }) {
  if (product.stock === 0) {
    return <span className="badge badge-error badge-soft">Out of stock</span>;
  }
  if (product.stock <= product.lowStockThreshold) {
    return (
      <span className="badge badge-warning badge-soft">{product.stock} · Low</span>
    );
  }
  return <span className="badge badge-success badge-soft">{product.stock}</span>;
}

function SortHeader({ label, field, sortBy, order, onSort, className = "" }) {
  const active = sortBy === field;
  return (
    <th className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold"
        onClick={() => onSort(field)}
      >
        {label}
        <span className={active ? "" : "opacity-30"}>
          {active ? (order === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export default function ProductsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [categories, setCategories] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const formModal = useRef(null);
  const deleteModal = useRef(null);

  const reload = () => setReloadKey((k) => k + 1);

  // categories for the filter and the form dropdown
  useEffect(() => {
    api
      .get("/categories")
      .then((res) => setCategories(res.data))
      .catch(() => toast.error("Could not load categories"));
  }, []);

  // wait 400ms after typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // load products whenever a filter, sort, or page changes
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { page, limit: LIMIT, sortBy, order };
        if (search) params.search = search;
        if (categoryFilter) params.category = categoryFilter;
        if (lowOnly) params.lowStock = "true";

        const res = await api.get("/products", {
          params,
          signal: controller.signal,
        });

        // deleted the last item on this page: go back one page
        if (res.data.products.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }

        setProducts(res.data.products);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        setLoading(false);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load products");
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [page, search, categoryFilter, lowOnly, sortBy, order, reloadKey]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setOrder("asc");
    }
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    formModal.current?.showModal();
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category?._id || "",
      price: String(product.price),
      cost: String(product.cost ?? 0),
      lowStockThreshold: String(product.lowStockThreshold ?? 10),
    });
    formModal.current?.showModal();
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const sku = form.sku.trim();

    if (!name || !sku || !form.category || form.price === "") {
      toast.error("Name, SKU, category and price are required");
      return;
    }

    const price = Number(form.price);
    const cost = form.cost === "" ? 0 : Number(form.cost);
    const threshold =
      form.lowStockThreshold === "" ? 10 : Number(form.lowStockThreshold);

    if ([price, cost, threshold].some((n) => isNaN(n) || n < 0)) {
      toast.error("Price, cost and threshold must be 0 or more");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name,
        sku,
        category: form.category,
        price,
        cost,
        lowStockThreshold: threshold,
      };

      if (editing) {
        await api.put(`/products/${editing._id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/products", body);
        toast.success("Product created");
      }
      formModal.current?.close();
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (product) => {
    setToDelete(product);
    deleteModal.current?.showModal();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/products/${toDelete._id}`);
      toast.success("Product deleted");
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete product");
    } finally {
      setDeleting(false);
      deleteModal.current?.close();
    }
  };

  const hasFilters = search || categoryFilter || lowOnly;
  const initialLoading = loading && products.length === 0;
  const from = (page - 1) * LIMIT + 1;
  const to = from + products.length - 1;
  const columns = isAdmin ? 7 : 5;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="text"
          className="input w-full lg:max-w-xs"
          placeholder="Search name or SKU"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <select
          className="select w-full lg:w-52"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={lowOnly}
            onChange={(e) => {
              setLowOnly(e.target.checked);
              setPage(1);
            }}
          />
          Low stock only
        </label>

        {isAdmin && (
          <button className="btn btn-primary lg:ml-auto" onClick={openCreate}>
            Add product
          </button>
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
            <button className="btn btn-outline btn-sm mt-4" onClick={reload}>
              Try again
            </button>
          </div>
        ) : initialLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-4 w-48"></div>
                <div className="skeleton h-4 w-24"></div>
                <div className="skeleton h-4 w-28"></div>
                <div className="skeleton h-4 w-16"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            {hasFilters ? (
              <p className="text-sm opacity-60">No products match your filters</p>
            ) : (
              <>
                <p className="font-medium">No products yet</p>
                {isAdmin && (
                  <>
                    <p className="mt-1 text-sm opacity-60">
                      Add your first product to get started.
                    </p>
                    <button
                      className="btn btn-primary btn-sm mt-4"
                      onClick={openCreate}
                    >
                      Add product
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <SortHeader
                  label="Name"
                  field="name"
                  sortBy={sortBy}
                  order={order}
                  onSort={handleSort}
                />
                <th>SKU</th>
                <th>Category</th>
                <SortHeader
                  label="Price"
                  field="price"
                  sortBy={sortBy}
                  order={order}
                  onSort={handleSort}
                />
                {isAdmin && <th>Cost</th>}
                <SortHeader
                  label="Stock"
                  field="stock"
                  sortBy={sortBy}
                  order={order}
                  onSort={handleSort}
                />
                {isAdmin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-base-200/50">
                  <td className="font-medium">{p.name}</td>
                  <td className="font-mono text-xs opacity-70">{p.sku}</td>
                  <td>{p.category?.name || "-"}</td>
                  <td>{money(p.price)}</td>
                  {isAdmin && <td className="opacity-70">{money(p.cost)}</td>}
                  <td>
                    <StockBadge product={p} />
                  </td>
                  {isAdmin && (
                    <td className="whitespace-nowrap text-right">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => askDelete(p)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
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

      {/* Add / edit modal */}
      <dialog ref={formModal} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">
            {editing ? "Edit product" : "Add product"}
          </h3>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Name
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Coca Cola 330ml"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  SKU
                </label>
                <input
                  type="text"
                  className="input w-full uppercase"
                  placeholder="CC-330"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  maxLength={40}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  Category
                </label>
                <select
                  className="select w-full"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Select</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {categories.length === 0 && (
              <p className="text-sm text-warning">
                No categories yet. Create one on the Categories page first.
              </p>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  Price
                </label>
                <input
                  type="number"
                  className="input w-full"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  Cost
                </label>
                <input
                  type="number"
                  className="input w-full"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  Low stock at
                </label>
                <input
                  type="number"
                  className="input w-full"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={(e) =>
                    setForm({ ...form, lowStockThreshold: e.target.value })
                  }
                />
              </div>
            </div>

            {!editing && (
              <p className="text-xs opacity-60">
                Stock starts at 0. Add stock from the Inventory page.
              </p>
            )}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => formModal.current?.close()}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Delete confirmation modal */}
      <dialog ref={deleteModal} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">Delete product</h3>
          <p className="mt-3 text-sm opacity-80">
            Delete <span className="font-semibold">{toDelete?.name}</span>? It
            will be removed from the product list. Its past sales and stock
            history are kept.
          </p>
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => deleteModal.current?.close()}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}