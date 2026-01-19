import { NavLink, Outlet } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

export default function CompanyLayout() {
  const user = useAppSelector(state => state.auth.user);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r shadow-sm">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Barber SaaS</h1>
          <p className="text-xs text-gray-500">
            Company Dashboard
          </p>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem to="queue" label="Queue" />
          <NavItem to="appointments" label="Appointments" />
         
          {user.role === "ADMIN" && (
            <>
              <NavItem to="services" label="Services" />
              <NavItem to="barbers" label="Barbers" />
              {/* <NavItem to="staff" label="Staff" /> */}
              <NavItem to="settings" label="Settings" />
              
            </>
          )}
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        {/* TOP BAR */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {user.role === "ADMIN" ? "Admin" : "Staff"} Panel
          </h2>

          <div className="text-sm text-gray-600">
            {user.email}
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
        `block px-3 py-2 rounded text-sm font-medium transition ${
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
