import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { ShopListSkeleton } from "../components/ui/States";
import { useOnboarding } from "../hooks/useOnboarding";

/* Layouts */
import PlatformLayout from "../layouts/PlatformLayout";
import CompanyLayout from "../layouts/CompanyLayout";
import CustomerLayout from "../layouts/CustomerLayout";

/* Auth */
const Login = lazy(() => import("../pages/auth/login"));
const Signup = lazy(() => import("../pages/auth/Signup"));
const Onboarding = lazy(() => import("../pages/auth/Onboarding"));

/* Legal — reachable without an account, and linked from the Play listing. */
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("../pages/TermsOfService"));

/* Platform */
const PlatformTenants = lazy(() => import("../pages/platform/Tenants"));
const PlatformCustomers = lazy(() => import("../pages/platform/Customers"));
const Reports = lazy(() => import("../pages/platform/Reports"));
const ActivityLog = lazy(() => import("../pages/platform/ActivityLog"));
const EnvPage = lazy(() => import("../pages/platform/EnvPage"));

/* Company */
const OwnerToday = lazy(() => import("../pages/company/Today"));
const Queue = lazy(() => import("../pages/company/Queue"));
const Appointments = lazy(() => import("../pages/company/Appointments"));
const Services = lazy(() => import("../pages/company/Services"));
const Barbers = lazy(() => import("../pages/company/Barbers"));
const CompanyProfile = lazy(() => import("../pages/company/CompanyProfile"));
const BarberMyProfile = lazy(() => import("../pages/company/BarberMyProfile"));
const AdminReports = lazy(() => import("../pages/company/AdminReports"));
const CompanyPromotions = lazy(() => import("../pages/company/Promotions"));
const Settings = lazy(() => import("../pages/company/Settings"));
const ShareBooking = lazy(() => import("../pages/company/ShareBooking"));

/* Shared */
const NotificationHistory = lazy(() => import("../pages/customer/NotificationHistory"));
const ConversationsPage = lazy(() => import("../pages/shared/Conversations"));

/* Public */
const PublicBooking = lazy(() => import("../pages/public/PublicBooking"));
const FindShop = lazy(() => import("../pages/public/FindShop"));

/* Customer */
const Home = lazy(() => import("../pages/customer/Home"));
const Explore = lazy(() => import("../pages/customer/Explore"));
const ShopProfile = lazy(() => import("../pages/customer/ShopProfile"));
const BookingFlow = lazy(() => import("../pages/customer/BookingFlow"));
const QueueTracker = lazy(() => import("../pages/customer/QueueTracker"));
const Bookings = lazy(() => import("../pages/customer/Bookings"));
const CustomerProfile = lazy(() => import("../pages/customer/Profile"));
const CustomerReports = lazy(() => import("../pages/customer/CustomerReports"));
const Favorites = lazy(() => import("../pages/customer/Favorites"));
const Loyalty = lazy(() => import("../pages/customer/Loyalty"));

/*
 * Route map.
 *
 * The customer app has five destinations and everything else hangs off them.
 * The old /customer/services, /customer/barbers and /customer/slots pages were
 * three steps of one booking flow reachable as standalone URLs — they redirect
 * into /customer/book now so old links, push notifications and the back stack
 * all still land somewhere sensible.
 */
export default function AppRoutes() {
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const { isDone: onboardingDone, completeOnboarding } = useOnboarding();

  const routeFallback = (
    <div className="p-4 pt-8">
      <ShopListSkeleton count={3} />
    </div>
  );

  const homeFor = (roles = []) =>
    roles.includes("SUPER_ADMIN") ? "/platform" : roles.includes("CUSTOMER") ? "/customer" : "/company";

  /* ---------------- NOT LOGGED IN ---------------- */
  if (!user) {
    return (
      <Suspense fallback={routeFallback}>
        <Routes>
          <Route
            path="/onboarding"
            element={
              <Onboarding
                onComplete={() => {
                  completeOnboarding();
                  navigate("/login");
                }}
              />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Legal pages must be reachable without an account — the Play
              listing links to them and reviewers open them signed out. */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Public booking link — the QR/Instagram entry point. */}
          <Route path="/book" element={<FindShop />} />
          <Route path="/book/:tenantSlug" element={<PublicBooking />} />

          <Route path="*" element={<Navigate to={onboardingDone ? "/login" : "/onboarding"} />} />
        </Routes>
      </Suspense>
    );
  }

  /* ---------------- LOGGED IN ---------------- */
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Public booking link, also reachable signed in (an owner previewing
            their own shop's link). */}
        <Route path="/book" element={<FindShop />} />
        <Route path="/book/:tenantSlug" element={<PublicBooking />} />

        <Route path="/" element={<Navigate to={homeFor(user.roles)} />} />

        {/* ---------- PLATFORM ---------- */}
        {user.roles?.includes("SUPER_ADMIN") && (
          <Route path="/platform" element={<PlatformLayout />}>
            <Route path="tenants" element={<PlatformTenants />} />
            <Route path="customers" element={<PlatformCustomers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="activity-log" element={<ActivityLog />} />
            <Route path="env" element={<EnvPage />} />
            <Route index element={<Navigate to="tenants" />} />
          </Route>
        )}

        {/* ---------- COMPANY (owner + barber) ---------- */}
        {(user.roles?.includes("ADMIN") || user.roles?.includes("BARBER")) && (
          <Route path="/company" element={<CompanyLayout />}>
            <Route path="today" element={<OwnerToday />} />
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

            {user.roles?.includes("ADMIN") && (
              <>
                <Route path="settings" element={<Settings />} />
                <Route path="share" element={<ShareBooking />} />
              </>
            )}

            {/* Owners and barbers both open onto their day. */}
            <Route index element={<Navigate to="today" />} />
          </Route>
        )}

        {/* ---------- CUSTOMER ---------- */}
        {user.roles?.includes("CUSTOMER") && (
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="shop/:tenantId" element={<ShopProfile />} />
            <Route path="book" element={<BookingFlow />} />
            <Route path="queue" element={<QueueTracker />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="profile" element={<CustomerProfile />} />

            {/* Contextual destinations — reachable, but not in the tab bar. */}
            <Route path="favorites" element={<Favorites />} />
            <Route path="loyalty" element={<Loyalty />} />
            <Route path="reports" element={<CustomerReports />} />
            <Route path="notifications" element={<NotificationHistory />} />
            <Route path="conversations" element={<ConversationsPage />} />

            {/* Retired URLs from the old three-page booking walk. */}
            <Route path="services" element={<Navigate to="/customer/book" replace />} />
            <Route path="barbers" element={<Navigate to="/customer/book?step=1" replace />} />
            <Route path="slots" element={<Navigate to="/customer/book?step=2" replace />} />
            <Route path="appointments" element={<Navigate to="/customer/bookings" replace />} />
          </Route>
        )}

        <Route path="*" element={<Navigate to={homeFor(user.roles)} />} />
      </Routes>
    </Suspense>
  );
}
