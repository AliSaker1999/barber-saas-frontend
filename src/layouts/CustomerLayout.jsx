import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-600 hover:text-gray-900";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11.5A2.75 2.75 0 005.75 18.5h8.5A2.75 2.75 0 0017 15.75V4.25A2.75 2.75 0 0014.25 1.5h-3.75v2h3.75a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75V4.25a.75.75 0 01.75-.75h3.75v-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BarberSaaS</h1>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => navigate("/customer")}
                className={`font-semibold transition-colors pb-2 ${isActive("/customer")}`}
              >
                🏪 Browse
              </button>
              <button
                onClick={() => navigate("/customer/appointments")}
                className={`font-semibold transition-colors pb-2 ${isActive("/customer/appointments")}`}
              >
                📅 My Appointments
              </button>
              <button
                onClick={() => navigate("/customer/queue")}
                className={`font-semibold transition-colors pb-2 ${isActive("/customer/queue")}`}
              >
                ⏱️ Queue
              </button>              <button
                onClick={() => navigate("/customer/profile")}
                className={`font-semibold transition-colors pb-2 ${isActive("/customer/profile")}`}
              >
                👤 My Profile
              </button>            </div>

            {/* User Menu */}
            <div className="flex items-center gap-6">
              {user && (
                <>
                  <div className="hidden sm:block">
                    <p className="text-sm text-gray-600">
                      Welcome, <span className="font-semibold text-gray-900">{user.fullName || user.email}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>© 2026 BarberSaaS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
