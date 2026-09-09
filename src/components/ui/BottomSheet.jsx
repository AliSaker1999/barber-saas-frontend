import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import Button from "./Button";
import { useI18n } from "../../i18n";

/*
 * BottomSheet — the modal pattern for this app.
 *
 * A sheet, not a centred dialog: on a phone held one-handed the controls belong
 * near the thumb. Rendered in a portal so a sheet opened from inside a
 * scrolling card is never clipped, and so it escapes the legacy screens'
 * stacking contexts.
 *
 * Handles: Escape to close, scrim tap to close, focus trapped inside, body
 * scroll locked while open, safe-area padding at the bottom.
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissible = true,
  maxHeight = "88vh"
}) {
  const { t } = useI18n();
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  const handleClose = useCallback(() => {
    if (dismissible) onClose?.();
  }, [dismissible, onClose]);

  /* Lock the page behind the sheet so the scrim does not scroll the app. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /* Move focus into the sheet, and put it back where it was on close. */
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;
    const timer = setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable || panelRef.current)?.focus?.();
    }, 30);

    return () => {
      clearTimeout(timer);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
        return;
      }

      if (event.key !== "Tab") return;

      const nodes = panelRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!nodes?.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label={t("close")}
        tabIndex={-1}
        onClick={handleClose}
        className="absolute inset-0 animate-fade-in"
        style={{ background: "var(--scrim)", cursor: dismissible ? "pointer" : "default" }}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || t("close")}
        tabIndex={-1}
        style={{ maxHeight }}
        className="relative w-full sm:max-w-md bg-surface-raised border-t sm:border border-line-subtle
                   rounded-t-sheet sm:rounded-sheet shadow-sheet animate-sheet-in
                   flex flex-col outline-none overflow-hidden"
      >
        {/* Grab handle — the affordance that says "this sheet can be dismissed". */}
        {dismissible ? (
          <div className="pt-2.5 pb-1 flex justify-center flex-shrink-0" aria-hidden="true">
            <span className="w-10 h-1 rounded-pill bg-line-strong" />
          </div>
        ) : (
          <div className="pt-3" />
        )}

        {title ? (
          <header className="flex items-start gap-3 px-5 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-h2 text-content-primary">{title}</h2>
              {subtitle ? (
                <p className="text-body-sm text-content-secondary mt-0.5">{subtitle}</p>
              ) : null}
            </div>
            {dismissible ? (
              <button
                type="button"
                onClick={handleClose}
                aria-label={t("close")}
                className="tap-target -me-2 -mt-1 flex items-center justify-center rounded-control text-content-muted hover:bg-surface-sunken"
              >
                <Icon name="x" size={20} />
              </button>
            ) : null}
          </header>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 pb-4 overscroll-contain">{children}</div>

        {footer ? (
          <footer className="flex-shrink-0 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line-subtle bg-surface-raised">
            {footer}
          </footer>
        ) : (
          <div className="pb-[env(safe-area-inset-bottom)]" />
        )}
      </div>
    </div>,
    document.body
  );
}

/*
 * ConfirmSheet — the gate in front of every destructive action (spec §30).
 * Leaving a queue, cancelling a booking and deleting an account all go through
 * this; nothing destructive fires on a single tap.
 */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = true,
  loading = false,
  detail
}) {
  const { t } = useI18n();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      dismissible={!loading}
      title={title}
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" block onClick={onClose} disabled={loading}>
            {cancelLabel || t("keep_it")}
          </Button>
          <Button
            variant={destructive ? "danger-solid" : "primary"}
            block
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel || t("confirm")}
          </Button>
        </div>
      }
    >
      <p className="text-body text-content-secondary">{message}</p>
      {detail ? (
        <div className="mt-3.5 rounded-card bg-surface-sunken px-3.5 py-3 text-body-sm text-content-secondary">
          {detail}
        </div>
      ) : null}
    </BottomSheet>
  );
}
