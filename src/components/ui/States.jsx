import Icon from "./Icon";
import Button from "./Button";
import { useI18n } from "../../i18n";

/*
 * The four states every screen must have (spec §28).
 *
 * Loading  → a skeleton shaped like the content, never a blank screen
 * Empty    → says what is missing and offers the next action
 * Error    → plain language plus a retry
 * Offline  → says so, and keeps whatever was already cached on screen
 */

/* ---------------------------------------------------------------------------
   Skeletons
   ------------------------------------------------------------------------- */
export function Skeleton({ className = "", rounded = "rounded-control", ...rest }) {
  return <div className={`skeleton ${rounded} ${className}`} aria-hidden="true" {...rest} />;
}

export function SkeletonText({ lines = 2, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
          rounded="rounded-pill"
        />
      ))}
    </div>
  );
}

/* Matches the real ShopCard footprint so nothing moves when data lands. */
export function ShopCardSkeleton() {
  return (
    <div className="bg-surface-raised border border-line-subtle rounded-card overflow-hidden">
      <Skeleton className="w-full" rounded="rounded-none" style={{ aspectRatio: "16/10" }} />
      <div className="p-3.5 space-y-2.5">
        <Skeleton className="h-4 w-3/5" rounded="rounded-pill" />
        <Skeleton className="h-3 w-2/5" rounded="rounded-pill" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-24" rounded="rounded-pill" />
          <Skeleton className="h-6 w-20" rounded="rounded-pill" />
        </div>
      </div>
    </div>
  );
}

export function ShopListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <ShopCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RailSkeleton({ count = 3 }) {
  return (
    <div className="flex gap-3 overflow-hidden" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[68vw] max-w-[280px] flex-shrink-0">
          <ShopCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4, height = "h-[72px]" }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height}`} rounded="rounded-card" />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Empty
   ------------------------------------------------------------------------- */
export function EmptyState({
  icon = "search",
  title,
  description,
  actionLabel,
  onAction,
  actionTo,
  secondaryLabel,
  onSecondary,
  className = ""
}) {
  return (
    <div className={`text-center px-6 py-10 ${className}`}>
      <span className="inline-flex w-14 h-14 rounded-pill bg-brand-gold-soft text-brand-gold-text items-center justify-center mb-4">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="text-h3 text-content-primary">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-body-sm text-content-secondary max-w-[36ch] mx-auto">{description}</p>
      ) : null}
      {actionLabel ? (
        <div className="mt-5 flex flex-col items-center gap-2">
          <Button to={actionTo} onClick={onAction} size="md">
            {actionLabel}
          </Button>
          {secondaryLabel ? (
            <Button variant="ghost" size="sm" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Error
   ------------------------------------------------------------------------- */
export function ErrorState({ title, message, onRetry, className = "" }) {
  const { t } = useI18n();

  return (
    <div
      className={`bg-surface-raised border border-line-subtle rounded-card px-6 py-8 text-center ${className}`}
      role="alert"
    >
      <span className="inline-flex w-12 h-12 rounded-pill bg-state-danger-soft text-state-danger items-center justify-center mb-3">
        <Icon name="alert" size={22} />
      </span>
      <h3 className="text-h3 text-content-primary">{title || t("error_generic_title")}</h3>
      <p className="mt-1.5 text-body-sm text-content-secondary max-w-[38ch] mx-auto">
        {message || t("error_generic_body")}
      </p>
      {onRetry ? (
        <div className="mt-5">
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            {t("try_again")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/* A compact inline error for a section inside an otherwise healthy screen. */
export function InlineError({ message, onRetry, className = "" }) {
  const { t } = useI18n();
  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3 rounded-card bg-state-danger-soft border border-line-subtle ${className}`}
      role="alert"
    >
      <Icon name="alert" size={18} className="text-state-danger flex-shrink-0" />
      <p className="flex-1 text-body-sm text-content-primary">{message || t("error_generic_body")}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-body-sm font-semibold text-brand-gold-text flex-shrink-0 tap-target px-2"
        >
          {t("try_again")}
        </button>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Offline
   ------------------------------------------------------------------------- */
export function OfflineBanner({ lastSyncLabel, className = "" }) {
  const { t } = useI18n();

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-card bg-state-warning-soft border border-line-subtle ${className}`}
      role="status"
    >
      <Icon name="wifi-off" size={17} className="text-state-warning flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-body-sm font-semibold text-content-primary">{t("offline_title")}</p>
        <p className="text-caption text-content-secondary">
          {lastSyncLabel ? t("offline_showing_cached").replace("{time}", lastSyncLabel) : t("offline_body")}
        </p>
      </div>
    </div>
  );
}

export function OfflineState({ onRetry, className = "" }) {
  const { t } = useI18n();

  return (
    <div className={`text-center px-6 py-12 ${className}`} role="status">
      <span className="inline-flex w-14 h-14 rounded-pill bg-state-warning-soft text-state-warning items-center justify-center mb-4">
        <Icon name="wifi-off" size={24} />
      </span>
      <h3 className="text-h3 text-content-primary">{t("offline_title")}</h3>
      <p className="mt-1.5 text-body-sm text-content-secondary max-w-[34ch] mx-auto">
        {t("offline_body")}
      </p>
      {onRetry ? (
        <div className="mt-5">
          <Button variant="secondary" icon="refresh" onClick={onRetry}>
            {t("try_again")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
