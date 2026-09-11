import { useState } from "react";
import Icon from "../ui/Icon";
import Button from "../ui/Button";
import ServiceCard from "../ui/ServiceCard";
import BarberCard from "../ui/BarberCard";
import { Avatar, Photo, Pill, Rating, SectionHeader, LiveDot } from "../ui/Primitives";
import { EmptyState, InlineError, ListSkeleton } from "../ui/States";
import { formatMoney, toDate } from "../../utils/format";
import { trimSeconds } from "../../utils/shopAvailability";
import { shopMapsHref } from "../../utils/shopLinks";
import { toHHMM } from "../../utils/time";
import { useI18n } from "../../i18n";

/*
 * The body of a shop profile, section by section.
 *
 * Shared verbatim between the in-app profile (`pages/customer/ShopProfile`)
 * and the public QR landing page (`pages/public/PublicShop`), so a customer
 * who arrives by QR sees the same shop as one who arrives through the app —
 * same photography, same prices, same reviews, same policies.
 *
 * Everything here is presentational. No redux, no router, no sockets: the
 * screens own fetching and the actions, these own the layout.
 */

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/* ---------------------------------------------------------------------------
   Promotion
   ------------------------------------------------------------------------- */
export function ShopPromotion({ promotion }) {
  const { t } = useI18n();
  if (!promotion) return null;

  return (
    <section className="px-4 mt-5">
      <div className="rounded-card bg-brand-gold-soft border border-line-subtle p-3.5 flex items-start gap-3">
        <span className="w-9 h-9 rounded-control bg-brand-gold text-content-on-gold flex items-center justify-center flex-shrink-0">
          <Icon name="tag" size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-body font-bold text-content-primary truncate">
            {promotion.Title || promotion.Name || t("special_offers")}
          </p>
          {promotion.Description ? (
            <p className="text-caption text-content-secondary">{promotion.Description}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Services — the price list
   ------------------------------------------------------------------------- */
export function ShopServices({ services, currency, loading, error, onRetry }) {
  const { t } = useI18n();

  return (
    <section className="px-4 mt-7">
      <SectionHeader title={t("shop_services")} />

      {loading ? (
        <ListSkeleton count={3} height="h-[68px]" />
      ) : error ? (
        <InlineError onRetry={onRetry} />
      ) : !services.length ? (
        <EmptyState
          icon="scissors"
          title={t("no_services_title")}
          description={t("no_services_body")}
        />
      ) : (
        <div className="space-y-2.5">
          {services.map((service) => (
            <ServiceCard key={service.Id} service={service} currency={currency} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Team
   ------------------------------------------------------------------------- */
export function ShopTeam({ barbers, onSelectBarber }) {
  const { t } = useI18n();
  if (!barbers.length) return null;

  return (
    <section className="mt-7">
      <div className="px-4">
        <SectionHeader title={t("shop_team")} />
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar snap-rail px-4 pb-1">
        {barbers.map((barber) => (
          <BarberCard
            key={barber.barberId}
            barber={barber}
            onSelect={onSelectBarber ? () => onSelectBarber(barber) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Gallery — grid plus lightbox.
   The lightbox index is owned here rather than threaded through props: it is
   nobody else's business which photo is open.
   ------------------------------------------------------------------------- */
export function ShopGallery({ images }) {
  const { t } = useI18n();
  const [index, setIndex] = useState(null);

  if (!images?.length) return null;

  const open = index != null && images[index];

  return (
    <>
      <section className="px-4 mt-7">
        <SectionHeader title={t("shop_gallery")} />
        <div className="grid grid-cols-3 gap-1.5">
          {images.slice(0, 9).map((image, position) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(position)}
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

      {open ? (
        <div
          className="fixed inset-0 z-[320] flex items-center justify-center animate-fade-in"
          style={{ background: "var(--scrim)" }}
          role="dialog"
          aria-modal="true"
          onClick={() => setIndex(null)}
        >
          <button
            type="button"
            onClick={() => setIndex(null)}
            aria-label={t("close")}
            className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] end-3 tap-target rounded-pill
                       bg-surface-raised/90 text-content-primary flex items-center justify-center"
          >
            <Icon name="x" size={22} />
          </button>

          <div className="w-full px-4" onClick={(event) => event.stopPropagation()}>
            <img
              src={images[index].imageUrl}
              alt={images[index].caption || ""}
              className="w-full max-h-[72vh] object-contain rounded-card"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-body-sm text-white/90 truncate">
                {images[index].caption || images[index].barberName}
              </p>
              <span className="text-caption text-white/70 tnum flex-shrink-0">
                {index + 1} / {images.length}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                block
                icon="chevron-left"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                {t("back")}
              </Button>
              <Button
                variant="secondary"
                block
                iconEnd="chevron-right"
                disabled={index === images.length - 1}
                onClick={() => setIndex((i) => Math.min(images.length - 1, i + 1))}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Reviews
   ------------------------------------------------------------------------- */
export function RatingBreakdown({ reviews }) {
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

export function ReviewItem({ review }) {
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

export function ShopReviews({ reviews, error, onRetry, onSeeAll }) {
  const { t } = useI18n();

  return (
    <section className="px-4 mt-7">
      <SectionHeader
        title={t("shop_reviews")}
        action={reviews?.reviews?.length > 3 ? t("see_all_reviews") : null}
        onAction={onSeeAll}
      />

      {error ? (
        <InlineError onRetry={onRetry} />
      ) : !reviews?.reviewsCount ? (
        <EmptyState icon="star" title={t("no_reviews_title")} description={t("no_reviews_body")} />
      ) : (
        <div className="bg-surface-raised border border-line-subtle rounded-card p-4">
          <RatingBreakdown reviews={reviews} />
          <ul className="mt-2 divide-y divide-line-subtle">
            {reviews.reviews.slice(0, 3).map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Opening hours — the week, with today emphasised
   ------------------------------------------------------------------------- */
export function ShopHours({ hours, shop }) {
  const { t } = useI18n();

  if (!hours?.length) {
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
   Practical details — hours summary, location, payment, policies.
   Policies sit here, above the booking CTA, because a cancellation rule
   discovered after payment is a complaint waiting to happen.
   ------------------------------------------------------------------------- */
export function ShopInfoCard({ shop, currency, onOpenHours }) {
  const { t } = useI18n();
  const mapsHref = shopMapsHref(shop);
  const address = [shop.Street, shop.Building, shop.Area, shop.City].filter(Boolean).join(", ");

  const hoursSummary = shop.IsOpenNow && shop.ClosesAt
    ? t("until_time", { time: trimSeconds(shop.ClosesAt) })
    : shop.IsClosedToday
    ? t("closed_today")
    : shop.OpensAt
    ? t("opens_at", { time: trimSeconds(shop.OpensAt) })
    : t("no_hours_set");

  return (
    <section className="px-4 mt-7">
      <SectionHeader title={t("shop_info")} />

      <div className="bg-surface-raised border border-line-subtle rounded-card divide-y divide-line-subtle">
        <button
          type="button"
          onClick={onOpenHours}
          className="w-full flex items-center gap-3 p-4 text-start"
        >
          <Icon name="clock" size={18} className="text-content-muted flex-shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-body font-medium text-content-primary">
              {t("shop_hours")}
            </span>
            <span className="block text-caption text-content-muted tnum">{hoursSummary}</span>
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
                  {t("deposit_policy", { amount: formatMoney(shop.DepositAmount, currency) })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
