import { NavLink, Outlet } from "react-router-dom";

export default function PlatformLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm">
        <div className="p-4 text-xl font-bold border-b">
          Barber SaaS
        </div>

        <nav className="p-4 space-y-2">
          <NavItem to="tenants" label="Tenants" />
          <NavItem to="customers" label="Customers" />
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Platform Dashboard
          </h2>

          <div className="text-sm text-gray-600">
            Super Admin
          </div>
        </header>

        {/* CONTENT */}
        <main className="p-6 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-2 rounded text-sm font-medium ${
          isActive
            ? "bg-blue-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
