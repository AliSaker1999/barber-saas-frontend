import { Link } from "react-router-dom";
import Icon from "./Icon";
import { initialsOf } from "../../utils/format";

/* ---------------------------------------------------------------------------
   Card — the standard raised container.
   ------------------------------------------------------------------------- */
export function Card({ children, className = "", as = "div", padded = true, ...rest }) {
  const Tag = as;
  return (
    <Tag
      className={[
        "bg-surface-raised border border-line-subtle rounded-card",
        padded ? "p-4" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------------------
   SectionHeader — title plus one optional trailing link. Nothing else.
   ------------------------------------------------------------------------- */
export function SectionHeader({ title, subtitle, action, actionTo, onAction, className = "" }) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-h2 text-content-primary truncate">{title}</h2>
        {subtitle ? (
          <p className="text-caption text-content-muted mt-0.5 truncate">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        actionTo ? (
          <Link
            to={actionTo}
            className="flex-shrink-0 text-body-sm font-semibold text-brand-gold-text inline-flex items-center gap-1 py-1"
          >
            {action}
            <Icon name="chevron-right" size={16} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="flex-shrink-0 text-body-sm font-semibold text-brand-gold-text inline-flex items-center gap-1 py-1"
          >
            {action}
            <Icon name="chevron-right" size={16} />
          </button>
        )
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   FilterChip — compact, single-line, scrolls horizontally on small screens.
   ------------------------------------------------------------------------- */
export function FilterChip({ children, active = false, onClick, icon, count, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "press flex-shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-pill",
        "text-body-sm font-semibold whitespace-nowrap border transition-colors",
        active
          ? "bg-brand-gold text-content-on-gold border-brand-gold"
          : "bg-surface-raised text-content-secondary border-line-subtle hover:bg-surface-sunken",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
      {count != null ? <span className="tnum opacity-70">{count}</span> : null}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   Rating — stars plus count. `compact` shows the number only.
   ------------------------------------------------------------------------- */
export function Rating({ value, count, size = 14, compact = false, className = "" }) {
  const score = Number(value) || 0;
  const hasRating = score > 0;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <Icon name="star" size={size} filled className="text-brand-gold" />
        <span className="text-body-sm font-semibold text-content-primary tnum">
          {hasRating ? score.toFixed(1) : "—"}
        </span>
        {count ? <span className="text-caption text-content-muted tnum">({count})</span> : null}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="inline-flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon
            key={i}
            name="star"
            size={size}
            filled={i <= Math.round(score)}
            className={i <= Math.round(score) ? "text-brand-gold" : "text-line-strong"}
          />
        ))}
      </span>
      <span className="sr-only">{hasRating ? `${score.toFixed(1)} out of 5` : "Not rated yet"}</span>
      {count ? <span className="text-caption text-content-muted tnum">({count})</span> : null}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Pill — a status or metadata badge. Tone maps to semantic state tokens.
   ------------------------------------------------------------------------- */
const PILL_TONES = {
  neutral: "bg-surface-sunken text-content-secondary",
  gold: "bg-brand-gold-soft text-brand-gold-text",
  success: "bg-state-success-soft text-state-success",
  warning: "bg-state-warning-soft text-state-warning",
  danger: "bg-state-danger-soft text-state-danger",
  info: "bg-state-info-soft text-state-info",
  solid: "bg-surface-inverse text-content-inverse"
};

export function Pill({ children, tone = "neutral", icon, dot = false, className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-caption font-semibold whitespace-nowrap",
        PILL_TONES[tone] || PILL_TONES.neutral,
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot ? <span className="w-1.5 h-1.5 rounded-pill bg-current" /> : null}
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

/* A live-availability dot with a soft pulse — the "open now" signal. */
export function LiveDot({ tone = "success", className = "" }) {
  const color = tone === "success" ? "bg-state-success" : tone === "warning" ? "bg-state-warning" : "bg-content-muted";
  return (
    <span className={`relative inline-flex w-2 h-2 ${className}`}>
      <span className={`absolute inset-0 rounded-pill ${color} animate-pulse-ring`} />
      <span className={`relative inline-flex w-2 h-2 rounded-pill ${color}`} />
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Avatar — image with an initials fallback. Never renders a broken image.
   ------------------------------------------------------------------------- */
export function Avatar({ src, name, size = 40, className = "", ring = false }) {
  const dimension = { width: size, height: size };

  return (
    <span
      style={dimension}
      className={[
        "relative inline-flex items-center justify-center flex-shrink-0 rounded-pill overflow-hidden",
        "bg-surface-sunken text-content-secondary font-bold select-none",
        ring ? "ring-2 ring-brand-gold ring-offset-2 ring-offset-surface-raised" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Initials sit underneath: if the photo 404s we just hide it and the
          fallback is already there — no broken-image icon, no layout shift. */}
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="relative w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Photo — lazily loaded, ratio-locked, with a token-coloured placeholder.
   Images are the heaviest thing on these screens; every one is lazy by
   default and reserves its box so nothing reflows on a slow connection.
   ------------------------------------------------------------------------- */
export function Photo({
  src,
  alt = "",
  ratio = "4/3",
  className = "",
  rounded = "rounded-card",
  priority = false,
  overlay = false,
  children
}) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-sunken ${rounded} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-content-muted">
          <Icon name="scissors" size={28} />
        </span>
      )}
      {overlay ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        />
      ) : null}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Row — the standard tappable list row (profile menus, settings, shop info).
   ------------------------------------------------------------------------- */
export function Row({ icon, label, value, to, onClick, tone = "default", chevron = true, badge }) {
  const body = (
    <>
      {icon ? (
        <span
          className={`w-9 h-9 rounded-control flex items-center justify-center flex-shrink-0 ${
            tone === "danger" ? "bg-state-danger-soft text-state-danger" : "bg-surface-sunken text-content-secondary"
          }`}
        >
          <Icon name={icon} size={18} />
        </span>
      ) : null}
      <span className="flex-1 min-w-0 text-start">
        <span
          className={`block text-body font-medium truncate ${
            tone === "danger" ? "text-state-danger" : "text-content-primary"
          }`}
        >
          {label}
        </span>
      </span>
      {badge ? <Pill tone="gold">{badge}</Pill> : null}
      {value ? <span className="text-body-sm text-content-muted truncate max-w-[45%]">{value}</span> : null}
      {chevron ? <Icon name="chevron-right" size={18} className="text-content-muted flex-shrink-0" /> : null}
    </>
  );

  const classes =
    "w-full min-h-[56px] flex items-center gap-3 px-4 py-2.5 text-start hover:bg-surface-sunken transition-colors";

  if (to) {
    /* onClick still fires alongside navigation, so a row inside a sheet can
       both navigate and close the sheet behind it. */
    return (
      <Link to={to} onClick={onClick} className={classes}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  );
}

/* A grouped list container that draws the dividers between its Rows. */
export function RowGroup({ title, children, className = "" }) {
  return (
    <section className={className}>
      {title ? (
        <h3 className="text-label uppercase text-content-muted px-1 mb-2">{title}</h3>
      ) : null}
      <div className="bg-surface-raised border border-line-subtle rounded-card overflow-hidden divide-y divide-line-subtle">
        {children}
      </div>
    </section>
  );
}
