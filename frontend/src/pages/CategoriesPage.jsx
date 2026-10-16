import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/axios";

const emptyForm = { name: "", description: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const formModal = useRef(null);
  const deleteModal = useRef(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    formModal.current?.showModal();
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description || "" });
    formModal.current?.showModal();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const body = { name, description: form.description.trim() };
      if (editing) {
        await api.put(`/categories/${editing._id}`, body);
        toast.success("Category updated");
      } else {
        await api.post("/categories", body);
        toast.success("Category created");
      }
      formModal.current?.close();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (category) => {
    setToDelete(category);
    deleteModal.current?.showModal();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/categories/${toDelete._id}`);
      toast.success("Category deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete category");
    } finally {
      setDeleting(false);
      deleteModal.current?.close();
    }
  };

  const term = search.trim().toLowerCase();
  const visible = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      (c.description || "").toLowerCase().includes(term)
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          className="input w-full sm:max-w-xs"
          placeholder="Search categories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openCreate}>
          Add category
        </button>
      </div>

      {/* Content */}
      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100">
        {loading ? (
          <div className="space-y-4 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="skeleton h-4 w-40"></div>
                <div className="skeleton h-4 w-64"></div>
                <div className="skeleton h-4 w-24"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-error">{error}</p>
            <button className="btn btn-outline btn-sm mt-4" onClick={load}>
              Try again
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">No categories yet</p>
            <p className="mt-1 text-sm opacity-60">
              Create your first category to start adding products.
            </p>
            <button className="btn btn-primary btn-sm mt-4" onClick={openCreate}>
              Add category
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm opacity-60">
            No categories match "{search}"
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c._id} className="hover:bg-base-200/50">
                  <td className="font-medium">{c.name}</td>
                  <td className="max-w-xs truncate opacity-70">
                    {c.description || "-"}
                  </td>
                  <td className="whitespace-nowrap opacity-70">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => askDelete(c)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / edit modal */}
      <dialog ref={formModal} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">
            {editing ? "Edit category" : "Add category"}
          </h3>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Name
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Drinks"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={60}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Description (optional)
              </label>
              <textarea
                className="textarea w-full"
                rows={3}
                placeholder="Short description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                maxLength={200}
              />
            </div>

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
          <h3 className="text-lg font-semibold">Delete category</h3>
          <p className="mt-3 text-sm opacity-80">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{toDelete?.name}</span>? This cannot
            be undone.
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