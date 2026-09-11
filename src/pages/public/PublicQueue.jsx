import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchTenant,
  fetchQueuePosition,
  leaveQueue
} from "../../features/publicBooking/publicBookingSlice";
import { setPublicAuthToken } from "../../services/publicApi";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { ConfirmSheet } from "../../components/ui/BottomSheet";
import { Avatar, Pill } from "../../components/ui/Primitives";
import { QueueStatusHero, QueueProgress } from "../../components/ui/QueueStatusCard";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { formatDuration, formatMoney, formatTime } from "../../utils/format";
import { shopMapsHref } from "../../utils/shopLinks";
import { shopWhatsappHref, telHref } from "../../config/support";
import { loadGuestSession, getGuestQueue } from "../../utils/guestSession";

/*
 * Live queue tracker for a guest.
 *
 * The in-app tracker rides a websocket; the public flow has no socket
 * connection at all, so this polls. That is the honest trade: a guest who
 * arrived by QR and will probably never install the app still gets to see
 * their place in line move, which is the entire product promise.
 *
 * The interval is short enough to feel live while someone is watching it and
 * long enough that a shop's whole waiting room polling at once is unremarkable
 * — each request is one indexed lookup.
 */
const POLL_MS = 20000;

export default function PublicQueue() {
  const { tenantSlug } = useParams();
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { tenant: shop, queue, queueLoading, queueError } = useAppSelector(
    (state) => state.publicBooking
  );

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const stored = useMemo(() => getGuestQueue(), []);

  /* Restore the guest token before anything is fetched — without it every
     request below is a 401. */
  useEffect(() => {
    const session = loadGuestSession();
    if (!session?.token) {
      setExpired(true);
      setReady(true);
      return;
    }

    setPublicAuthToken(session.token);
    setReady(true);

    if (!shop) dispatch(fetchTenant(tenantSlug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, tenantSlug]);

  const tenantId = shop?.Id || stored?.tenantId || null;

  const refresh = useCallback(() => {
    if (!tenantId) return;
    dispatch(fetchQueuePosition(tenantId)).then(() => setLastUpdated(Date.now()));
  }, [dispatch, tenantId]);

  useEffect(() => {
    if (!ready || expired || !tenantId) return undefined;

    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [ready, expired, tenantId, refresh]);

  const confirmLeave = async () => {
    if (!tenantId) return;
    setLeaving(true);
    try {
      await dispatch(leaveQueue(tenantId)).unwrap();
      setLeaveOpen(false);
      toast.success(t("queue_left"));
      navigate(`/book/${tenantSlug}`, { replace: true });
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setLeaving(false);
    }
  };

  /* ---- the session is gone ---- */
  if (expired) {
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back onBack={() => navigate(`/book/${tenantSlug}`)} title={t("queue_status")} />
        <EmptyState
          icon="lock"
          title={t("guest_session_expired_title")}
          description={t("guest_session_expired_body")}
          actionLabel={t("back_to_shop")}
          actionTo={`/book/${tenantSlug}`}
          className="pt-10"
        />
      </div>
    );
  }

  if (!ready || (queueLoading && !queue)) {
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back onBack={() => navigate(`/book/${tenantSlug}`)} title={t("queue_status")} />
        <div className="px-4 space-y-4 pt-6">
          <Skeleton className="h-40 w-full" rounded="rounded-card" />
          <Skeleton className="h-16 w-full" rounded="rounded-card" />
          <Skeleton className="h-28 w-full" rounded="rounded-card" />
        </div>
      </div>
    );
  }

  if (queueError && !queue) {
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back onBack={() => navigate(`/book/${tenantSlug}`)} title={t("queue_status")} />
        <div className="px-4 pt-6">
          <ErrorState message={queueError} onRetry={refresh} />
        </div>
      </div>
    );
  }

  /* The endpoint returns null once the customer has left the line — served,
     cancelled or marked a no-show. Saying so beats an empty screen. */
  if (!queue) {
    return (
      <div className="min-h-screen bg-surface-base">
        <TopBar back onBack={() => navigate(`/book/${tenantSlug}`)} title={t("queue_status")} />
        <EmptyState
          icon="check"
          title={t("guest_queue_finished_title")}
          description={t("guest_queue_finished_body")}
          actionLabel={t("back_to_shop")}
          actionTo={`/book/${tenantSlug}`}
          className="pt-10"
        />
      </div>
    );
  }

  const servicesTotal = (queue.services || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
  const servicesDuration =
    queue.totalDuration ||
    (queue.services || []).reduce((sum, s) => sum + Number(s.duration || 0), 0);
  const currency = shop?.Currency || "USD";

  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(locale === "ar" ? "ar-LB" : "en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  return (
    <div className="min-h-screen bg-surface-base pb-28">
      <TopBar
        back
        onBack={() => navigate(`/book/${tenantSlug}`)}
        title={queue.tenantName || shop?.Name}
        subtitle={shop?.Area || shop?.City || undefined}
        actions={
          <Button variant="ghost" size="sm" icon="refresh" onClick={refresh}>
            {t("retry")}
          </Button>
        }
      />

      <div className="px-4">
        <QueueStatusHero queue={queue} />
      </div>

      {/* Polling, not live — so say when it last checked rather than implying
          a realtime connection the page doesn't have. */}
      {updatedLabel ? (
        <p className="text-caption text-content-muted text-center tnum">
          {t("queue_last_checked", { time: updatedLabel })}
        </p>
      ) : null}

      <div className="px-4 mt-3">
        <div className="bg-surface-raised border border-line-subtle rounded-card p-4">
          <QueueProgress queue={queue} />
        </div>
      </div>

      <section className="px-4 mt-5">
        <h2 className="text-label uppercase text-content-muted mb-2">{t("queue_details")}</h2>

        <div className="bg-surface-raised border border-line-subtle rounded-card divide-y divide-line-subtle">
          <div className="flex items-center gap-3 p-4">
            <Avatar src={queue.barberProfileImage} name={queue.barberName} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-caption text-content-muted">{t("barber")}</p>
              <p className="text-body font-semibold text-content-primary truncate">
                {queue.barberName}
              </p>
            </div>
            {queue.statusId === 2 ? (
              <Pill tone="success" dot>
                {t("busy_now")}
              </Pill>
            ) : null}
          </div>

          <div className="flex items-start gap-3 p-4">
            <Icon name="scissors" size={18} className="text-content-muted flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-caption text-content-muted">{t("service")}</p>
              <p className="text-body font-semibold text-content-primary">
                {(queue.services || []).map((s) => s.name).filter(Boolean).join(" + ") || "—"}
              </p>
              <p className="text-caption text-content-muted tnum">
                {formatDuration(servicesDuration, t)}
                {servicesTotal ? ` · ${formatMoney(servicesTotal, currency)}` : ""}
              </p>
            </div>
          </div>

          {queue.joinedAt ? (
            <div className="flex items-center gap-3 p-4">
              <Icon name="clock" size={18} className="text-content-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-caption text-content-muted">{t("joined_at")}</p>
                <p className="text-body font-semibold text-content-primary tnum">
                  {formatTime(queue.joinedAt, locale)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Getting to the shop matters more here than anywhere: they're in line. */}
      {shopMapsHref(shop) || telHref(shop?.Phone) || shopWhatsappHref(shop?.WhatsappNumber) ? (
        <section className="px-4 mt-3 flex gap-2 flex-wrap">
          {shopMapsHref(shop) ? (
            <Button
              variant="secondary"
              size="sm"
              icon="navigate"
              href={shopMapsHref(shop)}
              target="_blank"
              rel="noreferrer"
            >
              {t("get_directions")}
            </Button>
          ) : null}
          {telHref(shop?.Phone) ? (
            <Button variant="secondary" size="sm" icon="phone" href={telHref(shop.Phone)}>
              {t("call")}
            </Button>
          ) : null}
          {shopWhatsappHref(shop?.WhatsappNumber) ? (
            <Button
              variant="secondary"
              size="sm"
              icon="whatsapp"
              href={shopWhatsappHref(shop.WhatsappNumber)}
              target="_blank"
              rel="noreferrer"
            >
              {t("whatsapp_support")}
            </Button>
          ) : null}
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-surface-base/95 backdrop-blur-lg border-t border-line-subtle">
        <div className="max-w-md mx-auto">
          <Button variant="danger" block size="lg" onClick={() => setLeaveOpen(true)}>
            {t("leave_queue_confirm_action")}
          </Button>
        </div>
      </div>

      <ConfirmSheet
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={confirmLeave}
        loading={leaving}
        title={t("leave_queue_title")}
        message={t("leave_queue_message")}
        confirmLabel={t("leave_queue_confirm_action")}
        cancelLabel={t("keep_it")}
        detail={
          Number(queue.position) > 1
            ? t("queue_position", { n: queue.position })
            : t("queue_you_are_next")
        }
      />
    </div>
  );
}
