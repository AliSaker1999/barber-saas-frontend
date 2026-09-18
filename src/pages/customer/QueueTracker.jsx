import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  findMyActiveQueue,
  leaveQueue,
  reportQueuePaymentThunk
} from "../../features/queue/queueSlice";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { getSocket } from "../../services/socket";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import RateBarberModal from "../../components/RateBarberModal";
import { Avatar, Pill } from "../../components/ui/Primitives";
import { QueueStatusHero, QueueProgress } from "../../components/ui/QueueStatusCard";
import { QUEUE_STATUS } from "../../utils/queueStatus";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { formatDuration, formatMoney, formatTime } from "../../utils/format";
import { shopWhatsappHref, telHref } from "../../config/support";
import { localized } from "../../utils/localized";

/*
 * Live queue tracker (spec §12) — the screen that makes the product's core
 * promise concrete: you know where you are in line and roughly how long it
 * will be, without phoning the shop.
 *
 * Two things matter more than looks here:
 *   1. Honesty. The ETA is a range, and if the websocket drops the screen says
 *      it is no longer live rather than showing a number that has quietly gone
 *      stale.
 *   2. Not losing your place by accident. "Leave queue" is behind a
 *      confirmation that spells out the consequence.
 */

/* Sockets can drop silently on mobile. A slow poll is the safety net: if the
   live channel is healthy this is nearly free, and if it isn't the position
   still moves. */
const POLL_MS = 45000;

export default function QueueTracker() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const queue = useAppSelector((state) => state.queue.activeQueue);
  const shops = useAppSelector((state) => state.tenants.tenants);
  const isOnline = useAppSelector((state) => state.ui.isOnline);

  const [loading, setLoading] = useState(!queue);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(true);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [reporting, setReporting] = useState(false);
  const [rateFor, setRateFor] = useState(null);

  const shop = shops.find((s) => s.Id === queue?.tenantId) || null;
  const currency = queue?.currency || shop?.Currency || "USD";

  const refresh = useCallback(async () => {
    try {
      await dispatch(findMyActiveQueue()).unwrap();
      setError(null);
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic_body"));
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    refresh();
    if (!shops.length) dispatch(fetchTenants());
  }, [refresh, dispatch, shops.length]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      setLive(false);
      return;
    }

    const onUpdate = () => {
      setLive(true);
      refresh();
    };
    const onDisconnect = () => setLive(false);
    const onConnect = () => {
      setLive(true);
      refresh();
    };

    socket.on("queue:update", onUpdate);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    setLive(socket.connected !== false);

    return () => {
      socket.off("queue:update", onUpdate);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [refresh]);

  useEffect(() => {
    if (!queue) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [queue, refresh]);

  const confirmLeave = async () => {
    if (!queue?.tenantId) return;
    setLeaving(true);
    try {
      await dispatch(leaveQueue(queue.tenantId)).unwrap();
      setLeaveOpen(false);
      toast.success(t("queue_left"));
      navigate("/customer");
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setLeaving(false);
    }
  };

  const reportPayment = async () => {
    if (!reference.trim() || !queue?.queueId) return;
    setReporting(true);
    try {
      await dispatch(
        reportQueuePaymentThunk({ queueId: queue.queueId, reference: reference.trim() })
      ).unwrap();
      setPayOpen(false);
      setReference("");
      toast.success(t("payment_reported"));
      refresh();
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setReporting(false);
    }
  };

  /* ---- states ---- */
  if (loading) {
    return (
      <div>
        <TopBar title={t("queue_status")} />
        <div className="px-4 space-y-4 pt-6">
          <Skeleton className="h-40 w-full" rounded="rounded-card" />
          <Skeleton className="h-16 w-full" rounded="rounded-card" />
          <Skeleton className="h-28 w-full" rounded="rounded-card" />
        </div>
      </div>
    );
  }

  if (error && !queue) {
    return (
      <div>
        <TopBar title={t("queue_status")} />
        <div className="px-4 pt-6">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  if (!queue) {
    return (
      <div>
        <TopBar title={t("queue_status")} />
        <EmptyState
          icon="clock"
          title={t("not_in_queue_title")}
          description={t("not_in_queue_body")}
          actionLabel={t("find_a_barber")}
          actionTo="/customer/explore"
          className="pt-10"
        />
      </div>
    );
  }

  const needsPayment = queue.statusId === QUEUE_STATUS.AWAITING_PAYMENT;
  const servicesTotal = (queue.services || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
  const servicesDuration =
    queue.totalDuration ||
    (queue.services || []).reduce((sum, s) => sum + Number(s.duration || 0), 0);

  return (
    <div className="pb-28">
      <TopBar
        title={queue.tenantName}
        subtitle={queue.tenantArea || shop?.Area || undefined}
        actions={
          <Button variant="ghost" size="sm" icon="refresh" onClick={refresh}>
            {t("retry")}
          </Button>
        }
      />

      {/* ---- position + ETA ---- */}
      <div className="px-4">
        <QueueStatusHero queue={queue} stale={!live || !isOnline} />
      </div>

      {/* ---- progress ---- */}
      <div className="px-4 mt-2">
        <div className="bg-surface-raised border border-line-subtle rounded-card p-4">
          <QueueProgress queue={queue} />
        </div>
      </div>

      {/* ---- payment gate ---- */}
      {needsPayment ? (
        <div className="px-4 mt-3">
          <div className="rounded-card bg-state-warning-soft border border-line-subtle p-4">
            <div className="flex items-start gap-3">
              <Icon name="wallet" size={20} className="text-state-warning flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-body font-bold text-content-primary">
                  {t("queue_payment_title")}
                </p>
                <p className="text-body-sm text-content-secondary">{t("queue_payment_sub")}</p>
              </div>
            </div>
            <div className="mt-3">
              <Button block icon="wallet" onClick={() => setPayOpen(true)}>
                {t("pay_now")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- details ---- */}
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
            {queue.statusId === QUEUE_STATUS.IN_PROGRESS ? (
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
                {(queue.services || [])
                  .map((s) => localized(s, "name", locale))
                  .filter(Boolean)
                  .join(" + ") || "—"}
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

      {/* ---- reach the shop ---- */}
      {telHref(queue.tenantPhone) || shopWhatsappHref(queue.tenantWhatsapp) || queue.tenantMapLink ? (
        <section className="px-4 mt-3 flex gap-2">
          {queue.tenantMapLink ? (
            <Button
              variant="secondary"
              size="sm"
              icon="navigate"
              href={queue.tenantMapLink}
              target="_blank"
              rel="noreferrer"
            >
              {t("get_directions")}
            </Button>
          ) : null}
          {telHref(queue.tenantPhone) ? (
            <Button variant="secondary" size="sm" icon="phone" href={telHref(queue.tenantPhone)}>
              {t("call")}
            </Button>
          ) : null}
          {shopWhatsappHref(queue.tenantWhatsapp) ? (
            <Button
              variant="secondary"
              size="sm"
              icon="whatsapp"
              href={shopWhatsappHref(queue.tenantWhatsapp)}
              target="_blank"
              rel="noreferrer"
            >
              {t("whatsapp_support")}
            </Button>
          ) : null}
        </section>
      ) : null}

      {/* ---- leave ---- */}
      <div
        className="fixed inset-x-0 z-40 px-4 pt-3 pb-3 bg-surface-base/95 backdrop-blur-lg border-t border-line-subtle
                   bottom-[calc(theme(spacing.navbar)+env(safe-area-inset-bottom))] lg:bottom-0"
      >
        <div className="max-w-6xl mx-auto">
          {queue.statusId === QUEUE_STATUS.IN_PROGRESS ? (
            <Button
              block
              size="lg"
              icon="star"
              onClick={() => setRateFor({ barberId: queue.barberId, queueId: queue.queueId })}
            >
              {t("rate_barber")}
            </Button>
          ) : (
            <Button variant="danger" block size="lg" onClick={() => setLeaveOpen(true)}>
              {t("leave_queue_confirm_action")}
            </Button>
          )}
        </div>
      </div>

      {/* ---- sheets ---- */}
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
          queue.position > 1
            ? t("queue_position", { n: queue.position })
            : t("queue_you_are_next")
        }
      />

      <BottomSheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={t("payment_options")}
        subtitle={queue.tenantName}
        footer={
          <Button block loading={reporting} disabled={!reference.trim()} onClick={reportPayment}>
            {t("confirm_transfer")}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-card bg-surface-sunken p-3.5">
            <p className="text-caption text-content-muted">{t("send_payment_to")}</p>
            <p className="text-h2 text-content-primary tnum">
              {queue.whishPhoneNumber || t("not_set")}
            </p>
            <p className="mt-2 text-caption text-content-muted">{t("amount_due")}</p>
            <p className="text-h3 text-content-primary tnum">
              {/* The hold the shop asked for, not the price of the haircut.
                  This showed servicesTotal, so a customer sitting in an
                  AWAITING_PAYMENT entry — which exists because of
                  Queue.DepositAmount — was told to transfer the full service
                  price. The appointment side has always used the deposit. */}
              {formatMoney(queue.depositAmount ?? servicesTotal, currency)}
            </p>
            {queue.depositAmount != null && queue.depositAmount < servicesTotal ? (
              <p className="text-caption text-content-muted">
                {t("deposit_then_rest", {
                  total: formatMoney(servicesTotal, currency)
                })}
              </p>
            ) : null}
          </div>

          <p className="text-body-sm text-content-secondary">{t("whish_instructions")}</p>

          <label className="block">
            <span className="block text-label uppercase text-content-muted mb-1.5">
              {t("transaction_id_label")}
            </span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={t("enter_transaction_id")}
              className="w-full h-12 px-3.5 rounded-control bg-surface-raised border border-line-subtle
                         text-body text-content-primary focus:border-brand-gold focus:outline-none"
            />
          </label>
        </div>
      </BottomSheet>

      <RateBarberModal
        isOpen={Boolean(rateFor)}
        barberId={rateFor?.barberId}
        queueId={rateFor?.queueId}
        onClose={() => setRateFor(null)}
        onSuccess={() => {
          toast.success(t("thank_you_rating"));
          refresh();
        }}
      />
    </div>
  );
}
