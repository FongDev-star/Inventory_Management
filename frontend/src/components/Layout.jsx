import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const ICONS = {
  menu: "M4 6h16 M4 12h16 M4 18h16",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
  products: "M21 8 12 3 3 8v8l9 5 9-5V8Z M3 8l9 5 9-5 M12 13v8",
  categories:
    "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z M7.5 7.5h.01",
  inventory: "M7 4v16 M7 4 3 8 M7 4l4 4 M17 20V4 M17 20l-4-4 M17 20l4-4",
  sales:
    "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6 M10 21h.01 M18 21h.01",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
};

const Icon = ({ name, size = 18 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={ICONS[name]} />
  </svg>
);

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin"] },
  { to: "/products", label: "Products", icon: "products", roles: ["admin", "employee"] },
  { to: "/categories", label: "Categories", icon: "categories", roles: ["admin"] },
  { to: "/inventory", label: "Inventory", icon: "inventory", roles: ["admin"] },
  { to: "/sales", label: "Sales", icon: "sales", roles: ["admin", "employee"] },
  { to: "/users", label: "Users", icon: "users", roles: ["admin"] },
];

const closeDrawer = () => {
  const toggle = document.getElementById("app-drawer");
  if (toggle) toggle.checked = false;
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { pathname } = useLocation();

  const items = navItems.filter((item) => item.roles.includes(user.role));
  const current = items.find((item) => pathname.startsWith(item.to));

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main area */}
      <div className="drawer-content flex min-h-screen flex-col bg-base-200">
        <header className="navbar sticky top-0 z-10 border-b border-base-300 bg-base-100 px-4">
          <div className="flex-none lg:hidden">
            <label
              htmlFor="app-drawer"
              className="btn btn-ghost btn-square"
              aria-label="Open menu"
            >
              <Icon name="menu" size={22} />
            </label>
          </div>

          <div className="flex-1 px-2">
            <h1 className="text-lg font-semibold">{current?.label ?? "Inventory"}</h1>
          </div>

          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost gap-2 px-2">
              <div className="avatar avatar-placeholder">
                <div className="w-8 rounded-full bg-primary text-primary-content">
                  <span className="text-sm">{user.name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
            </div>

            <ul
              tabIndex={0}
              className="menu dropdown-content z-30 mt-2 w-60 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
            >
              <li className="px-3 py-2">
                <div className="flex flex-col items-start gap-1 p-0 hover:bg-transparent">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs opacity-60">{user.email}</span>
                  <span className="badge badge-primary badge-sm mt-1">{user.role}</span>
                </div>
              </li>
              <li>
                <button onClick={logout}>Log out</button>
              </li>
            </ul>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-20">
        <label htmlFor="app-drawer" aria-label="Close menu" className="drawer-overlay"></label>
        <aside className="flex min-h-full w-64 flex-col border-r border-base-300 bg-base-100">
          <div className="px-6 py-5">
            <span className="text-lg font-semibold tracking-tight">Inventory</span>
          </div>

          <ul className="menu w-full gap-1 px-3">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={closeDrawer}
                  className={({ isActive }) => (isActive ? "menu-active" : "")}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}