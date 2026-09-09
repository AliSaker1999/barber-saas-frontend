import { useCallback, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { fetchCustomerAppointments } from "../../features/appointments/appointmentsSlice";
import { findMyActiveQueue } from "../../features/queue/queueSlice";
import { fetchFavorites } from "../../features/favorites/favoritesSlice";
import { selectTenant } from "../../features/booking/bookingSlice";
import { getSocket } from "../../services/socket";

import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import { Avatar, SectionHeader } from "../../components/ui/Primitives";
import ShopCard from "../../components/ui/ShopCard";
import { QueueStatusBanner } from "../../components/ui/QueueStatusCard";
import { EmptyState, ErrorState, RailSkeleton, Skeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import {
  formatCountdown,
  formatRelativeDay,
  formatTime,
  initialsOf,
  toDate
} from "../../utils/format";
import { appointmentTotals, isActive, isCompleted } from "../../utils/appointmentStatus";
import { haversineDistanceKm } from "../../utils/geo";
import useNow from "../../hooks/useNow";

/*
 * Customer Home — a personal grooming dashboard, not a shop list.
 *
 * The screen answers one question before anything else: is something happening
 * right now? A live queue beats an upcoming booking beats "ready for a cut".
 * Discovery rails come after that, and only the rails that actually have
 * something in them render, so the screen never pads itself out with empty
 * sections (spec §7).
 */

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return "greeting_morning";
  if (hour < 17) return "greeting_afternoon";
  return "greeting_evening";
}

/* ---------------------------------------------------------------------------
   Hero variants
   ------------------------------------------------------------------------- */
function NextAppointmentHero({ appointment, onView }) {
  const { t, locale } = useI18n();
  const { names } = appointmentTotals(appointment);
  const serviceLabel = names.join(" + ");

  return (
    <button
      type="button"
      onClick={onView}
      className="press w-full text-start bg-surface-inverse rounded-card p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-label uppercase text-content-inverse/60">
          {t("next_appointment")}
        </span>
        <span className="text-caption font-semibold text-brand-gold tnum">
          {formatCountdown(appointment.StartTime, t)}
        </span>
      </div>

      <p className="mt-2 text-h1 text-content-inverse truncate">
        {serviceLabel || t("book_appointment")}
      </p>

      <div className="mt-1 flex items-center gap-2 text-body-sm text-content-inverse/75">
        <span className="tnum font-semibold">
          {formatRelativeDay(appointment.StartTime, t, locale)} ·{" "}
          {formatTime(appointment.StartTime, locale)}
        </span>
      </div>

      <div className="mt-3.5 pt-3.5 border-t border-white/10 flex items-center gap-2.5">
        <Avatar
          src={appointment.BarberProfileImage}
          name={appointment.BarberName}
          size={32}
        />
        <span className="flex-1 min-w-0 text-body-sm text-content-inverse/80 truncate">
          {appointment.BarberName}
          {appointment.TenantName ? ` · ${appointment.TenantName}` : ""}
        </span>
        <span className="flex items-center gap-1 text-body-sm font-semibold text-brand-gold flex-shrink-0">
          {t("view_booking")}
          <Icon name="chevron-right" size={16} />
        </span>
      </div>
    </button>
  );
}

function NoPlansHero() {
  const { t } = useI18n();

  return (
    <div className="bg-surface-raised border border-line-subtle rounded-card p-5">
      <span className="inline-flex w-11 h-11 rounded-control bg-brand-gold-soft text-brand-gold-text items-center justify-center">
        <Icon name="scissors" size={22} />
      </span>
      <h2 className="mt-3 text-h1 text-content-primary">{t("ready_for_cut")}</h2>
      <p className="mt-1 text-body-sm text-content-secondary max-w-[34ch]">
        {t("ready_for_cut_sub")}
      </p>
      <div className="mt-4">
        <Button to="/customer/explore" icon="search" size="lg">
          {t("find_a_barber")}
        </Button>
      </div>
    </div>
  );
}

function RebookCard({ appointment, shop, onRebook }) {
  const { t, locale } = useI18n();
  const { names } = appointmentTotals(appointment);

  return (
    <div className="bg-surface-raised border border-line-subtle rounded-card p-3.5 flex items-center gap-3">
      <Avatar src={appointment.BarberProfileImage} name={appointment.BarberName} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-label uppercase text-content-muted">{t("rebook_title")}</p>
        <p className="text-body font-bold text-content-primary truncate">
          {names.join(" + ") || appointment.TenantName}
        </p>
        <p className="text-caption text-content-muted truncate">
          {appointment.BarberName}
          {shop?.Name ? ` · ${shop.Name}` : ""} ·{" "}
          <span className="tnum">{formatRelativeDay(appointment.StartTime, t, locale)}</span>
        </p>
      </div>
      <Button size="sm" onClick={onRebook} className="flex-shrink-0">
        {t("rebook_action")}
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Rails
   ------------------------------------------------------------------------- */
function ShopRail({ title, subtitle, shops, coords, seeAllTo }) {
  const { t } = useI18n();
  if (!shops.length) return null;

  return (
    <section className="mt-7">
      <div className="px-4">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          action={shops.length > 2 ? t("see_all") : null}
          actionTo={seeAllTo}
        />
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-rail px-4 pb-1">
        {shops.map((shop) => (
          <ShopCard key={shop.Id} shop={shop} variant="rail" coords={coords} />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------------- */
export default function Home() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.customerProfile.profile);
  const { tenants, loading: shopsLoading, error: shopsError } = useAppSelector(
    (state) => state.tenants
  );
  const appointments = useAppSelector((state) => state.appointments.items);
  const appointmentsLoading = useAppSelector((state) => state.appointments.loading);
  const activeQueue = useAppSelector((state) => state.queue.activeQueue);
  const favorites = useAppSelector((state) => state.favorites.items);
  const coords = useAppSelector((state) => state.location.coords);
  const unread = useAppSelector(
    (state) => state.notifications.items?.filter((n) => !n.IsRead).length || 0
  );

  /* Ticks once a minute: keeps the hero countdown honest and retires an
     appointment from "next" the moment its start time passes. */
  const now = useNow(60000);

  const load = useCallback(() => {
    dispatch(fetchTenants());
    dispatch(fetchCustomerAppointments());
    dispatch(findMyActiveQueue());
    dispatch(fetchFavorites());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  /* Availability on this screen is only useful while it is true, so a queue or
     booking change anywhere in the shop refreshes it. */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const refreshQueue = () => dispatch(findMyActiveQueue());
    const refreshAppointments = () => dispatch(fetchCustomerAppointments());

    socket.on("queue:update", refreshQueue);
    socket.on("appointments:update", refreshAppointments);

    return () => {
      socket.off("queue:update", refreshQueue);
      socket.off("appointments:update", refreshAppointments);
    };
  }, [dispatch]);

  const firstName = useMemo(() => {
    const full = profile?.FullName || user?.fullName || "";
    return full.trim().split(/\s+/)[0] || "";
  }, [profile?.FullName, user?.fullName]);

  const nextAppointment = useMemo(() => {
    return [...appointments]
      .filter((a) => {
        const date = toDate(a.StartTime);
        return isActive(a) && date && date.getTime() > now;
      })
      .sort((a, b) => toDate(a.StartTime) - toDate(b.StartTime))[0] || null;
  }, [appointments, now]);

  const lastCompleted = useMemo(() => {
    return [...appointments]
      .filter(isCompleted)
      .sort((a, b) => toDate(b.StartTime) - toDate(a.StartTime))[0] || null;
  }, [appointments]);

  const shopsById = useMemo(() => {
    const map = new Map();
    tenants.forEach((shop) => map.set(shop.Id, shop));
    return map;
  }, [tenants]);

  const favoriteShopIds = useMemo(
    () => new Set(favorites.filter((f) => f.TenantId).map((f) => f.TenantId)),
    [favorites]
  );

  /* The neighbourhood of the closest shop — the best available proxy for
     "where the customer is" without a reverse-geocoding dependency. */
  const nearestArea = useMemo(() => {
    if (!coords) return null;

    let best = null;
    let bestKm = Infinity;

    for (const shop of tenants) {
      if (shop.Latitude == null || shop.Longitude == null || !shop.Area) continue;
      const km = haversineDistanceKm(coords, {
        latitude: Number(shop.Latitude),
        longitude: Number(shop.Longitude)
      });
      if (km != null && km < bestKm) {
        bestKm = km;
        best = shop.Area;
      }
    }

    /* Beyond a few kilometres the label stops meaning "near you". */
    return bestKm <= 5 ? best : null;
  }, [coords, tenants]);

  /*
   * Rails are built as candidates then filtered: an empty "Nearby" section is
   * worse than no section, and four full rails is already a long scroll on a
   * small phone.
   */
  const rails = useMemo(() => {
    if (!tenants.length) return [];

    const byWait = (a, b) => (a.MinWaitMinutes ?? 999) - (b.MinWaitMinutes ?? 999);
    const byRating = (a, b) => (b.AverageRating ?? 0) - (a.AverageRating ?? 0);

    const walkInOpen = tenants.filter((s) => s.WalkInAvailable);

    /* "Top rated in Hamra" is only honest if we know where the customer is.
       Without a location fix the heading stays generic rather than naming
       whichever neighbourhood happened to sort first. */
    const area = nearestArea;

    const candidates = [
      {
        key: "available",
        title: t("section_available_now"),
        shops: walkInOpen.slice().sort(byWait).slice(0, 8),
        to: "/customer/explore?filter=walkin"
      },
      {
        key: "quick",
        title: t("section_quick_wait"),
        shops: walkInOpen
          .filter((s) => (s.MinWaitMinutes ?? 999) <= 15)
          .sort(byWait)
          .slice(0, 8),
        to: "/customer/explore?filter=quick"
      },
      {
        key: "favorites",
        title: t("section_favorites"),
        shops: tenants.filter((s) => favoriteShopIds.has(s.Id)).slice(0, 8),
        to: "/customer/favorites"
      },
      {
        key: "toprated",
        title: area ? t("section_top_rated_in", { area }) : t("section_top_rated"),
        shops: tenants
          .filter((s) => (s.AverageRating ?? 0) >= 4 && (!area || s.Area === area))
          .sort(byRating)
          .slice(0, 8),
        to: "/customer/explore?sort=rating"
      },
      {
        key: "open",
        title: t("section_open_now"),
        shops: tenants.filter((s) => s.IsOpenNow).slice(0, 8),
        to: "/customer/explore?filter=open"
      }
    ];

    /* De-duplicate: the same three shops under two headings reads as padding. */
    const used = new Set();
    const chosen = [];

    for (const rail of candidates) {
      const fresh = rail.shops.filter((s) => !used.has(s.Id));
      if (fresh.length < 2) continue;
      fresh.forEach((s) => used.add(s.Id));
      chosen.push({ ...rail, shops: fresh });
      if (chosen.length === 3) break;
    }

    return chosen;
  }, [tenants, favoriteShopIds, nearestArea, t]);

  const remainingShops = useMemo(() => {
    const railIds = new Set(rails.flatMap((r) => r.shops.map((s) => s.Id)));
    return tenants.filter((s) => !railIds.has(s.Id));
  }, [rails, tenants]);

  const handleRebook = () => {
    if (!lastCompleted) return;
    dispatch(selectTenant(lastCompleted.TenantId));
    navigate(
      `/customer/book?shop=${lastCompleted.TenantId}` +
        `&barber=${lastCompleted.BarberId}` +
        `&services=${(lastCompleted.services || []).map((s) => s.id).join(",")}`
    );
  };

  const handleTrackQueue = () => {
    if (activeQueue?.tenantId) dispatch(selectTenant(activeQueue.tenantId));
    navigate("/customer/queue");
  };

  const isFirstLoad = shopsLoading && !tenants.length;

  return (
    <div className="pb-4">
      {/* ---- header ---- */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-1">
        <div className="flex items-center gap-3">
          <Link to="/customer/profile" className="flex-shrink-0" aria-label={t("profile_title")}>
            <Avatar src={profile?.ProfileImage} name={profile?.FullName || user?.fullName} size={44} />
          </Link>

          <div className="flex-1 min-w-0">
            <p className="text-caption text-content-muted">{t(greetingKey())}</p>
            <p className="text-h2 text-content-primary truncate">
              {firstName || initialsOf(user?.fullName)}
            </p>
          </div>

          <IconButton
            to="/customer/notifications"
            icon="bell"
            label={t("notifications")}
            badge={unread > 0 ? unread : null}
          />
        </div>

        {nearestArea ? (
          <p className="mt-2 flex items-center gap-1 text-caption text-content-muted">
            <Icon name="pin" size={13} />
            {nearestArea}
          </p>
        ) : null}
      </header>

      {/* ---- hero ---- */}
      <div className="px-4 mt-4">
        {activeQueue ? (
          <QueueStatusBanner queue={activeQueue} onTrack={handleTrackQueue} />
        ) : appointmentsLoading && !appointments.length ? (
          <Skeleton className="h-40 w-full" rounded="rounded-card" />
        ) : nextAppointment ? (
          <NextAppointmentHero
            appointment={nextAppointment}
            onView={() => navigate(`/customer/bookings?id=${nextAppointment.Id}`)}
          />
        ) : (
          <NoPlansHero />
        )}
      </div>

      {/* ---- rebook ---- */}
      {!activeQueue && !nextAppointment && lastCompleted ? (
        <div className="px-4 mt-3">
          <RebookCard
            appointment={lastCompleted}
            shop={shopsById.get(lastCompleted.TenantId)}
            onRebook={handleRebook}
          />
        </div>
      ) : null}

      {/* ---- discovery ---- */}
      {isFirstLoad ? (
        <section className="mt-7">
          <div className="px-4 mb-3">
            <Skeleton className="h-5 w-40" rounded="rounded-pill" />
          </div>
          <div className="px-4">
            <RailSkeleton />
          </div>
        </section>
      ) : shopsError ? (
        <div className="px-4 mt-7">
          <ErrorState onRetry={load} />
        </div>
      ) : !tenants.length ? (
        <EmptyState
          icon="scissors"
          title={t("home_empty_title")}
          description={t("home_empty_body")}
          className="mt-6"
        />
      ) : (
        <>
          {rails.map((rail) => (
            <ShopRail
              key={rail.key}
              title={rail.title}
              shops={rail.shops}
              coords={coords}
              seeAllTo={rail.to}
            />
          ))}

          {remainingShops.length ? (
            <section className="mt-7 px-4">
              <SectionHeader
                title={t("section_all_shops")}
                action={remainingShops.length > 4 ? t("see_all") : null}
                actionTo="/customer/explore"
              />
              <div className="space-y-3">
                {remainingShops.slice(0, 4).map((shop) => (
                  <ShopCard key={shop.Id} shop={shop} coords={coords} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
