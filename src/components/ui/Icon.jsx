/*
 * Ajmal icon set.
 *
 * One library, owned in-repo: identical 24×24 viewBox, 1.75 stroke, round caps
 * and joins, `currentColor` throughout. Bundled rather than pulled from a CDN
 * because the Android build has to render correctly with no network.
 *
 * Directional glyphs are listed in DIRECTIONAL and mirror automatically in
 * Arabic — a chevron that means "forward" must point left in RTL.
 */

const PATHS = {
  /* navigation */
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35",
  calendar: "M7 3v3M17 3v3M3.5 9.5h17M5 6h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2",
  user: "M12 11.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.8-3.2 3.4-4.9 6.5-4.9s5.7 1.7 6.5 4.9M16.5 4.6a3.5 3.5 0 0 1 0 6.8M18 15.4c2.1.5 3.3 2 3.8 4.1",
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0",
  scissors: "M6.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM6.5 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.6 7.3 19.5 19M8.6 16.7 19.5 5",

  /* actions */
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M4.5 12.5 9.5 17.5 19.5 6.5",
  x: "M6 6l12 12M18 6 6 18",
  share: "M12 15.5V3.5M8.5 7 12 3.5 15.5 7M5.5 13v6a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5v-6",
  refresh: "M20 12a8 8 0 1 1-2.6-5.9M20.5 4v4.5H16",
  filter: "M4 6.5h16M7 12h10M10 17.5h4",
  sliders: "M4 8h10M18 8h2M4 16h4M12 16h8M15 5.5v5M9 13.5v5",
  edit: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3ZM14.5 6 18 9.5",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7",
  logout: "M15 8.5V6a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 15 18v-2.5M10.5 12h9.5M17 8.5 20.5 12 17 15.5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a1.6 1.6 0 1 1-2.3 2.3l-.1-.1a1.7 1.7 0 0 0-2.8 1.2v.3a1.6 1.6 0 1 1-3.2 0v-.2a1.7 1.7 0 0 0-2.8-1.3l-.1.1a1.6 1.6 0 1 1-2.3-2.3l.1-.1A1.7 1.7 0 0 0 3.9 14h-.2a1.6 1.6 0 1 1 0-3.2h.3a1.7 1.7 0 0 0 1.2-2.8l-.1-.1a1.6 1.6 0 1 1 2.3-2.3l.1.1A1.7 1.7 0 0 0 10 4.6V4.3a1.6 1.6 0 1 1 3.2 0v.3a1.7 1.7 0 0 0 2.8 1.2l.1-.1a1.6 1.6 0 1 1 2.3 2.3l-.1.1a1.7 1.7 0 0 0 1.2 2.8h.2a1.6 1.6 0 1 1 0 3.2h-.2Z",

  /* commerce + trust */
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8Z",
  heart: "M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3c0 5-7.5 9.4-7.5 9.4Z",
  verified: "M12 3.2 14.3 5l2.9-.2 1 2.7 2.4 1.6-.9 2.8.9 2.8-2.4 1.6-1 2.7-2.9-.2L12 20.8 9.7 19l-2.9.2-1-2.7-2.4-1.6.9-2.8-.9-2.8 2.4-1.6 1-2.7L9.7 5 12 3.2ZM9 12l2.2 2.2L15.5 10",
  wallet: "M4 8.5A1.5 1.5 0 0 1 5.5 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5.5A1.5 1.5 0 0 1 4 17.5v-9ZM4 10.5h16.5M16 14.5h1.5",
  gift: "M4.5 10h15v9.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V10ZM3.5 7h17v3h-17V7ZM12 7v13.5M12 7c-1.2-2.5-2.4-3.5-3.8-3.2-1.4.3-1.6 2-.4 3.2M12 7c1.2-2.5 2.4-3.5 3.8-3.2 1.4.3 1.6 2 .4 3.2",
  tag: "M11.5 3.5H20v8.5l-8.6 8.6a1.5 1.5 0 0 1-2.1 0l-6.4-6.4a1.5 1.5 0 0 1 0-2.1L11.5 3.5ZM16 8h.01",
  card: "M3.5 8.5A1.5 1.5 0 0 1 5 7h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 17H5a1.5 1.5 0 0 1-1.5-1.5v-7ZM3.5 11h17M6.5 14.5h3",

  /* place */
  pin: "M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0c0 5 6.5 11 6.5 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  navigate: "M20.5 4.5 3.5 11l7.3 2.2L13 20.5l7.5-16Z",
  map: "M9 4.5 3.5 6.5v13L9 17.5m0-13 6 2.5m-6-2.5v13m6-10.5 5.5-2v13l-5.5 2m0-13v13m0 0-6-2.5",
  list: "M4 7h1M4 12h1M4 17h1M8.5 7h11.5M8.5 12h11.5M8.5 17h11.5",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 12h17M12 3c2.2 2.3 3.4 5.5 3.4 9S14.2 18.7 12 21c-2.2-2.3-3.4-5.5-3.4-9S9.8 5.3 12 3Z",

  /* comms */
  phone: "M7 3.5h2l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v2a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z",
  message: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V6.5Z",
  whatsapp: "M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5ZM9 8.5c.5-.1.8 0 1 .5l.6 1.3c.1.3 0 .5-.2.7l-.5.5c.6 1.2 1.5 2 2.7 2.6l.5-.6c.2-.2.4-.3.7-.2l1.3.6c.4.2.6.5.5 1-.1.8-.9 1.3-1.8 1.2-2.7-.4-5-2.7-5.4-5.4-.1-.9.3-1.7 1.1-1.9Z",

  /* status */
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5.5M12 7.8h.01",
  alert: "M12 9v4.5M12 17h.01M10.6 4.2 2.9 17.5A1.6 1.6 0 0 0 4.3 20h15.4a1.6 1.6 0 0 0 1.4-2.5L13.4 4.2a1.6 1.6 0 0 0-2.8 0Z",
  "wifi-off": "M3 3l18 18M8.2 12.3a6 6 0 0 1 2.5-1.2M4.5 8.8a11 11 0 0 1 3.3-1.9M16.3 12.6a6 6 0 0 0-1.7-1M19.5 8.8a11 11 0 0 0-6.3-2.6M12 19h.01",
  lock: "M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19v-7a1.5 1.5 0 0 1 1.5-1.5ZM8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.3A2.5 2.5 0 0 1 14.5 10c0 1.7-2.5 2-2.5 3.5M12 17h.01",
  sun: "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.5V4M12 20v1.5M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M2.5 12H4M20 12h1.5M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z",

  /* media */
  camera: "M4 9.5A1.5 1.5 0 0 1 5.5 8h1.8l1.2-2h7l1.2 2h1.8A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-8ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  image: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11ZM8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM4.5 16.5 9 12.5l3.5 3 2.5-2 4.5 3.5",
  qr: "M4 4h5v5H4V4ZM15 4h5v5h-5V4ZM4 15h5v5H4v-5ZM15 15h2v2h-2v-2ZM19 19h1M12 4v3M12 11h3M12 15v5M19 12h1",

  /* gender / specialty — the barber's "who I cut for" glyphs */
  "gender-male": "M10 20a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM13.9 10.6 19.5 5M14.5 4.5h5v5",
  "gender-female": "M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 15v6M9 18h6",
  "gender-unisex":
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM14.9 9.1 19 5M15.5 4.5h4v4M12 16v5M9.5 18.5h5",
  "gender-other": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12h.01M12 12h.01M15.5 12h.01",

  /* misc */
  chart: "M4 20h16M7 20v-6M12 20V8M17 20v-9",
  sparkle: "M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6L12 3.5ZM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z",
  more: "M6 12h.01M12 12h.01M18 12h.01",

  /* directional — mirrored in RTL */
  "chevron-left": "M14.5 5.5 8 12l6.5 6.5",
  "chevron-right": "M9.5 5.5 16 12l-6.5 6.5",
  "chevron-down": "M5.5 9.5 12 16l6.5-6.5",
  "chevron-up": "M5.5 14.5 12 8l6.5 6.5",
  "arrow-right": "M4.5 12h15M14 6.5 19.5 12 14 17.5",
  "arrow-left": "M19.5 12h-15M10 6.5 4.5 12 10 17.5"
};

/* Glyphs whose meaning is tied to reading direction. */
const DIRECTIONAL = new Set([
  "chevron-left",
  "chevron-right",
  "arrow-right",
  "arrow-left",
  "logout",
  "share",
  "navigate"
]);

/* Solid variants — used sparingly for "on" states (favourited, rated). */
const FILLED = {
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8L12 3.8Z",
  heart: "M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3c0 5-7.5 9.4-7.5 9.4Z"
};

export default function Icon({
  name,
  size = 20,
  filled = false,
  className = "",
  strokeWidth = 1.75,
  title,
  ...rest
}) {
  const d = filled ? FILLED[name] || PATHS[name] : PATHS[name];

  if (!d) {
    if (import.meta.env.DEV) {
      console.warn(`[Icon] unknown icon "${name}"`);
    }
    return null;
  }

  const flip = DIRECTIONAL.has(name) ? "flip-rtl" : "";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${flip} ${className}`.trim()}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
