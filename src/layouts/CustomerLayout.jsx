import { Outlet, useNavigate, Link, NavLink } from "react-router-dom";
import {  useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import {  useState } from "react";
import PhoneVerificationModal from "../components/PhoneVerificationModal";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import TermsOfServiceModal from "../components/TermsOfServiceModal";
import NotificationsMenu from "../components/NotificationsMenu";
import ConnectionBadge from "../components/ConnectionBadge";
import ThemeToggle from "../components/ThemeToggle";

const desktopNavItems = [
  { to: "/customer", label: "Shops", icon: "🏠", end: true },
  { to: "/customer/appointments", label: "Bookings", icon: "📅" },
  { to: "/customer/conversations", label: "Messages", icon: "💬" },
  { to: "/customer/queue", label: "Queue", icon: "⏱️" },
  { to: "/customer/reports", label: "Stats", icon: "📊" },
  { to: "/customer/profile", label: "Profile", icon: "👤" },
  { to: "/customer/notifications", label: "Alerts", icon: "🔔" },
];

export default function CustomerLayout() {

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  // const user = useAppSelector(state => state.auth.user);
  // const { isOnline } = useAppSelector(state => state.ui);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-app-surface-2 flex flex-col">

      <header className="sticky top-0 z-50 bg-app-surface/95 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 w-full pt-3 pb-3 sm:pt-4 sm:pb-4">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-app-surface-2 dark:hover:bg-gray-800 transition-colors tap-target text-app-muted dark:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                </svg>
              </button>

              <Link to="/customer" className="flex items-center gap-2 group">
                <div className="w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">BarberSaaS</h1>
              </Link>
            </div>

            <div className="hidden lg:flex flex-1 justify-center px-4">
              <nav className="flex items-center gap-3 border-b border-app-border">
                {desktopNavItems.map((item) => (
                  <HeaderLink key={item.to} to={item.to} label={item.label} icon={item.icon} end={item.end} />
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
              <div className="hidden lg:block"><ThemeToggle /></div>

              <NavLink to="/customer/conversations" className="p-1.5 sm:p-2.5 bg-app-surface-2 text-app-muted hover:bg-app-surface-2 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700 rounded-lg transition-all">
                <span className="text-xl sm:text-2xl">💬</span>
              </NavLink>

              <NotificationsMenu />

              <button onClick={handleLogout} className="p-1.5 sm:p-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-all">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-screen opacity-100 py-4" : "max-h-0 opacity-0"}`}>
        <div className="px-4 space-y-2 bg-app-surface-2 border-t border-app-border">
          <div className="py-2">
            <div className="flex justify-between items-center px-4 mb-2">
                  <p className="text-[10px] font-black text-app-muted uppercase tracking-widest">Account</p>
              <ThemeToggle />
            </div>

            <MobileNavLink to="/customer/profile" label="👤 My Profile" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink to="/customer/conversations" label="💬 Conversations" onClick={() => setMobileMenuOpen(false)} />
            <MobileNavLink to="/customer/notifications" label="🔔 Notifications" onClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      </div>

      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+150px)]">
        <div className="max-w-7xl mx-auto app-page">
          <Outlet />
        </div>
      </main>

      <div className="lg:hidden fixed left-0 right-0 bg-app-surface/95 backdrop-blur-xl border-t border-app-border dark:bg-black/95 dark:border-gray-800 px-2 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 flex justify-around items-center z-[60] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.1)] min-h-[calc(env(safe-area-inset-bottom)+75px)] safe-bottom" style={{ bottom: "env(safe-area-inset-bottom)" }}>
        <BottomTab to="/customer" icon="🏪" end title="Shops" />
        <BottomTab to="/customer/appointments" icon="📅" title="Bookings" />
        <BottomTab to="/customer/queue" icon="⏱️" title="Queue" />
        <BottomTab to="/customer/reports" icon="📊" title="Stats" />
      </div>

      <footer className="hidden sm:block bg-app-surface border-t border-app-border mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-app-surface-2 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.5 1.5H5.75A2.75 2.75 0 003 4.25v11.5A2.75 2.75 0 005.75 18.5h8.5A2.75 2.75 0 0017 15.75V4.25A2.75 2.75 0 0014.25 1.5h-3.75v2h3.75a.75.75 0 01.75.75v11.5a.75.75 0 01-.75.75h-8.5a.75.75 0 01-.75-.75V4.25a.75.75 0 01.75-.75h3.75v-2z" /></svg>
              </div>
              <span className="font-bold text-gray-400">BarberSaaS © 2026</span>
            </div>
            <div className="flex gap-6 text-sm font-bold text-app-muted">
              <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-blue-600 transition-colors">Privacy Policy</button>
              <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-600 transition-colors">Terms of Service</button>
              <a href="tel:+96100000000" className="hover:text-blue-600 transition-colors">Call Support</a>
              <a href="https://wa.me/96100000000" className="hover:text-blue-600 transition-colors" target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        </div>
      </footer>

      <PhoneVerificationModal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} />
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}

function HeaderLink({ to, label, icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        (isActive
          ? "px-5 py-3 rounded-2xl text-base sm:text-lg font-bold transition-all whitespace-nowrap border border-transparent flex items-center gap-2 bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
          : "px-5 py-3 rounded-2xl text-base sm:text-lg font-bold transition-all whitespace-nowrap border border-transparent flex items-center gap-2 text-app-muted hover:bg-blue-600 hover:text-white dark:text-slate-400 dark:hover:bg-blue-600"
        )
      }
    >
      {icon && <span className="text-2xl sm:text-[1.6rem] leading-none">{icon}</span>}
      <span className="text-sm sm:text-base">{label}</span>
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
        (isActive
          ? "block px-4 py-3 rounded-xl text-base font-bold transition-all bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
          : "block px-4 py-3 rounded-xl text-base font-bold transition-all bg-app-surface text-app-muted border border-app-border hover:bg-blue-600 hover:text-white dark:bg-gray-800 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-blue-600"
        )
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
        (isActive
          ? "flex flex-col items-center gap-1 transition-all tap-target rounded-lg px-2 py-1 bg-blue-600 text-white scale-110 opacity-100 shadow-lg shadow-blue-200 dark:shadow-none"
          : "flex flex-col items-center gap-1 transition-all tap-target rounded-lg px-2 py-1 text-app-surface text-app-muted opacity-60 hover:bg-blue-600 hover:text-white hover:opacity-100 dark:text-slate-500"
        )
      }
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter">{title}</span>
    </NavLink>
  );
}
