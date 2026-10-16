import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const LIMIT = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emptyForm = { name: "", email: "", password: "", role: "employee" };

export default function UsersPage() {
  const me = useAuthStore((s) => s.user);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // add / edit
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // reset password
  const [pwUser, setPwUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // deactivate / activate
  const [statusUser, setStatusUser] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [activatingId, setActivatingId] = useState(null);

  const formModal = useRef(null);
  const pwModal = useRef(null);
  const statusModal = useRef(null);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { page, limit: LIMIT };
        if (search) params.search = search;
        if (roleFilter) params.role = roleFilter;
        if (statusFilter) params.isActive = statusFilter;

        const res = await api.get("/users", {
          params,
          signal: controller.signal,
        });

        setUsers(res.data.users);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        setLoading(false);
      } catch (err) {
        if (err.code === "ERR_CANCELED") return;
        setError(err.response?.data?.message || "Could not load users");
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [page, search, roleFilter, statusFilter, reloadKey]);

  const isSelf = (u) => u && u.id === me.id;

  /* ---------- add / edit ---------- */

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    formModal.current?.showModal();
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    formModal.current?.showModal();
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const body = { name, email };
        if (!isSelf(editing)) body.role = form.role;
        await api.put(`/users/${editing.id}`, body);
        toast.success("User updated");
      } else {
        await api.post("/users", {
          name,
          email,
          password: form.password,
          role: form.role,
        });
        toast.success("User created");
      }
      formModal.current?.close();
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- reset password ---------- */

  const openPassword = (u) => {
    setPwUser(u);
    setNewPassword("");
    pwModal.current?.showModal();
  };

  const handlePassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPwSaving(true);
    try {
      await api.patch(`/users/${pwUser.id}/password`, { newPassword });
      toast.success("Password updated");
      pwModal.current?.close();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update password");
    } finally {
      setPwSaving(false);
    }
  };

  /* ---------- deactivate / activate ---------- */

  const askDeactivate = (u) => {
    setStatusUser(u);
    statusModal.current?.showModal();
  };

  const handleDeactivate = async () => {
    setStatusSaving(true);
    try {
      await api.put(`/users/${statusUser.id}`, { isActive: false });
      toast.success("User deactivated");
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not deactivate user");
    } finally {
      setStatusSaving(false);
      statusModal.current?.close();
    }
  };

  const activate = async (u) => {
    setActivatingId(u.id);
    try {
      await api.put(`/users/${u.id}`, { isActive: true });
      toast.success("User activated");
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not activate user");
    } finally {
      setActivatingId(null);
    }
  };

  const hasFilters = search || roleFilter || statusFilter;
  const initialLoading = loading && users.length === 0;
  const from = (page - 1) * LIMIT + 1;
  const to = from + users.length - 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          type="text"
          className="input w-full lg:max-w-xs"
          placeholder="Search name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <select
          className="select w-full lg:w-40"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="employee">Employee</option>
        </select>

        <select
          className="select w-full lg:w-40"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <button className="btn btn-primary lg:ml-auto" onClick={openCreate}>
          Add user
        </button>
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
                <div className="skeleton h-4 w-36"></div>
                <div className="skeleton h-4 w-48"></div>
                <div className="skeleton h-4 w-20"></div>
                <div className="skeleton h-4 w-16"></div>
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm opacity-60">
            {hasFilters ? "No users match your filters" : "No users found"}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-base-200/50 ${u.isActive ? "" : "opacity-60"}`}
                >
                  <td className="font-medium">
                    {u.name}
                    {isSelf(u) && (
                      <span className="badge badge-ghost badge-sm ml-2">You</span>
                    )}
                  </td>
                  <td className="opacity-70">{u.email}</td>
                  <td>
                    <span
                      className={`badge badge-soft ${
                        u.role === "admin" ? "badge-primary" : "badge-neutral"
                      }`}
                    >
                      {u.role === "admin" ? "Admin" : "Employee"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-soft ${
                        u.isActive ? "badge-success" : "badge-error"
                      }`}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap opacity-70">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openPassword(u)}
                    >
                      Reset password
                    </button>
                    {u.isActive ? (
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => askDeactivate(u)}
                        disabled={isSelf(u)}
                        title={isSelf(u) ? "You cannot deactivate yourself" : ""}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm text-success"
                        onClick={() => activate(u)}
                        disabled={activatingId === u.id}
                      >
                        {activatingId === u.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          "Activate"
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

      {/* Add / edit modal */}
      <dialog ref={formModal} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">
            {editing ? "Edit user" : "Add user"}
          </h3>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Name
              </label>
              <input
                type="text"
                className="input w-full"
                maxLength={60}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Email
              </label>
              <input
                type="email"
                className="input w-full"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {!editing && (
              <div>
                <label className="mb-1.5 block text-sm font-medium opacity-70">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input w-full pr-16"
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-4 text-xs opacity-60 hover:opacity-100"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium opacity-70">
                Role
              </label>
              <select
                className="select w-full"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                disabled={editing && isSelf(editing)}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
              {editing && isSelf(editing) && (
                <p className="mt-1.5 text-xs opacity-60">
                  You cannot change your own role.
                </p>
              )}
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
                  "Create user"
                )}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Reset password modal */}
      <dialog ref={pwModal} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">Reset password</h3>
          <p className="mt-2 text-sm opacity-70">
            Set a new password for{" "}
            <span className="font-semibold">{pwUser?.name}</span>.
          </p>

          <form onSubmit={handlePassword} className="mt-4 space-y-4">
            <input
              type="text"
              className="input w-full"
              placeholder="New password (at least 6 characters)"
              autoComplete="off"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => pwModal.current?.close()}
                disabled={pwSaving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "Update password"
                )}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Deactivate modal */}
      <dialog ref={statusModal} className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-semibold">Deactivate user</h3>
          <p className="mt-3 text-sm opacity-80">
            Deactivate <span className="font-semibold">{statusUser?.name}</span>?
            They will be signed out and unable to log in until you activate them
            again. Their sales and stock history are kept.
          </p>
          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => statusModal.current?.close()}
              disabled={statusSaving}
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleDeactivate}
              disabled={statusSaving}
            >
              {statusSaving ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Deactivate"
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