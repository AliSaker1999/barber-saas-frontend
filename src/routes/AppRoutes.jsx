import { Routes, Route, Navigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

/* Layouts */
import PlatformLayout from "../layouts/PlatformLayout";
import CompanyLayout from "../layouts/CompanyLayout";
import CustomerLayout from "../layouts/CustomerLayout";

/* Pages */
import Login from "../pages/auth/login";

/* Platform */
import PlatformTenants from "../pages/platform/Tenants";
import PlatformCustomers from "../pages/platform/Customers";

/* Company */
import Queue from "../pages/company/Queue";
import Appointments from "../pages/company/Appointments";
import Services from "../pages/company/Services";
// import Staff from "../pages/company/Staff";
import Barbers from "../pages/company/Barbers";

/* Customer */
import Tenants from "../pages/customer/Tenants";
import CustomerServices from "../pages/customer/Services";
import CustomerBarbers from "../pages/customer/Barbers";
import Slots from "../pages/customer/Slots";
import QueueStatus from "../pages/customer/QueueStatus";

export default function AppRoutes() {
  const user = useAppSelector(state => state.auth.user);

  /* ---------------- NOT LOGGED IN ---------------- */
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
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
            user.role === "SUPER_ADMIN"
              ? "/platform"
              : user.role === "CUSTOMER"
              ? "/customer"
              : "/company"
          } />
        }
      />

      {/* ---------- PLATFORM ---------- */}
      {user.role === "SUPER_ADMIN" && (
        <Route path="/platform" element={<PlatformLayout />}>
          <Route path="tenants" element={<PlatformTenants />} />
          <Route path="customers" element={<PlatformCustomers />} />
          <Route index element={<Navigate to="tenants" />} />
        </Route>
      )}

      {/* ---------- COMPANY ---------- */}
      {(user.role === "ADMIN" || user.role === "STAFF") && (
        <Route path="/company" element={<CompanyLayout />}>
          <Route path="queue" element={<Queue />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="services" element={<Services />} />
          {/* <Route path="staff" element={<Staff />} /> */}
          <Route path="barbers" element={<Barbers />} />
     
          <Route path="settings" element={<p>Settings page</p>} />
          <Route index element={<Navigate to="queue" />} />
        </Route>
      )}

      {/* ---------- CUSTOMER ---------- */}
      {user.role === "CUSTOMER" && (
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Tenants />} />
          <Route path="services" element={<CustomerServices />} />
          <Route path="barbers" element={<CustomerBarbers />} />
          <Route path="slots" element={<Slots />} />
          <Route path="queue" element={<QueueStatus />} />
        </Route>
      )}

      {/* ---------- FALLBACK ---------- */}
      <Route
        path="*"
        element={
          <Navigate to={
            user.role === "SUPER_ADMIN"
              ? "/platform"
              : user.role === "CUSTOMER"
              ? "/customer"
              : "/company"
          } />
        }
      />

    </Routes>
  );
}
