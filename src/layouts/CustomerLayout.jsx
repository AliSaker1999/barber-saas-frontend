import { Outlet, useNavigate, useLocation, Link, NavLink } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useState } from "react";
import PhoneVerificationModal from "../components/PhoneVerificationModal";

export default function CustomerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Verification Warning Banner (Red Flag) */}
      {!user?.isPhoneVerified && (
        <div 
          onClick={() => setIsVerificationModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 text-center cursor-pointer transition-colors shadow-md relative z-[60]"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
             <span className="text-xl animate-pulse">🚩</span>
             <p className="text-sm sm:text-base font-bold tracking-wide uppercase">
               Priority: Account Verification Needed. <span className="underline decoration-2 underline-offset-4 ml-1">Verify Phone Now</span>
             </p>
             <span className="hidden sm:inline-block">→</span>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo & Mobile Trigger */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>
              
              <Link to="/customer" className="flex items-center gap-2 sm:gap-3 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BarberSaaS</h1>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <HeaderLink to="/customer" label="🏪 Browse" end />
              <HeaderLink to="/customer/appointments" label="📅 Appointments" />
              <HeaderLink to="/customer/queue" label="⏱️ Queue" />
              <HeaderLink to="/customer/reports" label="📊 Reports" />
              <HeaderLink to="/customer/profile" label="👤 Profile" />
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/customer/profile" className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Customer</span>
                <span className="text-sm font-black text-gray-900 leading-none truncate max-w-[120px]">{user?.fullName?.split(" ")[0] || "User"}</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-2 sm:p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                title="Sign Out"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline text-sm font-bold">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-t bg-gray-50 ${mobileMenuOpen ? "max-h-80 opacity-100 py-4" : "max-h-0 opacity-0"}`}>
          <div className="px-4 space-y-2">
            <MobileNavLink to="/customer" label="🏪 Discover Shops" onClick={() => setMobileMenuOpen(false)} end />
            <MobileNavLink to="/customer/appointments" label="📅 My Appointments" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink to="/customer/queue" label="⏱️ Live Queue" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink to="/customer/reports" label="📊 Grooming Insights" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink to="/customer/profile" label="👤 My Profile" onClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation (Tab Bar) */}
      <div className="lg:hidden sticky bottom-0 bg-white/95 backdrop-blur-md border-t px-4 py-3 flex justify-around items-center z-50">
          <BottomTab to="/customer" icon="🏠" end title="Shops" />
          <BottomTab to="/customer/appointments" icon="📅" title="Bookings" />
          <BottomTab to="/customer/queue" icon="⏱️" title="Queue" />
          <BottomTab to="/customer/reports" icon="📊" title="Stats" />
          <BottomTab to="/customer/profile" icon="👤" title="Me" />
      </div>

      {/* Footer (Desktop only) */}
      <footer className="hidden sm:block bg-white border-t border-gray-100 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                   <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11.5A2.75 2.75 0 005.75 18.5h8.5A2.75 2.75 0 0017 15.75V4.25A2.75 2.75 0 0014.25 1.5h-3.75v2h3.75a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75V4.25a.75.75 0 01.75-.75h3.75v-2z" /></svg>
                </div>
                <span className="font-bold text-gray-400">BarberSaaS © 2026</span>
            </div>
            <div className="flex gap-6 text-sm font-bold text-gray-400">
               <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
               <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
               <a href="mailto:alisaker1999@hotmail.com" className="hover:text-blue-600 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      <PhoneVerificationModal 
        isOpen={isVerificationModalOpen} 
        onClose={() => setIsVerificationModalOpen(false)} 
      />
    </div>
  );
}

function HeaderLink({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `px-4 py-2 rounded-xl text-sm font-bold transition-all ${
          isActive
            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function MobileNavLink({ to, label, onClick, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `block px-4 py-3 rounded-xl text-base font-bold transition-all ${
          isActive
            ? "bg-blue-600 text-white shadow-md shadow-blue-100"
            : "bg-white text-gray-700 border border-gray-100 hover:bg-gray-50"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function BottomTab({ to, icon, end = false, title }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-all ${
          isActive ? "text-blue-600 scale-110" : "text-gray-400 opacity-60"
        }`
      }
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter">{title}</span>
    </NavLink>
  );
}
