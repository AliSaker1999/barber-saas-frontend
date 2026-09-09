import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { fetchQueueStats, joinQueue, findMyActiveQueue } from "../../features/queue/queueSlice";
import { selectTenant, selectBarber } from "../../features/booking/bookingSlice";
import api from "../../services/api";
import { getSocket } from "../../services/socket";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import ServiceCard from "../../components/ui/ServiceCard";
import BarberCard from "../../components/ui/BarberCard";
import FavoriteButton from "../../components/FavoriteButton";
import {
  Avatar,
  Photo,
  Pill,
  Rating,
  SectionHeader,
  LiveDot
} from "../../components/ui/Primitives";
import { shopAvailability, trimSeconds } from "../../utils/shopAvailability";
import {
  EmptyState,
  ErrorState,
  InlineError,
  ListSkeleton,
  Skeleton
} from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { formatMoney, formatWaitRange, toDate } from "../../utils/format";
import { toHHMM } from "../../utils/time";
import { shopWhatsappHref, telHref } from "../../config/support";

/*
 * Shop profile — the screen that has to sell the shop and then get out of the
 * way (spec §9).
 *
 * Structure: hero photograph → identity and rating → the two actions →
 * services → team → portfolio → reviews → the practical details. The two
 * actions are also pinned to the bottom of the viewport, because on a phone
 * they scroll away exactly when the customer has decided to use them.
 *
 * Everything below the hero loads in parallel and degrades section by section:
 * a failed gallery request must not take the price list down with it.
 */

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const EMPTY_DETAILS = {
  tenantId: null,
  loading: true,
  error: null,
  services: [],
  barbers: [],
  hours: [],
  gallery: [],
  reviews: null,
  promotions: [],
  galleryError: false,
  reviewsError: false
};

/*
 * Fetches everything below the hero in one parallel pass.
 *
 * allSettled, not all: the price list and the team are essential; the
 * portfolio, reviews and promotions are not. One failing endpoint must not
 * blank a screen the customer is about to book from.
 *
 * A plain module-level function with no React state in it, so the hook below
 * can own cancellation.
 */
async function fetchShopDetails(tenantId) {
  const [services, barbers, hours, gallery, reviews, promotions] = await Promise.allSettled([
    api.get(`/services/tenant/${tenantId}`),
    api.get(`/barbers/tenants/${tenantId}/barbers`),
    api.get(`/tenants/${tenantId}/hours`),
    api.get(`/tenants/${tenantId}/gallery`),
    api.get(`/tenants/${tenantId}/reviews`),
    api.get(`/promotions/tenant/${tenantId}`)
  ]);

  const essentialFailed = services.status === "rejected" && barbers.status === "rejected";

  return {
    tenantId,
    loading: false,
    error: essentialFailed
      ? services.reason?.friendlyMessage || services.reason?.message || "load-failed"
      : null,
    services: services.value?.data?.data || [],
    barbers: barbers.value?.data?.data || [],
    hours: hours.value?.data?.data || [],
    gallery: gallery.value?.data?.data || [],
    reviews: reviews.value?.data?.data || null,
    promotions: promotions.value?.data?.data || [],
    galleryError: gallery.status === "rejected",
    reviewsError: reviews.status === "rejected"
  };
}

function useShopDetails(tenantId) {
  const [state, setState] = useState(EMPTY_DETAILS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!tenantId) return undefined;

    /* Navigating between two shops quickly must not let the slower response
       overwrite the newer one. */
    let cancelled = false;

    fetchShopDetails(tenantId).then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [tenantId, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /*
   * Loading is derived. State carries the shop it belongs to, so moving from
   * one shop to another reads as "loading" immediately rather than briefly
   * showing the previous shop's price list.
   */
  const isCurrent = state.tenantId === tenantId;
  const view = isCurrent ? state : EMPTY_DETAILS;

  return { ...view, loading: !isCurrent || state.loading, reload };
}

/* ---------------------------------------------------------------------------
   Sections
   ------------------------------------------------------------------------- */
function RatingBreakdown({ reviews }) {
  const { t } = useI18n();
  const total = reviews?.reviewsCount || 0;
  if (!total) return null;

  return (
    <div className="flex items-center gap-5">
      <div className="text-center flex-shrink-0">
        <p className="text-display text-content-primary tnum leading-none">
          {reviews.averageRating?.toFixed(1)}
        </p>
        <Rating value={reviews.averageRating} size={13} className="mt-1.5 justify-center" />
        <p className="mt-1 text-caption text-content-muted tnum">
          {t("reviews_of", { n: total })}
        </p>
      </div>

      <div className="flex-1 space-y-1" aria-hidden="true">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = reviews.breakdown?.[star] || 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="w-3 text-caption text-content-muted tnum">{star}</span>
              <span className="flex-1 h-1.5 rounded-pill bg-surface-sunken overflow-hidden">
                <span
                  className="block h-full rounded-pill bg-brand-gold"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-7 text-end text-caption text-content-muted tnum">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewItem({ review }) {
  const { locale } = useI18n();
  const date = toDate(review.createdAt);

  return (
    <li className="py-3.5 flex gap-3">
      <Avatar src={review.customerProfileImage} name={review.customerName} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-body-sm font-bold text-content-primary truncate">
            {review.customerName}
          </p>
          {date ? (
            <span className="text-caption text-content-muted flex-shrink-0 tnum">
              {date.toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", {
                month: "short",
                year: "numeric"
              })}
            </span>
          ) : null}
        </div>
        <Rating value={review.rating} size={12} className="mt-0.5" />
        {review.comment ? (
          <p className="mt-1.5 text-body-sm text-content-secondary">{review.comment}</p>
        ) : null}
        {review.barberName ? (
          <p className="mt-1 text-caption text-content-muted truncate">{review.barberName}</p>
        ) : null}
      </div>
    </li>
  );
}

function OpeningHours({ hours, shop }) {
  const { t } = useI18n();

  if (!hours.length) {
    return <p className="text-body-sm text-content-muted">{t("no_hours_set")}</p>;
  }

  const byDay = new Map(hours.map((row) => [Number(row.DayOfWeek), row]));
  const todayIndex = new Date().getDay();

  return (
    <ul className="space-y-1.5">
      {DAY_ORDER.map((dayIndex) => {
        const row = byDay.get(dayIndex);
        const isToday = dayIndex === todayIndex;
        const closed = !row || row.IsClosed;

        return (
          <li
            key={dayIndex}
            className={`flex items-center justify-between gap-3 text-body-sm ${
              isToday ? "font-bold text-content-primary" : "text-content-secondary"
            }`}
          >
            <span className="flex items-center gap-2">
              {t(DAY_KEYS[dayIndex])}
              {isToday && shop?.IsOpenNow ? <LiveDot /> : null}
            </span>
            <span className="tnum">
              {closed
                ? t("closed_now")
                : `${toHHMM(row.OpenTime, "—")} – ${toHHMM(row.CloseTime, "—")}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------------------
   Screen
   ------------------------------------------------------------------------- */
export default function ShopProfile() {
  const { tenantId } = useParams();
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const shops = useAppSelector((state) => state.tenants.tenants);
  const shopsLoading = useAppSelector((state) => state.tenants.loading);
  const queueStats = useAppSelector((state) => state.queue.stats);
  const activeQueue = useAppSelector((state) => state.queue.activeQueue);
  const user = useAppSelector((state) => state.auth.user);

  const shop = useMemo(() => shops.find((s) => s.Id === tenantId) || null, [shops, tenantId]);
  const details = useShopDetails(tenantId);

  const [galleryIndex, setGalleryIndex] = useState(null);
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInBarberId, setWalkInBarberId] = useState(null);
  const [walkInServiceIds, setWalkInServiceIds] = useState([]);
  const [joining, setJoining] = useState(false);
  const [switchQueueOpen, setSwitchQueueOpen] = useState(false);

  useEffect(() => {
    if (!shops.length) dispatch(fetchTenants());
  }, [dispatch, shops.length]);

  useEffect(() => {
    if (tenantId) dispatch(fetchQueueStats(tenantId));
  }, [dispatch, tenantId]);

  /* Walk-in waits on this screen are a promise to the customer, so they track
     the shop's live queue rather than the figure fetched on mount. */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !tenantId) return;

    const refresh = () => dispatch(fetchQueueStats(tenantId));
    socket.on("queue:update", refresh);
    return () => socket.off("queue:update", refresh);
  }, [dispatch, tenantId]);

  const currency = shop?.Currency || "USD";
  const activeServices = useMemo(
    () => details.services.filter((s) => s.IsActive !== false),
    [details.services]
  );

  /* Merge the roster with live queue stats so each barber shows a real wait. */
  const barbers = useMemo(() => {
    const statsById = new Map((queueStats || []).map((s) => [s.barberId, s]));

    return details.barbers.map((barber) => {
      const stats = statsById.get(barber.barberId);
      return {
        ...barber,
        waitMinutes: stats?.estimatedWaitMinutes ?? null,
        isAcceptingWalkIns: Boolean(stats?.isAcceptingWalkIns && stats?.isWithinHours),
        isAvailable: stats ? stats.isWorkingToday : barber.isAvailable
      };
    });
  }, [details.barbers, queueStats]);

  const walkInBarbers = useMemo(
    () => barbers.filter((b) => b.isAcceptingWalkIns),
    [barbers]
  );

  const shortestWait = useMemo(() => {
    const waits = walkInBarbers.map((b) => b.waitMinutes ?? 0);
    return waits.length ? Math.min(...waits) : null;
  }, [walkInBarbers]);

  const availability = shop ? shopAvailability(shop, t) : null;

  const address = useMemo(() => {
    if (!shop) return null;
    return [shop.Street, shop.Building, shop.Area, shop.City].filter(Boolean).join(", ");
  }, [shop]);

  const mapsHref = useMemo(() => {
    if (!shop) return null;
    if (shop.GoogleMapLink) return shop.GoogleMapLink;
    if (shop.Latitude != null && shop.Longitude != null) {
      return `https://www.google.com/maps/search/?api=1&query=${shop.Latitude},${shop.Longitude}`;
    }
    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${shop.Name} ${address}`
      )}`;
    }
    return null;
  }, [shop, address]);

  const startBooking = () => {
    dispatch(selectTenant(tenantId));
    navigate(`/customer/book?shop=${tenantId}`);
  };

  const openWalkIn = () => {
    if (activeQueue && activeQueue.tenantId !== tenantId) {
      setSwitchQueueOpen(true);
      return;
    }
    if (activeQueue?.tenantId === tenantId) {
      navigate("/customer/queue");
      return;
    }

    setWalkInBarberId(walkInBarbers[0]?.barberId || null);
    setWalkInServiceIds(activeServices.length === 1 ? [activeServices[0].Id] : []);
    setWalkInOpen(true);
  };

  const confirmWalkIn = async () => {
    if (!walkInBarberId || !walkInServiceIds.length) return;

    if (!user?.isPhoneVerified) {
      setWalkInOpen(false);
      toast.error(t("verify_phone_title"));
      navigate("/customer/profile?verify=1");
      return;
    }

    setJoining(true);
    try {
      await dispatch(
        joinQueue({ tenantId, barberId: walkInBarberId, serviceIds: walkInServiceIds })
      ).unwrap();

      dispatch(selectTenant(tenantId));
      await dispatch(findMyActiveQueue());
      setWalkInOpen(false);
      toast.success(t("queue_joined_toast"));
      navigate("/customer/queue");
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setJoining(false);
    }
  };

  const share = async () => {
    const url = shop?.Slug
      ? `${window.location.origin}/book/${shop.Slug}`
      : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: shop?.Name, url });
        return;
      } catch {
        /* Cancelled by the user — fall through to copying. */
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("link_copied"));
    } catch {
      toast.error(t("error_generic"));
    }
  };

  /* ---- loading / not found ---- */
  if (!shop) {
    if (shopsLoading) {
      return (
        <div>
          <TopBar back />
          <div className="px-4 space-y-4">
            <Skeleton className="w-full h-52" rounded="rounded-card" />
            <Skeleton className="h-6 w-2/3" rounded="rounded-pill" />
            <ListSkeleton count={3} />
          </div>
        </div>
      );
    }

    return (
      <div>
        <TopBar back title={t("shop")} />
        <div className="px-4 pt-6">
          <ErrorState
            title={t("error_not_found")}
            message={t("no_shops_found")}
            onRetry={() => dispatch(fetchTenants())}
          />
        </div>
      </div>
    );
  }

  const galleryImages = details.gallery;

  return (
    <div className="pb-28">
      {/* ---- hero ---- */}
      <div className="relative">
        <Photo
          src={shop.CoverImageUrl || shop.LogoUrl}
          alt={shop.Name}
          ratio="4/3"
          rounded="rounded-none"
          priority
          className="max-h-[46vh]"
          overlay
        />

        <div className="absolute inset-x-0 top-0">
          <TopBar
            back
            transparent
            sticky={false}
            actions={
              <>
                <span className="bg-surface-raised/90 backdrop-blur rounded-pill shadow-sm">
                  <FavoriteButton type="SHOP" targetId={shop.Id} onPhoto />
                </span>
                <span className="bg-surface-raised/90 backdrop-blur rounded-control shadow-sm ms-1">
                  <IconButton icon="share" label={t("share_shop_action")} onClick={share} />
                </span>
              </>
            }
          />
        </div>

        {/* Availability is legible over the photograph, before any scrolling. */}
        {availability ? (
          <div className="absolute bottom-3 start-4 end-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-pill bg-surface-raised/95 backdrop-blur shadow-sm">
              {shop.WalkInAvailable ? (
                <LiveDot />
              ) : (
                <Icon name="clock" size={14} className="text-content-muted" />
              )}
              <span className="text-body-sm font-bold text-content-primary tnum">
                {availability.label}
              </span>
            </span>
            {shop.WalkInAvailable && shop.BarbersOnDutyNow ? (
              <span className="text-caption font-semibold text-white/90 drop-shadow">
                {t("barbers_on_now", { n: shop.BarbersOnDutyNow })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ---- identity ---- */}
      <header className="px-4 pt-4">
        <div className="flex items-start gap-2">
          <h1 className="flex-1 text-display text-content-primary">{shop.Name}</h1>
          {shop.IsVerified ? (
            <span className="mt-1.5 text-brand-gold-text flex-shrink-0">
              <Icon name="verified" size={20} title={t("verified_shop")} />
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap text-caption text-content-muted">
          {details.reviews?.averageRating ? (
            <button
              type="button"
              onClick={() => setAllReviewsOpen(true)}
              className="inline-flex items-center gap-1"
            >
              <Rating value={details.reviews.averageRating} compact />
              <span className="underline decoration-line-strong">
                {t("reviews_of", { n: details.reviews.reviewsCount })}
              </span>
            </button>
          ) : (
            <span>{t("new_shop")}</span>
          )}

          {shop.Area || shop.City ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{shop.Area || shop.City}</span>
            </>
          ) : null}
        </div>

        {/* Contact and directions — one row, icon buttons with labels. */}
        <div className="mt-3.5 flex gap-2">
          {mapsHref ? (
            <Button variant="secondary" size="sm" icon="navigate" href={mapsHref} target="_blank" rel="noreferrer">
              {t("get_directions")}
            </Button>
          ) : null}
          {telHref(shop.Phone) ? (
            <Button variant="secondary" size="sm" icon="phone" href={telHref(shop.Phone)}>
              {t("call")}
            </Button>
          ) : null}
          {shopWhatsappHref(shop.WhatsappNumber) ? (
            <Button
              variant="secondary"
              size="sm"
              icon="whatsapp"
              href={shopWhatsappHref(shop.WhatsappNumber)}
              target="_blank"
              rel="noreferrer"
            >
              {t("whatsapp_support")}
            </Button>
          ) : null}
        </div>
      </header>

      {/* ---- promotions ---- */}
      {details.promotions.length ? (
        <section className="px-4 mt-5">
          <div className="rounded-card bg-brand-gold-soft border border-line-subtle p-3.5 flex items-start gap-3">
            <span className="w-9 h-9 rounded-control bg-brand-gold text-content-on-gold flex items-center justify-center flex-shrink-0">
              <Icon name="tag" size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-body font-bold text-content-primary truncate">
                {details.promotions[0].Title || details.promotions[0].Name || t("special_offers")}
              </p>
              {details.promotions[0].Description ? (
                <p className="text-caption text-content-secondary">
                  {details.promotions[0].Description}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---- services ---- */}
      <section className="px-4 mt-7">
        <SectionHeader title={t("shop_services")} />

        {details.loading ? (
          <ListSkeleton count={3} height="h-[68px]" />
        ) : details.error ? (
          <InlineError onRetry={details.reload} />
        ) : !activeServices.length ? (
          <EmptyState
            icon="scissors"
            title={t("no_services_title")}
            description={t("no_services_body")}
          />
        ) : (
          <div className="space-y-2.5">
            {activeServices.map((service) => (
              <ServiceCard key={service.Id} service={service} currency={currency} />
            ))}
          </div>
        )}
      </section>

      {/* ---- team ---- */}
      {barbers.length ? (
        <section className="mt-7">
          <div className="px-4">
            <SectionHeader title={t("shop_team")} />
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-rail px-4 pb-1">
            {barbers.map((barber) => (
              <BarberCard
                key={barber.barberId}
                barber={barber}
                onSelect={() => {
                  dispatch(selectTenant(tenantId));
                  dispatch(selectBarber(barber.barberId));
                  navigate(`/customer/book?shop=${tenantId}&barber=${barber.barberId}`);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- portfolio ---- */}
      {galleryImages.length ? (
        <section className="px-4 mt-7">
          <SectionHeader title={t("shop_gallery")} />
          <div className="grid grid-cols-3 gap-1.5">
            {galleryImages.slice(0, 9).map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setGalleryIndex(index)}
                className="press block"
                aria-label={image.caption || t("shop_gallery")}
              >
                <Photo
                  src={image.imageUrl}
                  alt={image.caption || ""}
                  ratio="1/1"
                  rounded="rounded-control"
                />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ---- reviews ---- */}
      <section className="px-4 mt-7">
        <SectionHeader
          title={t("shop_reviews")}
          action={details.reviews?.reviews?.length > 3 ? t("see_all_reviews") : null}
          onAction={() => setAllReviewsOpen(true)}
        />

        {details.reviewsError ? (
          <InlineError onRetry={details.reload} />
        ) : !details.reviews?.reviewsCount ? (
          <EmptyState
            icon="star"
            title={t("no_reviews_title")}
            description={t("no_reviews_body")}
          />
        ) : (
          <div className="bg-surface-raised border border-line-subtle rounded-card p-4">
            <RatingBreakdown reviews={details.reviews} />
            <ul className="mt-2 divide-y divide-line-subtle">
              {details.reviews.reviews.slice(0, 3).map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ---- practical details ---- */}
      <section className="px-4 mt-7">
        <SectionHeader title={t("shop_info")} />

        <div className="bg-surface-raised border border-line-subtle rounded-card divide-y divide-line-subtle">
          <button
            type="button"
            onClick={() => setHoursOpen(true)}
            className="w-full flex items-center gap-3 p-4 text-start"
          >
            <Icon name="clock" size={18} className="text-content-muted flex-shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-body font-medium text-content-primary">
                {t("shop_hours")}
              </span>
              <span className="block text-caption text-content-muted tnum">
                {shop.IsOpenNow && shop.ClosesAt
                  ? t("until_time", { time: trimSeconds(shop.ClosesAt) })
                  : shop.IsClosedToday
                  ? t("closed_today")
                  : shop.OpensAt
                  ? t("opens_at", { time: trimSeconds(shop.OpensAt) })
                  : t("no_hours_set")}
              </span>
            </span>
            <Icon name="chevron-right" size={18} className="text-content-muted flex-shrink-0" />
          </button>

          {address ? (
            <div className="flex items-start gap-3 p-4">
              <Icon name="pin" size={18} className="text-content-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-content-primary">{t("shop_location")}</p>
                <p className="text-caption text-content-secondary">{address}</p>
              </div>
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-caption font-semibold text-brand-gold-text flex-shrink-0 py-1"
                >
                  {t("get_directions")}
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-start gap-3 p-4">
            <Icon name="wallet" size={18} className="text-content-muted flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-content-primary">{t("shop_payment")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {/* Cash is always accepted; the rest reflect the shop's toggles. */}
                <Pill>{t("pay_cash_note")}</Pill>
                {shop.IsWhishPaymentEnabled ? <Pill>{t("pay_whish_note")}</Pill> : null}
                {shop.IsCreditCardPaymentEnabled ? <Pill>{t("pay_card_note")}</Pill> : null}
              </div>
            </div>
          </div>

          {shop.CancellationPolicyHours || shop.DepositAmount ? (
            <div className="flex items-start gap-3 p-4">
              <Icon name="info" size={18} className="text-content-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-body font-medium text-content-primary">{t("shop_policies")}</p>
                {shop.CancellationPolicyHours ? (
                  <p className="text-caption text-content-secondary">
                    {t("cancellation_policy", { hours: shop.CancellationPolicyHours })}
                  </p>
                ) : null}
                {shop.DepositAmount ? (
                  <p className="text-caption text-content-secondary">
                    {t("deposit_policy", {
                      amount: formatMoney(shop.DepositAmount, currency)
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ---- sticky actions ---- */}
      <div
        className="fixed inset-x-0 z-40 px-4 pt-3 pb-3 bg-surface-base/95 backdrop-blur-lg border-t border-line-subtle
                   bottom-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))] lg:bottom-0"
      >
        <div className="max-w-6xl mx-auto flex gap-2.5">
          <Button block size="lg" icon="calendar" onClick={startBooking}>
            {t("book_appointment_action")}
          </Button>

          {walkInBarbers.length ? (
            <Button block size="lg" variant="secondary" icon="clock" onClick={openWalkIn}>
              <span className="flex flex-col items-center leading-tight">
                <span>{t("join_queue_action")}</span>
                {shortestWait != null ? (
                  <span className="text-[10.5px] font-semibold text-content-muted tnum">
                    {formatWaitRange(shortestWait, t)}
                  </span>
                ) : null}
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* ---- sheets ---- */}
      <BottomSheet open={hoursOpen} onClose={() => setHoursOpen(false)} title={t("shop_hours")}>
        <OpeningHours hours={details.hours} shop={shop} />
      </BottomSheet>

      <BottomSheet
        open={allReviewsOpen}
        onClose={() => setAllReviewsOpen(false)}
        title={t("shop_reviews")}
      >
        {details.reviews?.reviewsCount ? (
          <>
            <RatingBreakdown reviews={details.reviews} />
            <ul className="mt-3 divide-y divide-line-subtle">
              {details.reviews.reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon="star" title={t("no_reviews_title")} description={t("no_reviews_body")} />
        )}
      </BottomSheet>

      {/* Walk-in: barber + service in one sheet, so joining a queue is two taps
          rather than a three-screen flow. */}
      <BottomSheet
        open={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        title={t("join_queue_action")}
        subtitle={shop.Name}
        footer={
          <Button
            block
            size="lg"
            loading={joining}
            disabled={!walkInBarberId || !walkInServiceIds.length}
            onClick={confirmWalkIn}
          >
            {t("join_queue_action")}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-label uppercase text-content-muted mb-2">{t("step_barber")}</h3>
            <div className="space-y-2">
              {walkInBarbers.map((barber) => (
                <BarberCard
                  key={barber.barberId}
                  barber={barber}
                  variant="selectable"
                  selected={walkInBarberId === barber.barberId}
                  onSelect={() => setWalkInBarberId(barber.barberId)}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-label uppercase text-content-muted mb-2">{t("step_service")}</h3>
            <div className="space-y-2">
              {activeServices
                .filter((service) => {
                  const barber = walkInBarbers.find((b) => b.barberId === walkInBarberId);
                  return !barber?.serviceIds?.length || barber.serviceIds.includes(service.Id);
                })
                .map((service) => (
                  <ServiceCard
                    key={service.Id}
                    service={service}
                    currency={currency}
                    selectable
                    selected={walkInServiceIds.includes(service.Id)}
                    onSelect={() =>
                      setWalkInServiceIds((prev) =>
                        prev.includes(service.Id)
                          ? prev.filter((id) => id !== service.Id)
                          : [...prev, service.Id]
                      )
                    }
                  />
                ))}
            </div>
          </div>

          {walkInServiceIds.length ? (
            <p className="text-body-sm text-content-secondary tnum">
              {t("total")}:{" "}
              <span className="font-bold text-content-primary">
                {formatMoney(
                  activeServices
                    .filter((s) => walkInServiceIds.includes(s.Id))
                    .reduce((sum, s) => sum + Number(s.Price || 0), 0),
                  currency
                )}
              </span>
            </p>
          ) : null}
        </div>
      </BottomSheet>

      {/* A customer can only hold one place at a time — say so plainly rather
          than failing the join with a server error. */}
      <ConfirmSheet
        open={switchQueueOpen}
        onClose={() => setSwitchQueueOpen(false)}
        onConfirm={() => {
          setSwitchQueueOpen(false);
          navigate("/customer/queue");
        }}
        destructive={false}
        title={t("in_line_at") + " " + (activeQueue?.tenantName || "")}
        message={t("leave_queue_message")}
        confirmLabel={t("track_queue")}
        cancelLabel={t("close")}
      />

      {/* ---- lightbox ---- */}
      {galleryIndex != null && galleryImages[galleryIndex] ? (
        <div
          className="fixed inset-0 z-[320] flex items-center justify-center animate-fade-in"
          style={{ background: "var(--scrim)" }}
          role="dialog"
          aria-modal="true"
          onClick={() => setGalleryIndex(null)}
        >
          <button
            type="button"
            onClick={() => setGalleryIndex(null)}
            aria-label={t("close")}
            className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] end-3 tap-target rounded-pill
                       bg-surface-raised/90 text-content-primary flex items-center justify-center"
          >
            <Icon name="x" size={22} />
          </button>

          <div className="w-full px-4" onClick={(event) => event.stopPropagation()}>
            <img
              src={galleryImages[galleryIndex].imageUrl}
              alt={galleryImages[galleryIndex].caption || ""}
              className="w-full max-h-[72vh] object-contain rounded-card"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-body-sm text-white/90 truncate">
                {galleryImages[galleryIndex].caption || galleryImages[galleryIndex].barberName}
              </p>
              <span className="text-caption text-white/70 tnum flex-shrink-0">
                {galleryIndex + 1} / {galleryImages.length}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                block
                icon="chevron-left"
                disabled={galleryIndex === 0}
                onClick={() => setGalleryIndex((i) => Math.max(0, i - 1))}
              >
                {t("back")}
              </Button>
              <Button
                variant="secondary"
                block
                iconEnd="chevron-right"
                disabled={galleryIndex === galleryImages.length - 1}
                onClick={() =>
                  setGalleryIndex((i) => Math.min(galleryImages.length - 1, i + 1))
                }
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
