import Icon from "../ui/Icon";
import Button from "../ui/Button";
import { Rating } from "../ui/Primitives";
import { shopMapsHref } from "../../utils/shopLinks";
import { shopWhatsappHref, telHref } from "../../config/support";
import { useI18n } from "../../i18n";
import { localized } from "../../utils/localized";

/*
 * Name, trust signals, and the three ways to reach the shop.
 *
 * The rating is a button when there are reviews to show, plain text when there
 * are none — "New shop" is honest, a greyed-out 0.0 is not.
 *
 * Each contact action renders only when the shop actually supplied that
 * channel. A dead "Call" button is worse than no button.
 */
export default function ShopIdentity({ shop, reviews, onOpenReviews }) {
  const { t, locale } = useI18n();
  const mapsHref = shopMapsHref(shop);
  const phone = telHref(shop.Phone);
  const whatsapp = shopWhatsappHref(shop.WhatsappNumber);

  return (
    <header className="px-4 pt-4">
      <div className="flex items-start gap-2">
        <h1 className="flex-1 text-display text-content-primary">{localized(shop, "Name", locale)}</h1>
        {shop.IsVerified ? (
          <span className="mt-1.5 text-brand-gold-text flex-shrink-0">
            <Icon name="verified" size={20} title={t("verified_shop")} />
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2 flex-wrap text-caption text-content-muted">
        {reviews?.averageRating ? (
          <button
            type="button"
            onClick={onOpenReviews}
            className="inline-flex items-center gap-1"
          >
            <Rating value={reviews.averageRating} compact />
            <span className="underline decoration-line-strong">
              {t("reviews_of", { n: reviews.reviewsCount })}
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

      {localized(shop, "Description", locale) ? (
        <p className="mt-2 text-body-sm text-content-secondary">
          {localized(shop, "Description", locale)}
        </p>
      ) : null}

      {mapsHref || phone || whatsapp ? (
        <div className="mt-3.5 flex gap-2 flex-wrap">
          {mapsHref ? (
            <Button
              variant="secondary"
              size="sm"
              icon="navigate"
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
            >
              {t("get_directions")}
            </Button>
          ) : null}
          {phone ? (
            <Button variant="secondary" size="sm" icon="phone" href={phone}>
              {t("call")}
            </Button>
          ) : null}
          {whatsapp ? (
            <Button
              variant="secondary"
              size="sm"
              icon="whatsapp"
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              {t("whatsapp_support")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
