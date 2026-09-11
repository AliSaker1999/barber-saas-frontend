import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchTenant,
  fetchServices,
  fetchBarbers,
  fetchQueueStats,
  resetPublicBooking
} from "../../features/publicBooking/publicBookingSlice";
import publicApi, { setPublicAuthToken } from "../../services/publicApi";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import BottomSheet from "../../components/ui/BottomSheet";
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
import { formatWaitRange } from "../../utils/format";
import { mergeBarbersWithQueueStats } from "../../utils/shopAvailability";
import { captureAcquisitionSource } from "../../utils/acquisition";
import { loadGuestSession, getGuestQueue } from "../../utils/guestSession";
import { publicBookingUrl } from "../../utils/shopLinks";

/*
 * The public shop page — what a QR scan, an Instagram bio tap or a WhatsApp
 * share actually opens.
 *
 * This is the first thing most customers ever see of Ajmal, so it carries the
 * same content as the in-app profile rather than a stripped-down "booking
 * form": the photography, the live wait, the rating and reviews, the price
 * list, the hours and the policies. Every section below the hero comes from
 * `components/shop/*`, shared verbatim with `pages/customer/ShopProfile`, so
 * the two can't drift apart.
 *
 * It deliberately does NOT ask anyone to sign in. Choosing happens here;
 * identifying happens at the end of /reserve, after the customer has decided.
 */

/* How often the walk-in wait is refreshed while someone reads the page. The
   public flow has no socket, and a wait that is minutes stale is a broken
   promise on the one screen where the number is the product. */
const STATS_POLL_MS = 60000;

/*
 * Everything below the hero, fetched in parallel.
 *
 * allSettled because the sections are not equally important: the price list
 * and the team are why the page exists, while the gallery, reviews and
 * promotions are decoration. One failing endpoint must degrade its own
 * section, not the page.
 */
async function fetchPublicShopDetails(slug) {
  const [hours, gallery, reviews, promotions] = await Promise.allSettled([
    publicApi.get(`/public/tenants/${slug}/hours`),
    publicApi.get(`/public/tenants/${slug}/gallery`),
    publicApi.get(`/public/tenants/${slug}/reviews`),
    publicApi.get(`/public/tenants/${slug}/promotions`)
  ]);

  return {
    slug,
    loading: false,
    hours: hours.value?.data?.data || [],
    gallery: gallery.value?.data?.data || [],
    reviews: reviews.value?.data?.data || null,
    promotions: promotions.value?.data?.data || [],
    reviewsError: reviews.status === "rejected"
  };
}

const EMPTY_DETAILS = {
  slug: null,
  loading: true,
  hours: [],
  gallery: [],
  reviews: null,
  promotions: [],
  reviewsError: false
};

function usePublicShopDetails(slug) {
  const [state, setState] = useState(EMPTY_DETAILS);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!slug) return undefined;

    /* A visitor tapping between two shops quickly must not have the slower
       response overwrite the newer one. */
    let cancelled = false;

    fetchPublicShopDetails(slug).then((next) => {
      if (!cancelled) setState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  /* Loading is derived from which shop the state belongs to, so navigating
     between shops reads as "loading" immediately instead of briefly showing
     the previous shop's reviews. */
  const isCurrent = state.slug === slug;
  return { ...(isCurrent ? state : EMPTY_DETAILS), loading: !isCurrent || state.loading, reload };
}

export default function PublicShop() {
  const { tenantSlug } = useParams();
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenant: shop,
    tenantLoading,
    tenantError,
    services,
    servicesLoading,
    servicesError,
    barbers,
    queueStats
  } = useAppSelector((state) => state.publicBooking);

  const details = usePublicShopDetails(tenantSlug);

  const [hoursOpen, setHoursOpen] = useState(false);
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);

  /* A guest who already joined a queue from this tab gets taken back to it
     rather than being offered the line they are standing in. */
  const guestQueue = useMemo(() => getGuestQueue(), []);

  useEffect(() => {
    /* Record which of the shop's channels this visit came from before any
       navigation drops the ?src= tag from the URL. */
    captureAcquisitionSource();

    /* Restore a guest token from earlier in this tab so the reserve flow and
       the tracker can resume without another round of OTP. */
    const session = loadGuestSession();
    if (session?.token) setPublicAuthToken(session.token);

    dispatch(resetPublicBooking());
    dispatch(fetchTenant(tenantSlug));
    dispatch(fetchServices(tenantSlug));
    dispatch(fetchBarbers(tenantSlug));
    dispatch(fetchQueueStats(tenantSlug));
  }, [dispatch, tenantSlug]);

  useEffect(() => {
    const timer = setInterval(() => dispatch(fetchQueueStats(tenantSlug)), STATS_POLL_MS);
    return () => clearInterval(timer);
  }, [dispatch, tenantSlug]);

  const currency = shop?.Currency || "USD";

  const activeServices = useMemo(
    () => services.filter((s) => s.IsActive !== false),
    [services]
  );

  const mergedBarbers = useMemo(
    () => mergeBarbersWithQueueStats(barbers, queueStats),
    [barbers, queueStats]
  );

  const walkInBarbers = useMemo(
    () => mergedBarbers.filter((b) => b.isAcceptingWalkIns),
    [mergedBarbers]
  );

  const shortestWait = useMemo(() => {
    const waits = walkInBarbers.map((b) => b.waitMinutes ?? 0);
    return waits.length ? Math.min(...waits) : null;
  }, [walkInBarbers]);

  const share = async () => {
    const url = publicBookingUrl(shop?.Slug) || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: shop?.Name, url });
        return;
      } catch {
        /* Cancelled — fall through to copying. */
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
  if (tenantLoading && !shop) {
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back />
        <div className="px-4 space-y-4">
          <Skeleton className="w-full h-52" rounded="rounded-card" />
          <Skeleton className="h-6 w-2/3" rounded="rounded-pill" />
          <ListSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (!shop) {
    /* Printed QR posters outlive shops, so this is a real state a customer
       standing in a doorway can hit. */
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back title={t("shop")} />
        <div className="px-4 pt-6">
          <ErrorState
            title={t("shop_not_found_title")}
            message={tenantError || t("shop_not_found_body")}
            onRetry={() => dispatch(fetchTenant(tenantSlug))}
          />
          <div className="mt-4 flex justify-center">
            <Button variant="secondary" icon="search" to="/book">
              {t("find_a_barber")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const walkInsOpen = walkInBarbers.length > 0;

  return (
    <div className="min-h-screen bg-surface-base pb-32">
      <ShopHero
        shop={shop}
        onBack={() => navigate("/book")}
        actions={
          <span className="bg-surface-raised/90 backdrop-blur rounded-control shadow-sm">
            <IconButton icon="share" label={t("share_shop_action")} onClick={share} />
          </span>
        }
      />

      <ShopIdentity
        shop={shop}
        reviews={details.reviews}
        onOpenReviews={() => setAllReviewsOpen(true)}
      />

      {/* A guest mid-queue gets a way back to their place before anything else. */}
      {guestQueue?.slug === tenantSlug ? (
        <div className="px-4 mt-4">
          <button
            type="button"
            onClick={() => navigate(`/book/${tenantSlug}/queue`)}
            className="press w-full flex items-center gap-3 p-3.5 rounded-card bg-surface-inverse text-start"
          >
            <span className="w-9 h-9 rounded-control bg-brand-gold text-content-on-gold flex items-center justify-center flex-shrink-0">
              <Icon name="clock" size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-body font-bold text-content-inverse">
                {t("guest_queue_resume")}
              </span>
              <span className="block text-caption text-content-inverse/70">
                {t("track_queue")}
              </span>
            </span>
            <Icon name="chevron-right" size={18} className="text-content-inverse/60" />
          </button>
        </div>
      ) : null}

      <ShopPromotion promotion={details.promotions[0]} />

      <ShopServices
        services={activeServices}
        currency={currency}
        loading={servicesLoading && !services.length}
        error={servicesError}
        onRetry={() => dispatch(fetchServices(tenantSlug))}
      />

      <ShopTeam barbers={mergedBarbers} />

      <ShopGallery images={details.gallery} />

      <ShopReviews
        reviews={details.reviews}
        error={details.reviewsError}
        onRetry={details.reload}
        onSeeAll={() => setAllReviewsOpen(true)}
      />

      <ShopInfoCard shop={shop} currency={currency} onOpenHours={() => setHoursOpen(true)} />

      {/* Ajmal's only self-promotion on the shop's own page: a way to find
          other shops, at the bottom, after the shop has had its say. */}
      <div className="px-4 mt-8 text-center">
        <Link to="/book" className="text-caption text-content-muted underline decoration-line-strong">
          {t("powered_by_ajmal")}
        </Link>
      </div>

      {/* ---- sticky actions ---- */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-base/95 backdrop-blur-lg border-t border-line-subtle">
        <div className="max-w-md mx-auto flex gap-2.5">
          <Button
            block
            size="lg"
            icon="calendar"
            to={`/book/${tenantSlug}/reserve`}
          >
            {t("book_appointment_action")}
          </Button>

          {walkInsOpen ? (
            <Button
              block
              size="lg"
              variant="secondary"
              icon="clock"
              to={`/book/${tenantSlug}/reserve?intent=queue`}
            >
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

        {!walkInsOpen ? (
          <p className="max-w-md mx-auto mt-2 text-caption text-content-muted text-center">
            {t("walk_ins_closed_hint")}
          </p>
        ) : null}
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
    </div>
  );
}
