import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Photo, Pill, Rating, LiveDot } from "./Primitives";
import { formatPriceRange } from "../../utils/format";
import { shopAvailability } from "../../utils/shopAvailability";
import { formatDistanceKm, haversineDistanceKm } from "../../utils/geo";
import { useI18n } from "../../i18n";

/*
 * ShopCard.
 *
 * Availability is the headline, not a footnote: a customer opens Ajmal to find
 * out who can cut their hair now. The availability strip therefore sits
 * directly under the shop name, above rating and price, and is the one thing
 * on the card that is allowed to be coloured.
 *
 * variant "rail"  — fixed-width card for a horizontally scrolling section
 *         "list"  — full-width card for Explore results
 *         "compact" — a dense row for favourites and search suggestions
 */

function AvailabilityStrip({ shop, compact = false }) {
  const { t } = useI18n();
  const availability = shopAvailability(shop, t);
  if (!availability) return null;

  const toneClass =
    availability.tone === "success"
      ? "text-state-success"
      : availability.tone === "info"
      ? "text-state-info"
      : "text-content-muted";

  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${compact ? "" : "mt-1.5"}`}>
      {availability.live ? (
        <LiveDot />
      ) : (
        <Icon name={availability.icon} size={14} className={`${toneClass} flex-shrink-0`} />
      )}
      <span className={`text-body-sm font-semibold ${toneClass} tnum truncate`}>
        {availability.label}
      </span>
      {availability.detail && !compact ? (
        <>
          <span className="text-content-muted" aria-hidden="true">·</span>
          <span className="text-caption text-content-muted truncate">{availability.detail}</span>
        </>
      ) : null}
    </div>
  );
}

function VerifiedBadge() {
  const { t } = useI18n();
  return (
    <span title={t("verified_shop")} className="inline-flex flex-shrink-0 text-brand-gold-text">
      <Icon name="verified" size={15} title={t("verified_shop")} />
    </span>
  );
}

function useDistanceLabel(shop, coords) {
  if (!coords || shop?.Latitude == null || shop?.Longitude == null) return null;
  const km = haversineDistanceKm(coords, {
    latitude: Number(shop.Latitude),
    longitude: Number(shop.Longitude)
  });
  return km == null ? null : formatDistanceKm(km);
}

export default function ShopCard({
  shop,
  variant = "list",
  coords,
  to,
  trailing,
  onClick
}) {
  const { t } = useI18n();
  const distance = useDistanceLabel(shop, coords);
  const priceRange = formatPriceRange(shop.MinPrice, shop.MaxPrice, shop.Currency);
  const place = shop.Area || shop.City;
  const href = to || `/customer/shop/${shop.Id}`;

  if (variant === "compact") {
    return (
      <Link
        to={href}
        onClick={onClick}
        className="press flex items-center gap-3 p-2.5 bg-surface-raised border border-line-subtle rounded-card"
      >
        <Photo
          src={shop.LogoUrl || shop.CoverImageUrl}
          alt=""
          ratio="1/1"
          rounded="rounded-control"
          className="w-14 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-body font-bold text-content-primary truncate">{shop.Name}</span>
            {shop.IsVerified ? <VerifiedBadge /> : null}
          </div>
          <AvailabilityStrip shop={shop} compact />
        </div>
        {trailing || <Icon name="chevron-right" size={18} className="text-content-muted flex-shrink-0" />}
      </Link>
    );
  }

  const isRail = variant === "rail";

  return (
    <Link
      to={href}
      onClick={onClick}
      className={[
        "press block bg-surface-raised border border-line-subtle rounded-card overflow-hidden",
        isRail ? "w-[70vw] max-w-[290px] flex-shrink-0" : "w-full"
      ].join(" ")}
    >
      <div className="relative">
        <Photo
          src={shop.CoverImageUrl || shop.LogoUrl}
          alt={shop.Name}
          ratio={isRail ? "16/10" : "16/9"}
          rounded="rounded-none"
        />

        {/* Closed shops are dimmed rather than hidden — a customer still wants
            to find their barber and see when they reopen. */}
        {!shop.IsOpenNow ? (
          <span aria-hidden="true" className="absolute inset-0 bg-surface-base/45" />
        ) : null}

        {shop.WalkInAvailable ? (
          <span className="absolute top-2.5 start-2.5">
            <Pill tone="solid" dot>
              {t("walk_in_open")}
            </Pill>
          </span>
        ) : null}

        {trailing ? <span className="absolute top-1.5 end-1.5">{trailing}</span> : null}
      </div>

      <div className="p-3.5">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-h3 text-content-primary line-clamp-1">{shop.Name}</h3>
          {shop.IsVerified ? <VerifiedBadge /> : null}
        </div>

        <AvailabilityStrip shop={shop} />

        <div className="mt-2.5 flex items-center gap-2 flex-wrap text-caption text-content-muted">
          {shop.AverageRating ? (
            <Rating value={shop.AverageRating} count={shop.ReviewsCount} compact />
          ) : (
            <span className="text-caption text-content-muted">{t("new_shop")}</span>
          )}

          {place ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-[9rem]">{place}</span>
            </>
          ) : null}

          {distance ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="tnum">{distance}</span>
            </>
          ) : null}

          {priceRange ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="tnum font-semibold text-content-secondary">{priceRange}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
