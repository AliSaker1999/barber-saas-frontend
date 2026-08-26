import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useState } from "react";
import ConnectionBadge from "../components/ConnectionBadge";
import ThemeToggle from "../components/ThemeToggle";

export default function PlatformLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r shadow-sm transition-transform duration-300 lg:translate-x-0 lg:static ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent border-b">
          Barber SaaS
        </div>

        <nav className="p-4 space-y-2">
          <NavItem to="tenants" label="🏬 Tenants" onClick={() => setMobileOpen(false)} />
          <NavItem to="customers" label="👥 Customers" onClick={() => setMobileOpen(false)} />
          <NavItem to="reports" label="📊 Reports" onClick={() => setMobileOpen(false)} />
          <NavItem to="activity-log" label="📜 Activity Log" onClick={() => setMobileOpen(false)} />
          <NavItem to="env" label="🧪 Environment" onClick={() => setMobileOpen(false)} />
        </nav>

        {/* User Info Mobile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] border-t lg:hidden bg-gray-50">
           <button
             onClick={handleLogout}
             className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors text-sm"
           >
             Sign Out
           </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-0 z-50 bg-white/95 shadow-sm border-b border-gray-200">
          <div className="h-[env(safe-area-inset-top)] bg-white" />
          <header className="bg-transparent px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900">
              Platform Dashboard
            </h2>
            <ConnectionBadge className="hidden sm:flex" />
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle className="hidden sm:inline-flex" />
            <div className="hidden sm:block text-sm font-bold text-gray-500 uppercase tracking-widest">
              Super Admin
            </div>
            <button
              onClick={handleLogout}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold rounded-xl transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>
        </div>

        {/* CONTENT */}
        <main className="app-page flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}
    </div>
  );
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-4 py-3 rounded-xl text-sm font-bold transition-all ${
          isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
            : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {label}
    </NavLink>
  );
}
