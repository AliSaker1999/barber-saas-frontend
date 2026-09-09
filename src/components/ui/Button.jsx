import { forwardRef } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";

/*
 * The one button in the app.
 *
 * variant  primary   the single dominant action on a screen (filled gold)
 *          secondary a real but subordinate action (outlined)
 *          ghost     tertiary / inline action (no chrome)
 *          danger    destructive action, always behind a confirmation
 *
 * Every size clears the 44px touch minimum. `loading` keeps the button's width
 * so the layout does not jump, and blocks repeat taps.
 */

const VARIANTS = {
  primary:
    "bg-brand-gold text-content-on-gold hover:opacity-90 active:opacity-100 shadow-sm",
  secondary:
    "bg-surface-raised text-content-primary border border-line-strong hover:bg-surface-sunken",
  ghost:
    "bg-transparent text-brand-gold-text hover:bg-brand-gold-soft",
  danger:
    "bg-transparent text-state-danger border border-state-danger hover:bg-state-danger-soft",
  "danger-solid":
    "bg-state-danger text-white hover:opacity-90"
};

const SIZES = {
  sm: "min-h-[40px] px-3.5 text-body-sm rounded-control gap-1.5",
  md: "min-h-[44px] px-4 text-body rounded-control gap-2",
  lg: "min-h-[52px] px-5 text-body font-bold rounded-control gap-2"
};

const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    icon,
    iconEnd,
    loading = false,
    disabled = false,
    block = false,
    to,
    href,
    className = "",
    type = "button",
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  const classes = [
    "press inline-flex items-center justify-center font-semibold select-none",
    "transition-colors duration-[var(--dur-fast)] ease-out",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    block ? "w-full" : "",
    isDisabled ? "opacity-50 pointer-events-none" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? (
        <Spinner />
      ) : (
        icon && <Icon name={icon} size={size === "sm" ? 16 : 18} />
      )}
      {children ? <span className="truncate">{children}</span> : null}
      {iconEnd && !loading ? <Icon name={iconEnd} size={size === "sm" ? 16 : 18} /> : null}
    </>
  );

  if (to && !isDisabled) {
    return (
      <Link ref={ref} to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !isDisabled) {
    return (
      <a ref={ref} href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;

/* Icon-only control. `label` is required — it is the accessible name. */
export function IconButton({
  icon,
  label,
  onClick,
  to,
  size = 20,
  variant = "ghost",
  badge = null,
  className = "",
  filled = false,
  ...rest
}) {
  const classes = [
    "tap-target press inline-flex items-center justify-center rounded-control relative",
    "transition-colors duration-[var(--dur-fast)] ease-out",
    variant === "ghost"
      ? "text-content-secondary hover:bg-surface-sunken"
      : variant === "solid"
      ? "bg-surface-raised border border-line-subtle text-content-primary hover:bg-surface-sunken"
      : "bg-brand-gold text-content-on-gold hover:opacity-90",
    className
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      <Icon name={icon} size={size} filled={filled} />
      {badge ? (
        <span className="absolute top-1.5 end-1.5 min-w-[16px] h-4 px-1 rounded-pill bg-state-danger text-white text-[10px] font-bold leading-4 text-center tnum">
          {badge}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} aria-label={label} className={classes} {...rest}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={classes} {...rest}>
      {inner}
    </button>
  );
}

export function Spinner({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
