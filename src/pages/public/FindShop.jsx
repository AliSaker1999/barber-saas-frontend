import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchActiveTenants } from "../../features/publicBooking/publicBookingSlice";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import ShopCard from "../../components/ui/ShopCard";
import { FilterChip } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, ShopListSkeleton } from "../../components/ui/States";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useI18n } from "../../i18n";
import { captureAcquisitionSource } from "../../utils/acquisition";

/*
 * Public shop directory — /book with no slug.
 *
 * `GET /public/tenants` is backed by the same query as the authenticated
 * Explore screen, so every shop already arrives with its live availability:
 * open now, barbers on the floor, shortest walk-in wait, price band, rating.
 * This page used to render a logo, a name and a rating and throw the rest
 * away; handing the same objects to `ui/ShopCard` means an anonymous visitor
 * sees exactly what a signed-in customer sees.
 *
 * Availability-first ordering, for the same reason Explore uses it: a shop
 * that can take you now is more useful than a slightly better-rated shop that
 * cannot.
 */
export default function FindShop() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const { activeTenants, activeTenantsLoading, activeTenantsError } = useAppSelector(
    (state) => state.publicBooking
  );

  const [rawQuery, setRawQuery] = useState("");
  const query = useDebouncedValue(rawQuery, 250).trim().toLowerCase();
  const [area, setArea] = useState("");

  useEffect(() => {
    /* A shared directory link can carry a channel tag too. */
    captureAcquisitionSource();
    dispatch(fetchActiveTenants());
  }, [dispatch]);

  /* Neighbourhoods come from the shops that exist, so a chip never advertises
     an area with nothing in it. */
  const areas = useMemo(() => {
    const counts = new Map();
    activeTenants.forEach((shop) => {
      const name = shop.Area || shop.City;
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [activeTenants]);

  const results = useMemo(() => {
    const matches = activeTenants.filter((shop) => {
      if (area && (shop.Area || shop.City) !== area) return false;
      if (!query) return true;

      return [shop.Name, shop.NameAr, shop.Area, shop.City, shop.Street]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    return [...matches].sort((a, b) => {
      const score = (shop) =>
        (shop.WalkInAvailable ? 4 : 0) +
        (shop.IsOpenNow ? 2 : 0) +
        (shop.AppointmentsAvailableToday ? 1 : 0);

      const byScore = score(b) - score(a);
      if (byScore) return byScore;

      return (b.AverageRating ?? 0) - (a.AverageRating ?? 0);
    });
  }, [activeTenants, query, area]);

  const narrowed = Boolean(query || area);

  return (
    <div className="min-h-screen bg-surface-base pb-8">
      <TopBar title={t("app_name")} subtitle={t("app_tagline")} />

      <div className="px-4 pt-1">
        <div className="relative">
          <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder={t("search_placeholder")}
            aria-label={t("search_placeholder")}
            className="w-full h-12 ps-11 pe-11 rounded-control bg-surface-raised border border-line-subtle
                       text-body text-content-primary placeholder:text-content-muted
                       focus:border-brand-gold focus:outline-none"
          />
          {rawQuery ? (
            <button
              type="button"
              onClick={() => setRawQuery("")}
              aria-label={t("close")}
              className="absolute end-1 top-1/2 -translate-y-1/2 tap-target flex items-center justify-center text-content-muted"
            >
              <Icon name="x" size={18} />
            </button>
          ) : null}
        </div>
      </div>

      {areas.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-3">
          <FilterChip active={!area} onClick={() => setArea("")}>
            {t("all_areas")}
          </FilterChip>
          {areas.map((entry) => (
            <FilterChip
              key={entry.name}
              active={area === entry.name}
              onClick={() => setArea(area === entry.name ? "" : entry.name)}
              count={entry.count}
            >
              {entry.name}
            </FilterChip>
          ))}
        </div>
      ) : null}

      <p className="px-4 pt-3.5 text-caption text-content-muted tnum">
        {t("results_count", { n: results.length })}
      </p>

      <div className="px-4 pt-3 space-y-3">
        {activeTenantsLoading && !activeTenants.length ? (
          <ShopListSkeleton />
        ) : activeTenantsError && !activeTenants.length ? (
          <ErrorState message={activeTenantsError} onRetry={() => dispatch(fetchActiveTenants())} />
        ) : !results.length ? (
          <EmptyState
            icon="search"
            title={t("no_results_title")}
            description={t("no_results_body")}
            actionLabel={narrowed ? t("clear_filters") : null}
            onAction={() => {
              setRawQuery("");
              setArea("");
            }}
          />
        ) : (
          results.map((shop) => (
            /* Public links are by slug, not id — the id route needs an account. */
            <ShopCard key={shop.Id} shop={shop} to={`/book/${shop.Slug}`} />
          ))
        )}
      </div>
    </div>
  );
}
