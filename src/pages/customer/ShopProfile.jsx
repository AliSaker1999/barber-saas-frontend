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
import Button, { IconButton } from "../../components/ui/Button";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import ServiceCard from "../../components/ui/ServiceCard";
import BarberCard from "../../components/ui/BarberCard";
import FavoriteButton from "../../components/FavoriteButton";
import ShopHero from "../../components/shop/ShopHero";
import ShopIdentity from "../../components/shop/ShopIdentity";
import {
  ShopPromotion,
  ShopServices,
  ShopTeam,
  ShopGallery,
  ShopReviews,
  ShopHours,
  ShopInfoCard,
  RatingBreakdown,
  ReviewItem
} from "../../components/shop/ShopSections";
import { EmptyState, ErrorState, ListSkeleton, Skeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { formatMoney, formatWaitRange } from "../../utils/format";
import { mergeBarbersWithQueueStats } from "../../utils/shopAvailability";

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
  const barbers = useMemo(
    () => mergeBarbersWithQueueStats(details.barbers, queueStats),
    [details.barbers, queueStats]
  );

  const walkInBarbers = useMemo(
    () => barbers.filter((b) => b.isAcceptingWalkIns),
    [barbers]
  );

  const shortestWait = useMemo(() => {
    const waits = walkInBarbers.map((b) => b.waitMinutes ?? 0);
    return waits.length ? Math.min(...waits) : null;
  }, [walkInBarbers]);

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

  return (
    <div className="pb-28">
      <ShopHero
        shop={shop}
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

      <ShopIdentity
        shop={shop}
        reviews={details.reviews}
        onOpenReviews={() => setAllReviewsOpen(true)}
      />

      <ShopPromotion promotion={details.promotions[0]} />

      <ShopServices
        services={activeServices}
        currency={currency}
        loading={details.loading}
        error={details.error}
        onRetry={details.reload}
      />

      <ShopTeam
        barbers={barbers}
        onSelectBarber={(barber) => {
          dispatch(selectTenant(tenantId));
          dispatch(selectBarber(barber.barberId));
          navigate(`/customer/book?shop=${tenantId}&barber=${barber.barberId}`);
        }}
      />

      <ShopGallery images={details.gallery} />

      <ShopReviews
        reviews={details.reviews}
        error={details.reviewsError}
        onRetry={details.reload}
        onSeeAll={() => setAllReviewsOpen(true)}
      />

      <ShopInfoCard
        shop={shop}
        currency={currency}
        onOpenHours={() => setHoursOpen(true)}
      />

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
        <ShopHours hours={details.hours} shop={shop} />
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

    </div>
  );
}
