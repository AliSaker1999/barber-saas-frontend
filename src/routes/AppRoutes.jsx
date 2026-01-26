import { Routes, Route, Navigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

/* Layouts */
import PlatformLayout from "../layouts/PlatformLayout";
import CompanyLayout from "../layouts/CompanyLayout";
import CustomerLayout from "../layouts/CustomerLayout";

/* Pages */
import Login from "../pages/auth/login";
import Signup from "../pages/auth/Signup";

/* Platform */
import PlatformTenants from "../pages/platform/Tenants";
import PlatformCustomers from "../pages/platform/Customers";
import Reports from "../pages/platform/Reports";

/* Company */
import Queue from "../pages/company/Queue";
import Appointments from "../pages/company/Appointments";
import Services from "../pages/company/Services";
// import Staff from "../pages/company/Staff";
import Barbers from "../pages/company/Barbers";
import CompanyProfile from "../pages/company/CompanyProfile";
import BarberMyProfile from "../pages/company/BarberMyProfile";
import AdminReports from "../pages/company/AdminReports";
import NotificationHistory from "../pages/customer/NotificationHistory";

/* Customer */
import Tenants from "../pages/customer/Tenants";
import CustomerServices from "../pages/customer/Services";
import CustomerBarbers from "../pages/customer/Barbers";
import Slots from "../pages/customer/Slots";
import QueueStatus from "../pages/customer/QueueStatus";
import CustomerAppointments from "../pages/customer/Appointments";
import CustomerProfile from "../pages/customer/Profile";
import CustomerReports from "../pages/customer/CustomerReports";


export default function AppRoutes() {
  const user = useAppSelector(state => state.auth.user);

  /* ---------------- NOT LOGGED IN ---------------- */
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  /* ---------------- LOGGED IN ---------------- */
  return (
    <Routes>

      {/* ✅ ROOT REDIRECT — THIS FIXES WHITE SCREEN */}
      <Route
        path="/"
        element={
          <Navigate to={
            user.roles?.includes("SUPER_ADMIN")
              ? "/platform"
              : user.roles?.includes("CUSTOMER")
              ? "/customer"
              : "/company"
          } />
        }
      />

      {/* ---------- PLATFORM ---------- */}
      {user.roles?.includes("SUPER_ADMIN") && (
        <Route path="/platform" element={<PlatformLayout />}>
          <Route path="tenants" element={<PlatformTenants />} />
          <Route path="customers" element={<PlatformCustomers />} />
          <Route path="reports" element={<Reports />} />
          <Route index element={<Navigate to="tenants" />} />
        </Route>
      )}

      {/* ---------- COMPANY ---------- */}
      {(user.roles?.includes("ADMIN") || user.roles?.includes("BARBER")) && (
        <Route path="/company" element={<CompanyLayout />}>
          <Route path="profile" element={<CompanyProfile />} />
          <Route path="queue" element={<Queue />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="services" element={<Services />} />
          <Route path="barbers" element={<Barbers />} />
          <Route path="my-profile" element={<BarberMyProfile />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<NotificationHistory />} />
     
          <Route path="settings" element={<p>Settings page</p>} />
          <Route index element={<Navigate to="queue" />} />
        </Route>
      )}

      {/* ---------- CUSTOMER ---------- */}
      {user.roles?.includes("CUSTOMER") && (
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Tenants />} />
          <Route path="services" element={<CustomerServices />} />
          <Route path="barbers" element={<CustomerBarbers />} />
          <Route path="slots" element={<Slots />} />
          <Route path="queue" element={<QueueStatus />} />
          <Route path="appointments" element={<CustomerAppointments />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="reports" element={<CustomerReports />} />
          <Route path="notifications" element={<NotificationHistory />} />
        </Route>
      )}

      {/* ---------- FALLBACK ---------- */}
      <Route
        path="*"
        element={
          <Navigate to={
            user.roles?.includes("SUPER_ADMIN")
              ? "/platform"
              : user.roles?.includes("CUSTOMER")
              ? "/customer"
              : "/company"
          } />
        }
      />

    </Routes>
  );
}
