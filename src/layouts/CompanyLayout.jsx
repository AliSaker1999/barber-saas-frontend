import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useState } from "react";

const navItems = [
  { to: "queue", label: "Queue", icon: "🚀", roles: ["ADMIN", "BARBER"] },
  { to: "appointments", label: "Appointments", icon: "📅", roles: ["ADMIN", "BARBER"] },
  { to: "services", label: "Services", icon: "✂️", roles: ["ADMIN"] },
  { to: "barbers", label: "Team", icon: "👥", roles: ["ADMIN"] },
  { to: "profile", label: "Shop Profile", icon: "🏢", roles: ["ADMIN"] },
];

export default function CompanyLayout() {
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const visibleNavItems = navItems.filter(item => 
    item.roles.some(role => user.roles?.includes(role))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 shadow-lg transition-transform duration-300 lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11.5A2.75 2.75 0 005.75 18.5h8.5A2.75 2.75 0 0017 15.75V4.25A2.75 2.75 0 0014.25 1.5h-3.75v2h3.75a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75V4.25a.75.75 0 01.75-.75h3.75v-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BarberSaaS</h1>
              <p className="text-xs text-gray-600">{user.roles?.includes("ADMIN") ? "Admin" : "Barber"} Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="mb-3">
            <p className="text-xs text-gray-600 font-semibold">Logged in as</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-semibold py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>

            {/* Header Title */}
            <h2 className="text-xl font-bold text-gray-900">
              {user.roles?.includes("ADMIN") ? "📊 Admin Dashboard" : "✂️ Barber Dashboard"}
            </h2>

            {/* User Avatar */}
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}
    </div>
  );
}
