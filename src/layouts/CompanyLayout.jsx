import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useEffect, useState } from "react";
import NotificationsMenu from "../components/NotificationsMenu";
import ConnectionBadge from "../components/ConnectionBadge";

const navItems = [
  { to: "queue", label: "Queue", icon: "🚀", roles: ["ADMIN", "BARBER"] },
  { to: "appointments", label: "Appointments", icon: "📅", roles: ["ADMIN", "BARBER"] },
  { to: "services", label: "Services", icon: "✂️", roles: ["ADMIN"] },
  { to: "barbers", label: "Team", icon: "👥", roles: ["ADMIN"] },
  { to: "reports", label: "Reports", icon: "📊", roles: ["ADMIN", "BARBER"] },
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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:block relative">
      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Logo */}
        <div className="h-auto min-h-20 flex items-center px-6 border-b border-gray-100 pt-[env(safe-area-inset-top)] pb-4">
           <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 mr-3">
              <span className="text-xl">✂️</span>
           </div>
           <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">BarberSaaS</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.roles?.includes("ADMIN") ? "Admin" : "Barber"}</p>
           </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] section-scrollbar">
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mt-2">Menu</p>
          {visibleNavItems.map(item => (
            <SidebarLink 
              key={item.to} 
              to={item.to} 
              icon={item.icon} 
              label={item.label} 
              onClick={() => setMobileOpen(false)} 
            />
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">System</p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-colors group"
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
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-8 h-auto min-h-16 sm:min-h-20 flex items-center justify-between pt-[env(safe-area-inset-top)]">
            <div className="flex items-center gap-3 py-4">
              <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors tap-target"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
               </button>
               <div className="flex items-center gap-4">
                 <h2 className="text-lg sm:text-2xl font-black text-gray-900 truncate">
                    {user.roles?.includes("ADMIN") ? "Dashboard" : "My Workstation"}
                 </h2>
                 <ConnectionBadge className="hidden md:flex ml-2" />
               </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
                <div className="md:hidden">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                </div>
                <NotificationsMenu />
                <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-bold text-gray-900">{user.fullName?.split(' ')[0]}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.roles?.includes("ADMIN") ? "Owner" : "Staff"}</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <span className="text-sm font-bold text-gray-600">{user.fullName?.charAt(0)}</span>
                </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 pb-24 lg:pb-10 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pb-[env(safe-area-inset-bottom)] pt-2 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <BottomTab to="queue" icon="🚀" label="Queue" />
         <BottomTab to="appointments" icon="📅" label="Bookings" />
         <BottomTab to="reports" icon="📊" label="Stats" />
         <BottomTab to="notifications" icon="🔔" label="Alerts" />
         <button 
           onClick={() => setMobileOpen(true)}
           className="flex flex-col items-center gap-1 p-2 text-gray-400 opacity-60 hover:opacity-100 tap-target"
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
            ? "bg-blue-50 text-blue-600 shadow-sm"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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
        `flex flex-col items-center gap-1 p-2 transition-all duration-300 tap-target ${
          isActive ? "text-blue-600 scale-110" : "text-gray-400 opacity-60"
        }`
      }
    >
      <span className="text-xl mb-0.5">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </NavLink>
  );
}
