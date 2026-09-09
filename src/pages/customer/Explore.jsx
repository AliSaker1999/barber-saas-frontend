import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { requestUserLocation } from "../../features/location/locationSlice";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import { FilterChip } from "../../components/ui/Primitives";
import ShopCard from "../../components/ui/ShopCard";
import ShopMap from "../../components/ui/ShopMap";
import BottomSheet from "../../components/ui/BottomSheet";
import { EmptyState, ErrorState, ShopListSkeleton } from "../../components/ui/States";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { useI18n } from "../../i18n";
import { haversineDistanceKm } from "../../utils/geo";

/*
 * Explore — the discovery engine (spec §8).
 *
 * Search covers shop, area and service names in one field, because a customer
 * types "fade" or "Hamra" with equal likelihood and should not have to know
 * which box it belongs in.
 *
 * Filters are availability-first and stay in the URL, so a "See all" link from
 * a Home rail lands on the same filtered view and the back button behaves.
 */

const FILTERS = [
  { id: "walkin", labelKey: "filter_walk_in", icon: "clock" },
  { id: "open", labelKey: "open_now", icon: "check" },
  { id: "quick", labelKey: "filter_quick", icon: "clock" },
  { id: "today", labelKey: "filter_available_today", icon: "calendar" },
  { id: "rated", labelKey: "filter_top_rated", icon: "star" }
];

const SORTS = [
  { id: "recommended", labelKey: "sort_recommended" },
  { id: "wait", labelKey: "sort_wait" },
  { id: "rating", labelKey: "sort_rating" },
  { id: "distance", labelKey: "sort_distance", needsLocation: true },
  { id: "price", labelKey: "sort_price" }
];

function matchesQuery(shop, query) {
  if (!query) return true;
  const haystack = [shop.Name, shop.NameAr, shop.Area, shop.City, shop.Street]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export default function Explore() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const [params, setParams] = useSearchParams();

  const { tenants, loading, error } = useAppSelector((state) => state.tenants);
  const coords = useAppSelector((state) => state.location.coords);
  const locationLoading = useAppSelector((state) => state.location.loading);

  const [rawQuery, setRawQuery] = useState(params.get("q") || "");
  const query = useDebouncedValue(rawQuery, 250).trim().toLowerCase();

  const [sortOpen, setSortOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState(null);

  const activeFilters = useMemo(
    () => new Set((params.get("filter") || "").split(",").filter(Boolean)),
    [params]
  );
  const area = params.get("area") || "";
  const sort = params.get("sort") || "recommended";
  const isMap = params.get("view") === "map";

  const load = useCallback(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  /* Keep the URL in step with the search box, but replace history entries so
     typing doesn't fill the back stack with every keystroke. */
  useEffect(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (query) next.set("q", query);
        else next.delete("q");
        return next;
      },
      { replace: true }
    );
  }, [query, setParams]);

  const updateParam = (key, value) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const toggleFilter = (id) => {
    const next = new Set(activeFilters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateParam("filter", Array.from(next).join(","));
  };

  /* Neighbourhoods come from the shops that actually exist, so the chips never
     advertise an area with nothing in it. */
  const areas = useMemo(() => {
    const counts = new Map();
    tenants.forEach((shop) => {
      const name = shop.Area || shop.City;
      if (!name) return;
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [tenants]);

  const distanceOf = useCallback(
    (shop) => {
      if (!coords || shop.Latitude == null || shop.Longitude == null) return null;
      return haversineDistanceKm(coords, {
        latitude: Number(shop.Latitude),
        longitude: Number(shop.Longitude)
      });
    },
    [coords]
  );

  const results = useMemo(() => {
    let list = tenants.filter((shop) => matchesQuery(shop, query));

    if (area) list = list.filter((shop) => (shop.Area || shop.City) === area);
    if (activeFilters.has("walkin")) list = list.filter((shop) => shop.WalkInAvailable);
    if (activeFilters.has("open")) list = list.filter((shop) => shop.IsOpenNow);
    if (activeFilters.has("quick")) {
      list = list.filter((shop) => shop.WalkInAvailable && (shop.MinWaitMinutes ?? 999) <= 15);
    }
    if (activeFilters.has("today")) {
      list = list.filter((shop) => shop.AppointmentsAvailableToday);
    }
    if (activeFilters.has("rated")) list = list.filter((shop) => (shop.AverageRating ?? 0) >= 4.5);

    const sorted = [...list];

    switch (sort) {
      case "wait":
        sorted.sort(
          (a, b) =>
            (a.WalkInAvailable ? a.MinWaitMinutes ?? 999 : 9999) -
            (b.WalkInAvailable ? b.MinWaitMinutes ?? 999 : 9999)
        );
        break;
      case "rating":
        sorted.sort((a, b) => (b.AverageRating ?? 0) - (a.AverageRating ?? 0));
        break;
      case "distance":
        sorted.sort((a, b) => (distanceOf(a) ?? 1e9) - (distanceOf(b) ?? 1e9));
        break;
      case "price":
        sorted.sort((a, b) => (a.MinPrice ?? 1e9) - (b.MinPrice ?? 1e9));
        break;
      default:
        /*
         * "Recommended" is availability first, then quality: a shop that can
         * take you now outranks a slightly better-rated shop that can't. Ties
         * fall back to distance when we know it.
         */
        sorted.sort((a, b) => {
          const score = (shop) =>
            (shop.WalkInAvailable ? 4 : 0) +
            (shop.IsOpenNow ? 2 : 0) +
            (shop.AppointmentsAvailableToday ? 1 : 0);
          const byScore = score(b) - score(a);
          if (byScore) return byScore;

          const byRating = (b.AverageRating ?? 0) - (a.AverageRating ?? 0);
          if (Math.abs(byRating) > 0.2) return byRating;

          return (distanceOf(a) ?? 1e9) - (distanceOf(b) ?? 1e9);
        });
    }

    return sorted;
  }, [tenants, query, area, activeFilters, sort, distanceOf]);

  const selectedShop = useMemo(
    () => results.find((shop) => shop.Id === selectedShopId) || null,
    [results, selectedShopId]
  );

  const hasNarrowing = Boolean(query || area || activeFilters.size);

  const clearAll = () => {
    setRawQuery("");
    setParams((current) => {
      const next = new URLSearchParams(current);
      ["q", "area", "filter"].forEach((key) => next.delete(key));
      return next;
    });
  };

  const chooseSort = (id) => {
    if (id === "distance" && !coords) dispatch(requestUserLocation());
    updateParam("sort", id === "recommended" ? "" : id);
    setSortOpen(false);
  };

  return (
    <div>
      <TopBar
        title={t("explore_title")}
        actions={
          <>
            <IconButton
              icon="sliders"
              label={t("sort_by")}
              onClick={() => setSortOpen(true)}
            />
            <IconButton
              icon={isMap ? "list" : "map"}
              label={isMap ? t("list_view") : t("map_view")}
              onClick={() => updateParam("view", isMap ? "" : "map")}
            />
          </>
        }
      />

      {/* ---- search ---- */}
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

      {/* ---- neighbourhoods ---- */}
      {areas.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-3">
          <FilterChip active={!area} onClick={() => updateParam("area", "")}>
            {t("all_areas")}
          </FilterChip>
          {areas.map((entry) => (
            <FilterChip
              key={entry.name}
              active={area === entry.name}
              onClick={() => updateParam("area", area === entry.name ? "" : entry.name)}
              count={entry.count}
            >
              {entry.name}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {/* ---- filters ---- */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pt-2.5">
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.id}
            icon={filter.icon}
            active={activeFilters.has(filter.id)}
            onClick={() => toggleFilter(filter.id)}
          >
            {t(filter.labelKey)}
          </FilterChip>
        ))}
      </div>

      {/* ---- result count + active sort ---- */}
      <div className="px-4 pt-3.5 flex items-center justify-between gap-3">
        <p className="text-caption text-content-muted tnum">
          {t("results_count", { n: results.length })}
        </p>
        <button
          type="button"
          onClick={() => setSortOpen(true)}
          className="text-caption font-semibold text-brand-gold-text inline-flex items-center gap-1 py-1"
        >
          {t(SORTS.find((s) => s.id === sort)?.labelKey || "sort_recommended")}
          <Icon name="chevron-down" size={14} />
        </button>
      </div>

      {/* ---- results ---- */}
      <div className="px-4 pt-3 pb-2">
        {loading && !tenants.length ? (
          <ShopListSkeleton />
        ) : error && !tenants.length ? (
          <ErrorState onRetry={load} />
        ) : !results.length ? (
          <EmptyState
            icon="search"
            title={t("no_results_title")}
            description={t("no_results_body")}
            actionLabel={hasNarrowing ? t("clear_filters") : null}
            onAction={clearAll}
          />
        ) : isMap ? (
          <div className="space-y-3">
            <ShopMap
              shops={results}
              coords={coords}
              selectedId={selectedShopId}
              onSelect={(shop) => setSelectedShopId(shop.Id)}
              className="h-[58vh] min-h-[320px]"
            />
            {selectedShop ? (
              <ShopCard shop={selectedShop} variant="compact" coords={coords} />
            ) : (
              <p className="text-caption text-content-muted text-center py-2">
                {t("map_view")} · {t("results_count", { n: results.length })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((shop) => (
              <ShopCard key={shop.Id} shop={shop} coords={coords} />
            ))}
          </div>
        )}
      </div>

      {/* ---- sort sheet ---- */}
      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title={t("sort_by")}>
        <ul className="divide-y divide-line-subtle -mx-1">
          {SORTS.map((option) => {
            const active = option.id === sort;
            const unavailable = option.needsLocation && !coords;

            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => chooseSort(option.id)}
                  className="w-full min-h-[52px] flex items-center gap-3 px-1 text-start"
                >
                  <span className="flex-1 text-body text-content-primary">
                    {t(option.labelKey)}
                    {unavailable ? (
                      <span className="block text-caption text-content-muted">
                        {t("location_needed")}
                      </span>
                    ) : null}
                  </span>
                  {active ? (
                    <Icon name="check" size={18} className="text-brand-gold-text" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {!coords ? (
          <div className="pt-4">
            <Button
              variant="secondary"
              icon="navigate"
              block
              loading={locationLoading}
              onClick={() => dispatch(requestUserLocation())}
            >
              {t("use_my_location")}
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
