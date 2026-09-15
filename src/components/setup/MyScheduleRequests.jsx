import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchMyScheduleRequests,
  requestTimeOff,
  requestSwap,
  respondToSwap,
  cancelScheduleRequest
} from "../../features/scheduleRequests/scheduleRequestsSlice";
import { fetchBarbers } from "../../features/barbers/barbersSlice";
import { formatDateOnly } from "../../utils/time";
import Button from "../ui/Button";
import Field from "../ui/Field";
import Select from "../ui/Select";
import { Pill, SectionHeader } from "../ui/Primitives";
import BottomSheet, { ConfirmSheet } from "../ui/BottomSheet";
import { EmptyState, InlineError, ListSkeleton } from "../ui/States";

/*
 * A barber asking for time off, or to trade shifts.
 *
 * The owner side of this already lives in ScheduleRequestsSection; this is the
 * half the barber sees. Three things it now does that the old version did not:
 * accepting a colleague's swap is a commitment to work their days, so it is
 * confirmed with those dates spelled out rather than being a bare Accept
 * button; withdrawing a request the shop may be about to approve is confirmed
 * too; and a request whose end date precedes its start is refused here instead
 * of at the server.
 *
 * The two forms are sheets rather than always-open cards because on a phone
 * they were most of the screen, permanently, for something a barber does a
 * handful of times a year.
 */

const STATUS_TONE = {
  PENDING: "warning",
  PENDING_PARTNER: "warning",
  PENDING_ADMIN: "warning",
  APPROVED: "success",
  DECLINED: "danger",
  CANCELLED: "neutral"
};

const OPEN_STATUSES = ["PENDING", "PENDING_PARTNER", "PENDING_ADMIN"];

const emptyTimeOff = { startDate: "", endDate: "", reason: "" };
const emptySwap = {
  partnerBarberId: "",
  startDate: "",
  endDate: "",
  partnerStartDate: "",
  partnerEndDate: "",
  reason: ""
};

export default function MyScheduleRequests({ barberId }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { mine, mineLoading, actionLoading, actionError } = useAppSelector(
    (state) => state.scheduleRequests
  );
  const allBarbers = useAppSelector((state) => state.barbers.items);

  const [sheet, setSheet] = useState(null);
  const [timeOff, setTimeOff] = useState(emptyTimeOff);
  const [swap, setSwap] = useState(emptySwap);
  const [formError, setFormError] = useState("");
  const [respondTo, setRespondTo] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    dispatch(fetchMyScheduleRequests());
    /* For the colleague picker. */
    dispatch(fetchBarbers());
  }, [dispatch]);

  const colleagues = (allBarbers || [])
    .filter((barber) => barber.Id !== barberId)
    .map((barber) => ({ value: barber.Id, label: barber.FullName, icon: "user" }));

  const incoming = mine.filter(
    (request) =>
      request.RequestType === "SWAP" &&
      request.PartnerBarberId === barberId &&
      request.Status === "PENDING_PARTNER"
  );
  const ownRequests = mine.filter((request) => request.RequestingBarberId === barberId);

  const range = (from, to) => `${formatDateOnly(from)} - ${formatDateOnly(to)}`;

  function openSheet(which) {
    setFormError("");
    if (which === "timeOff") setTimeOff(emptyTimeOff);
    if (which === "swap") setSwap(emptySwap);
    setSheet(which);
  }

  async function submitTimeOff() {
    setFormError("");
    if (!timeOff.startDate || !timeOff.endDate) {
      setFormError(t("fill_all_fields"));
      return;
    }
    if (timeOff.endDate < timeOff.startDate) {
      setFormError(t("request_dates_backwards"));
      return;
    }

    try {
      await dispatch(requestTimeOff(timeOff)).unwrap();
      setSheet(null);
      toast.success(t("time_off_submitted"));
      dispatch(fetchMyScheduleRequests());
    } catch (err) {
      setFormError(typeof err === "string" ? err : t("error_generic"));
    }
  }

  async function submitSwap() {
    setFormError("");
    if (!swap.partnerBarberId) {
      setFormError(t("swap_needs_partner"));
      return;
    }
    if (!swap.startDate || !swap.endDate || !swap.partnerStartDate || !swap.partnerEndDate) {
      setFormError(t("swap_needs_dates"));
      return;
    }
    if (swap.endDate < swap.startDate || swap.partnerEndDate < swap.partnerStartDate) {
      setFormError(t("request_dates_backwards"));
      return;
    }

    try {
      await dispatch(requestSwap(swap)).unwrap();
      setSheet(null);
      toast.success(t("swap_submitted"));
      dispatch(fetchMyScheduleRequests());
    } catch (err) {
      setFormError(typeof err === "string" ? err : t("error_generic"));
    }
  }

  async function confirmRespond() {
    if (!respondTo) return;
    try {
      await dispatch(
        respondToSwap({ id: respondTo.request.Id, accept: respondTo.accept })
      ).unwrap();
      dispatch(fetchMyScheduleRequests());
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setRespondTo(null);
    }
  }

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      await dispatch(cancelScheduleRequest(cancelling.Id)).unwrap();
      dispatch(fetchMyScheduleRequests());
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-3">
      <SectionHeader title={t("my_schedule_title")} subtitle={t("my_schedule_sub")} />

      {actionError ? <InlineError message={actionError} /> : null}

      {incoming.length ? (
        <div className="space-y-2">
          <p className="text-label uppercase text-content-muted">{t("swap_incoming_title")}</p>
          {incoming.map((request) => (
            <div
              key={request.Id}
              className="p-3.5 rounded-card bg-surface-raised border border-line-subtle"
            >
              <p className="text-body font-bold text-content-primary">
                {request.RequestingBarberName}
              </p>
              <p className="text-caption text-content-muted">
                {t("swap_incoming_body", {
                  theirs: range(request.PartnerStartDate, request.PartnerEndDate),
                  yours: range(request.StartDate, request.EndDate)
                })}
              </p>
              {request.Reason ? (
                <p className="text-caption text-content-muted mt-0.5">{request.Reason}</p>
              ) : null}

              <div className="flex gap-2 mt-2.5">
                <Button
                  size="sm"
                  onClick={() => setRespondTo({ request, accept: true })}
                >
                  {t("swap_accept")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRespondTo({ request, accept: false })}
                >
                  {t("swap_decline")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button variant="secondary" block icon="calendar" onClick={() => openSheet("timeOff")}>
          {t("request_time_off_action")}
        </Button>
        <Button variant="secondary" block icon="refresh" onClick={() => openSheet("swap")}>
          {t("propose_swap_action")}
        </Button>
      </div>

      <p className="text-label uppercase text-content-muted pt-1">{t("my_requests")}</p>

      {mineLoading && !ownRequests.length ? (
        <ListSkeleton count={2} />
      ) : !ownRequests.length ? (
        <EmptyState
          icon="calendar"
          title={t("no_requests_yet")}
          description={t("no_requests_sub")}
        />
      ) : (
        <ul className="space-y-2">
          {ownRequests.map((request) => (
            <li
              key={request.Id}
              className="p-3.5 rounded-card bg-surface-raised border border-line-subtle"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-content-primary">
                    {request.RequestType === "SWAP"
                      ? t("swap_with_label", { name: request.PartnerBarberName })
                      : t("time_off_label")}
                  </p>
                  <p className="text-caption text-content-muted tnum">
                    {range(request.StartDate, request.EndDate)}
                  </p>
                  {request.RequestType === "SWAP" ? (
                    <p className="text-caption text-content-muted tnum">
                      {t("swap_in_exchange", {
                        range: range(request.PartnerStartDate, request.PartnerEndDate)
                      })}
                    </p>
                  ) : null}
                  {request.DeclineReason ? (
                    <p className="text-caption text-state-danger mt-0.5">
                      {t("declined_reason", { reason: request.DeclineReason })}
                    </p>
                  ) : null}
                </div>

                <Pill tone={STATUS_TONE[request.Status] || "neutral"}>
                  {t(`request_status_${String(request.Status).toLowerCase()}`)}
                </Pill>
              </div>

              {OPEN_STATUSES.includes(request.Status) ? (
                <Button
                  variant="danger"
                  size="sm"
                  className="mt-2.5"
                  onClick={() => setCancelling(request)}
                >
                  {t("cancel_request")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={sheet === "timeOff"}
        onClose={() => setSheet(null)}
        title={t("request_time_off_title")}
        footer={
          <Button block onClick={submitTimeOff} loading={actionLoading}>
            {t("send_request")}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-3">
            <Field
              className="flex-1"
              label={t("from_date")}
              value={timeOff.startDate}
              onChange={(event) => setTimeOff((f) => ({ ...f, startDate: event.target.value }))}
              type="date"
              dir="ltr"
            />
            <Field
              className="flex-1"
              label={t("to_date")}
              value={timeOff.endDate}
              onChange={(event) => setTimeOff((f) => ({ ...f, endDate: event.target.value }))}
              type="date"
              dir="ltr"
            />
          </div>
          <Field
            label={t("reason")}
            optional
            optionalLabel={t("optional")}
            value={timeOff.reason}
            onChange={(event) => setTimeOff((f) => ({ ...f, reason: event.target.value }))}
          />
          {formError ? <InlineError message={formError} /> : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === "swap"}
        onClose={() => setSheet(null)}
        title={t("request_swap_title")}
        footer={
          <Button block onClick={submitSwap} loading={actionLoading}>
            {t("send_request")}
          </Button>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">
              {t("swap_partner_label")}
            </p>
            <Select
              value={swap.partnerBarberId}
              onChange={(event) =>
                setSwap((f) => ({ ...f, partnerBarberId: event.target.value }))
              }
              options={colleagues}
              placeholder={t("swap_pick_colleague")}
              aria-label={t("swap_partner_label")}
            />
          </div>

          <div>
            <p className="text-body-sm font-semibold text-content-primary mb-1.5">
              {t("you_give_up")}
            </p>
            <div className="flex gap-3">
              <Field
                className="flex-1"
                label={t("from_date")}
                value={swap.startDate}
                onChange={(event) => setSwap((f) => ({ ...f, startDate: event.target.value }))}
                type="date"
                dir="ltr"
              />
              <Field
                className="flex-1"
                label={t("to_date")}
                value={swap.endDate}
                onChange={(event) => setSwap((f) => ({ ...f, endDate: event.target.value }))}
                type="date"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <p className="text-body-sm font-semibold text-content-primary mb-1.5">
              {t("you_cover")}
            </p>
            <div className="flex gap-3">
              <Field
                className="flex-1"
                label={t("from_date")}
                value={swap.partnerStartDate}
                onChange={(event) =>
                  setSwap((f) => ({ ...f, partnerStartDate: event.target.value }))
                }
                type="date"
                dir="ltr"
              />
              <Field
                className="flex-1"
                label={t("to_date")}
                value={swap.partnerEndDate}
                onChange={(event) =>
                  setSwap((f) => ({ ...f, partnerEndDate: event.target.value }))
                }
                type="date"
                dir="ltr"
              />
            </div>
          </div>

          <Field
            label={t("reason")}
            optional
            optionalLabel={t("optional")}
            value={swap.reason}
            onChange={(event) => setSwap((f) => ({ ...f, reason: event.target.value }))}
          />

          {formError ? <InlineError message={formError} /> : null}
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={Boolean(respondTo)}
        onClose={() => setRespondTo(null)}
        onConfirm={confirmRespond}
        loading={actionLoading}
        destructive={respondTo ? !respondTo.accept : false}
        title={
          respondTo?.accept ? t("swap_accept_confirm_title") : t("swap_decline_confirm_title")
        }
        message={
          respondTo?.accept
            ? t("swap_accept_confirm_message", {
                range: respondTo ? range(respondTo.request.StartDate, respondTo.request.EndDate) : ""
              })
            : t("swap_decline_confirm_message")
        }
        confirmLabel={respondTo?.accept ? t("swap_accept") : t("swap_decline")}
      />

      <ConfirmSheet
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
        loading={actionLoading}
        title={t("cancel_request_title")}
        message={t("cancel_request_message")}
        confirmLabel={t("cancel_request")}
      />
    </div>
  );
}
