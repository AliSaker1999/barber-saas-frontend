import { Outlet, useNavigate, Link, NavLink } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useEffect, useState } from "react";
import PhoneVerificationModal from "../components/PhoneVerificationModal";
import PrivacyPolicyModal from "../components/PrivacyPolicyModal";
import TermsOfServiceModal from "../components/TermsOfServiceModal";
import NotificationsMenu from "../components/NotificationsMenu";
import ConnectionBadge from "../components/ConnectionBadge";

export default function CustomerLayout() {

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const { isOnline } = useAppSelector(state => state.ui);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b shadow-sm">
        {/* Top Safe Area - Dynamic Background */}
        <div className={`h-[env(safe-area-inset-top)] ${!isOnline ? 'bg-amber-500' : (!user?.isPhoneVerified ? 'bg-red-600 shadow-none border-none' : 'bg-transparent transition-colors duration-500')}`} />
        
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[10px] font-black py-1 px-4 text-center uppercase tracking-tighter">
            Offline Mode
          </div>
        )}
        
        {!user?.isPhoneVerified && (
          <div 
            onClick={() => setIsVerificationModalOpen(true)}
            className="bg-red-600 text-white py-2 px-4 text-center cursor-pointer relative z-[60]"
          >
            <p className="text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
               <span className="animate-pulse">🚩</span> Verify Phone Number <span className="underline">Now</span>
            </p>
          </div>
        )}

        <header className="max-w-7xl mx-auto px-4 w-full pt-3 pb-3 sm:pt-4 sm:pb-4">
          <div className="flex justify-between items-center h-16 sm:h-20 gap-2">
            {/* Logo & Mobile Trigger */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors tap-target"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* User Menu */}
            <div className="flex items-center gap-1 sm:gap-4">
              <NotificationsMenu />
              <button
                onClick={handleLogout}
                className="p-1.5 sm:p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>
      </div>

      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out border-t bg-gray-50 ${mobileMenuOpen ? "max-h-screen opacity-100 py-4" : "max-h-0 opacity-0"}`}>
        <div className="px-4 space-y-2">
            <div className="py-2">
              <p className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Account</p>
              <MobileNavLink to="/customer/profile" label="👤 My Profile" onClick={() => setMobileMenuOpen(false)} />
              <MobileNavLink to="/customer/notifications" label="🔔 Notifications" onClick={() => setMobileMenuOpen(false)} />
            </div>
            {/* ... other menu items ... */}
        </div>
      </div>

      {/* Main Content - Padded for Bottom Nav */}
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+150px)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation with Enhanced Safe Area */}
      <div
        className="lg:hidden fixed left-0 right-0 bg-white/95 backdrop-blur-xl border-t px-2 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 flex justify-around items-center z-[60] shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.1)] min-h-[calc(env(safe-area-inset-bottom)+75px)] safe-bottom"
        style={{ bottom: "env(safe-area-inset-bottom)" }}
      >
        <BottomTab to="/customer" icon="🏪" end title="Shops" />
        <BottomTab to="/customer/appointments" icon="📅" title="Bookings" />
        <BottomTab to="/customer/queue" icon="⏱️" title="Queue" />
        <BottomTab to="/customer/reports" icon="📊" title="Stats" />
        <BottomTab to="/customer/notifications" icon="🔔" title="Alerts" />
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
              <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-blue-600 transition-colors">Privacy Policy</button>
              <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-600 transition-colors">Terms of Service</button>
              <a href="tel:+96100000000" className="hover:text-blue-600 transition-colors">Call Support</a>
              <a href="https://wa.me/96100000000" className="hover:text-blue-600 transition-colors" target="_blank" rel="noreferrer">WhatsApp</a>
            </div>
          </div>
        </div>
      </footer>

      <PhoneVerificationModal 
        isOpen={isVerificationModalOpen} 
        onClose={() => setIsVerificationModalOpen(false)} 
      />
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
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
        `flex flex-col items-center gap-1 transition-all tap-target ${
          isActive ? "text-blue-600 scale-110" : "text-gray-400 opacity-60"
        }`
      }
    >
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter">{title}</span>
    </NavLink>
  );
}
