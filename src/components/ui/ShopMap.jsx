import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { useI18n } from "../../i18n";

/*
 * ShopMap — a raster-tile map with no mapping library.
 *
 * Leaflet/Mapbox would add 150KB+ to a bundle that has to open over a Lebanese
 * mobile connection for a view most customers use occasionally, so this draws
 * Web Mercator tiles directly: pick a zoom that fits every pin, lay out a tile
 * grid, and position markers by the same projection. Drag to pan, tap a pin to
 * select a shop.
 *
 * Tiles default to OpenStreetMap (attribution required and rendered below).
 * Set VITE_MAP_TILE_URL to a paid provider before the public launch — OSM's
 * tile policy does not cover production app traffic.
 */

const TILE_SIZE = 256;
const DEFAULT_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || DEFAULT_TILES;

/* Beirut, used only when nothing on screen has coordinates. */
const FALLBACK_CENTER = { latitude: 33.8938, longitude: 35.5018 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/* A stable object, so `pan` doesn't change identity on every render. */
const ZERO_PAN = { key: "", x: 0, y: 0 };

function lonToX(lon, zoom) {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToY(lat, zoom) {
  const rad = (clamp(lat, -85.05, 85.05) * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
  return y * TILE_SIZE * 2 ** zoom;
}

function tileUrl(z, x, y) {
  const max = 2 ** z;
  /* Wrap horizontally so a pan across the antimeridian still requests a
     valid tile instead of a 404 grey square. */
  const wrappedX = ((x % max) + max) % max;
  if (y < 0 || y >= max) return null;
  return TILE_URL.replace("{z}", z).replace("{x}", wrappedX).replace("{y}", y);
}

export default function ShopMap({ shops, coords, selectedId, onSelect, className = "" }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /*
   * The pan offset is stored against the result set it belongs to. Filtering
   * the list should re-frame the map, and deriving that here rather than
   * resetting it from an effect avoids a cascading render on every filter tap.
   */
  const [panState, setPanState] = useState({ key: "", x: 0, y: 0 });
  const dragRef = useRef(null);

  const located = useMemo(
    () => shops.filter((s) => s.Latitude != null && s.Longitude != null),
    [shops]
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const measure = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });

    measure();

    /* ResizeObserver is missing on some older Android WebViews — the initial
       measurement above still gives a usable map there. */
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const resultKey = useMemo(() => located.map((shop) => shop.Id).join(","), [located]);
  const pan = panState.key === resultKey ? panState : ZERO_PAN;
  const setPan = useCallback(
    (next) => setPanState({ key: resultKey, x: next.x, y: next.y }),
    [resultKey]
  );

  const view = useMemo(() => {
    const points = located.map((s) => ({
      latitude: Number(s.Latitude),
      longitude: Number(s.Longitude)
    }));

    if (coords) points.push(coords);

    if (!points.length) {
      return { center: FALLBACK_CENTER, zoom: 13 };
    }

    const lats = points.map((p) => p.latitude);
    const lons = points.map((p) => p.longitude);
    const center = {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lons) + Math.max(...lons)) / 2
    };

    if (points.length === 1 || !size.width || !size.height) {
      return { center, zoom: 14 };
    }

    /* Largest zoom at which every pin still fits, with a margin for the pin
       artwork itself. */
    let zoom = 11;
    for (let candidate = 17; candidate >= 11; candidate -= 1) {
      const spanX = Math.abs(lonToX(Math.max(...lons), candidate) - lonToX(Math.min(...lons), candidate));
      const spanY = Math.abs(latToY(Math.min(...lats), candidate) - latToY(Math.max(...lats), candidate));
      if (spanX < size.width - 96 && spanY < size.height - 96) {
        zoom = candidate;
        break;
      }
    }

    return { center, zoom };
  }, [located, coords, size.width, size.height]);

  const { center, zoom } = view;

  /* Pixel position of a lat/lon inside the container, including the pan. */
  const project = useCallback(
    (latitude, longitude) => ({
      x: lonToX(longitude, zoom) - lonToX(center.longitude, zoom) + size.width / 2 + pan.x,
      y: latToY(latitude, zoom) - latToY(center.latitude, zoom) + size.height / 2 + pan.y
    }),
    [zoom, center, size, pan]
  );

  const tiles = useMemo(() => {
    if (!size.width || !size.height) return [];

    const centerX = lonToX(center.longitude, zoom) - pan.x;
    const centerY = latToY(center.latitude, zoom) - pan.y;

    const left = centerX - size.width / 2;
    const top = centerY - size.height / 2;

    const firstX = Math.floor(left / TILE_SIZE);
    const firstY = Math.floor(top / TILE_SIZE);
    const countX = Math.ceil(size.width / TILE_SIZE) + 1;
    const countY = Math.ceil(size.height / TILE_SIZE) + 1;

    const list = [];
    for (let dx = 0; dx < countX; dx += 1) {
      for (let dy = 0; dy < countY; dy += 1) {
        const x = firstX + dx;
        const y = firstY + dy;
        const url = tileUrl(zoom, x, y);
        if (!url) continue;
        list.push({
          key: `${zoom}/${x}/${y}`,
          url,
          left: x * TILE_SIZE - left,
          top: y * TILE_SIZE - top
        });
      }
    }
    return list;
  }, [size, center, zoom, pan]);

  const onPointerDown = (event) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    setPan({ x: drag.originX + dx, y: drag.originY + dy });
  };

  const onPointerUp = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
  };

  if (!located.length) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 bg-surface-sunken rounded-card ${className}`}
      >
        <Icon name="map" size={28} className="text-content-muted" />
        <p className="text-body-sm text-content-secondary text-center max-w-[28ch] px-6">
          {t("map_no_location")}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-card bg-surface-sunken ${className}`}>
      <div
        ref={containerRef}
        role="application"
        aria-label={t("map_view")}
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="lazy"
            width={TILE_SIZE}
            height={TILE_SIZE}
            className="absolute select-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}

        {/* The customer's own position, if they granted location. */}
        {coords
          ? (() => {
              const point = project(coords.latitude, coords.longitude);
              return (
                <span
                  aria-hidden="true"
                  className="absolute w-3.5 h-3.5 -ms-[7px] -mt-[7px] rounded-pill bg-state-info border-2 border-white shadow-md"
                  style={{ left: point.x, top: point.y }}
                />
              );
            })()
          : null}

        {located.map((shop) => {
          const point = project(Number(shop.Latitude), Number(shop.Longitude));
          const selected = shop.Id === selectedId;

          return (
            <button
              key={shop.Id}
              type="button"
              onClick={() => {
                /* A drag that ends over a pin must not select it. */
                if (dragRef.current?.moved) return;
                onSelect?.(shop);
              }}
              aria-label={shop.Name}
              className="absolute -translate-x-1/2 -translate-y-full press"
              style={{ left: point.x, top: point.y }}
            >
              <span
                className={`flex items-center gap-1 px-2 h-7 rounded-pill border shadow-md text-caption font-bold whitespace-nowrap ${
                  selected
                    ? "bg-brand-gold border-brand-gold text-content-on-gold"
                    : shop.WalkInAvailable
                    ? "bg-surface-inverse border-surface-inverse text-content-inverse"
                    : "bg-surface-raised border-line-strong text-content-primary"
                }`}
              >
                {shop.WalkInAvailable ? <Icon name="clock" size={12} /> : null}
                <span className="max-w-[7.5rem] truncate">{shop.Name}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="absolute bottom-1 end-1.5 text-[9px] text-content-muted bg-surface-raised/80 px-1.5 py-0.5 rounded-pill pointer-events-none">
        {t("map_attribution")}
      </p>
    </div>
  );
}
