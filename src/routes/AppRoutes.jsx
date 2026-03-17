import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import LoadingState from "../components/LoadingState";
import { useOnboarding } from "../hooks/useOnboarding";

/* Layouts */
import PlatformLayout from "../layouts/PlatformLayout";
import CompanyLayout from "../layouts/CompanyLayout";
import CustomerLayout from "../layouts/CustomerLayout";

/* Pages */
const Login = lazy(() => import("../pages/auth/login"));
const Signup = lazy(() => import("../pages/auth/Signup"));

/* Platform */
const PlatformTenants = lazy(() => import("../pages/platform/Tenants"));
const PlatformCustomers = lazy(() => import("../pages/platform/Customers"));
const Reports = lazy(() => import("../pages/platform/Reports"));
const EnvPage = lazy(() => import("../pages/platform/EnvPage"));

/* Company */
const Queue = lazy(() => import("../pages/company/Queue"));
const Appointments = lazy(() => import("../pages/company/Appointments"));
const Services = lazy(() => import("../pages/company/Services"));
// import Staff from "../pages/company/Staff";
const Barbers = lazy(() => import("../pages/company/Barbers"));
const CompanyProfile = lazy(() => import("../pages/company/CompanyProfile"));
const BarberMyProfile = lazy(() => import("../pages/company/BarberMyProfile"));
const AdminReports = lazy(() => import("../pages/company/AdminReports"));
const CompanyPromotions = lazy(() => import("../pages/company/Promotions"));
const NotificationHistory = lazy(() => import("../pages/customer/NotificationHistory"));
const ConversationsPage = lazy(() => import("../pages/shared/Conversations"));

/* Customer */
const Tenants = lazy(() => import("../pages/customer/Tenants"));
const CustomerServices = lazy(() => import("../pages/customer/Services"));
const CustomerBarbers = lazy(() => import("../pages/customer/Barbers"));
const Slots = lazy(() => import("../pages/customer/Slots"));
const QueueStatus = lazy(() => import("../pages/customer/QueueStatus"));
const CustomerAppointments = lazy(() => import("../pages/customer/Appointments"));
const CustomerProfile = lazy(() => import("../pages/customer/Profile"));
const CustomerReports = lazy(() => import("../pages/customer/CustomerReports"));
const Favorites = lazy(() => import("../pages/customer/Favorites"));
const Onboarding = lazy(() => import("../pages/auth/Onboarding"));


export default function AppRoutes() {
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const { isDone: onboardingDone, completeOnboarding } = useOnboarding();
  const routeFallback = (
    <div className="p-4">
      <LoadingState label="Loading page..." blocks={2} />
    </div>
  );

  /* ---------------- NOT LOGGED IN ---------------- */
  if (!user) {
    return (
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding onComplete={() => { completeOnboarding(); navigate("/login"); }} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to={onboardingDone ? "/login" : "/onboarding"} />} />
        </Routes>
      </Suspense>
    );
  }

  /* ---------------- LOGGED IN ---------------- */
  return (
    <Suspense fallback={routeFallback}>
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
          <Route path="env" element={<EnvPage />} />
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
          <Route path="promotions" element={<CompanyPromotions />} />
          <Route path="notifications" element={<NotificationHistory />} />
          <Route path="conversations" element={<ConversationsPage />} />
     
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
          <Route path="favorites" element={<Favorites />} />
          <Route path="notifications" element={<NotificationHistory />} />
          <Route path="conversations" element={<ConversationsPage />} />
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
    </Suspense>
  );
}
