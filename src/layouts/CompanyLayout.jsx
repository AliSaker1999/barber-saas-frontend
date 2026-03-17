import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useEffect, useState } from "react";
import NotificationsMenu from "../components/NotificationsMenu";
import ConnectionBadge from "../components/ConnectionBadge";
import ThemeToggle from "../components/ThemeToggle";
import LanguageSwitcher from "../components/LanguageSwitcher";

const navItems = [
  { to: "queue", label: "Queue", icon: "🚀", roles: ["ADMIN", "BARBER"] },
  { to: "appointments", label: "Appointments", icon: "📅", roles: ["ADMIN", "BARBER"] },
  { to: "services", label: "Services", icon: "✂️", roles: ["ADMIN"] },
  { to: "barbers", label: "Team", icon: "👥", roles: ["ADMIN"] },
  { to: "reports", label: "Reports", icon: "📊", roles: ["ADMIN", "BARBER"] },
  { to: "promotions", label: "Promotions", icon: "🎉", roles: ["ADMIN"] },
  { to: "conversations", label: "Messages", icon: "💬", roles: ["ADMIN", "BARBER"] },
  { to: "my-profile", label: "My Profile", icon: "👤", roles: ["BARBER"] },
  { to: "profile", label: "Shop Profile", icon: "🏢", roles: ["ADMIN"] },
  { to: "notifications", label: "Notifications", icon: "🔔", roles: ["ADMIN", "BARBER"] }, // Added for easy access
];

export default function CompanyLayout() {
  const user = useAppSelector(state => state.auth.user);
  const { isOnline } = useAppSelector(state => state.ui);
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
    <div className="min-h-screen bg-app-bg flex flex-col lg:block relative">
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-app-surface border-r border-app-border shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo */}
          <div className="h-auto min-h-20 flex items-center px-6 border-b border-app-border pt-[env(safe-area-inset-top)] pb-4">
            <div className="w-10 h-10 bg-app-primary rounded-xl flex items-center justify-center shadow-lg mr-3">
              <span className="text-xl">✂️</span>
           </div>
           <div>
              <h1 className="text-xl font-black text-app-primary tracking-tight">Ajmal</h1>
              <p className="text-xs font-bold text-app-muted uppercase tracking-widest">{user.roles?.includes("ADMIN") ? "Admin" : "Barber"}</p>
           </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] section-scrollbar">
          <p className="px-4 text-xs font-bold text-app-muted uppercase tracking-widest mb-2 mt-2">Menu</p>
          {visibleNavItems.map(item => (
            <SidebarLink 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              onClick={() => setMobileOpen(false)} 
            />
          ))}

          <div className="pt-4 mt-4 border-t border-app-border">
            <p className="px-4 text-xs font-bold text-app-muted uppercase tracking-widest mb-2">System</p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-app-error hover:bg-app-surface-2 transition-colors group"
            >
               <span className="text-xl transition-transform group-hover:-translate-x-1">🚪</span>
               <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div className="lg:ml-72 min-h-screen flex flex-col">
        {!isOnline && (
          <div className="bg-amber-500 text-white text-xs sm:text-sm font-bold py-2 px-4 text-center">
            You are offline. Changes will sync when you reconnect.
          </div>
        )}
        {/* Header */}
        <header className="sticky top-0 z-40 bg-app-surface backdrop-blur-md border-b border-app-border px-4 sm:px-8 h-auto min-h-16 sm:min-h-20 flex items-center justify-between pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-3 py-4">
              <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors tap-target"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
               </button>
               <div className="flex items-center gap-4">
                 <h2 className="text-lg sm:text-2xl font-black text-app-text truncate">
                    {user.roles?.includes("ADMIN") ? "Dashboard" : "My Workstation"}
                 </h2>
                 <ConnectionBadge className="hidden md:flex ml-2" />
               </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <NavLink
                to="conversations"
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-app-primary text-app-text text-xs font-bold"
              >
                💬 Conversations
              </NavLink>
              <ThemeToggle className="hidden sm:inline-flex" />
              <LanguageSwitcher compact />
                <div className="md:hidden">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                </div>
                <NotificationsMenu />
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900">{user.fullName?.split(' ')[0]}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.roles?.includes("ADMIN") ? "Owner" : "Staff"}</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-app-surface-2 rounded-full flex items-center justify-center border-2 border-app-border shadow-sm">
                  <span className="text-sm font-bold text-app-muted">{user.fullName?.charAt(0)}</span>
                </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 app-page pb-24 lg:pb-10 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-app-surface backdrop-blur-md border-t border-app-border px-4 pb-[env(safe-area-inset-bottom)] pt-2 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <BottomTab to="queue" icon="🚀" label="Queue" />
        <BottomTab to="appointments" icon="📅" label="Bookings" />
        <BottomTab to="conversations" icon="💬" label="Chat" />
        <BottomTab to="reports" icon="📊" label="Stats" />
        <BottomTab to="notifications" icon="🔔" label="Alerts" />
        <ThemeToggle className="!px-2 !py-1" />
        <button 
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 p-2 text-app-muted opacity-60 hover:opacity-100 tap-target"
        >
          <span className="text-xl">🍔</span>
          <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
        </button>
      </div>

    </div>
  );
}

function SidebarLink({ to, icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all duration-200 group ${
          isActive
            ? "bg-app-primary text-app-text shadow-sm"
            : "text-app-muted hover:bg-app-primary hover:text-app-text"
        }`
      }
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto opacity-0 group-hover:opacity-100 text-gray-300">→</span>
    </NavLink>
  );
}

function BottomTab({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 p-2 transition-all duration-300 tap-target rounded-lg ${
          isActive ? "bg-app-primary text-app-text scale-110 opacity-100" : "text-app-muted opacity-60 hover:bg-app-primary hover:text-app-text hover:opacity-100"
        }`
      }
    >
      <span className="text-xl mb-0.5">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </NavLink>
  );
}
