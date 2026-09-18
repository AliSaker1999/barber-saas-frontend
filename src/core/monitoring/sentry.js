import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

// No Sentry account exists yet, so this stays a no-op until VITE_SENTRY_DSN
// is set — wired up now so turning it on later is a one-line env change, not
// new code. Mirrors barber-saas-backend/src/core/monitoring/sentry.ts.
export const sentryEnabled = !!dsn;

export function initSentry() {
  if (!dsn) {
    console.info("Sentry disabled (no VITE_SENTRY_DSN set)");
    return;
  }
  Sentry.init({ dsn, tracesSampleRate: 0.1 });
}

export function captureException(error, extra) {
  if (!sentryEnabled) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
