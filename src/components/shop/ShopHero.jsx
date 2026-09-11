import Icon from "../ui/Icon";
import TopBar from "../ui/TopBar";
import { Photo, LiveDot } from "../ui/Primitives";
import { shopAvailability } from "../../utils/shopAvailability";
import { useI18n } from "../../i18n";

/*
 * The shop's hero photograph, with the back/actions bar floating over it and
 * the availability pill legible before any scrolling.
 *
 * Availability is the reason a customer opened the app, so it must survive the
 * photograph underneath it — hence the opaque pill rather than plain text on
 * the image.
 *
 * `actions` is passed in because the two screens that use this need different
 * ones: the in-app profile has favourite + share, the public landing page has
 * share only (a guest has nowhere to keep a favourite).
 */
export default function ShopHero({ shop, actions, onBack }) {
  const { t } = useI18n();
  const availability = shopAvailability(shop, t);

  return (
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
        <TopBar back transparent sticky={false} onBack={onBack} actions={actions} />
      </div>

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
  );
}
