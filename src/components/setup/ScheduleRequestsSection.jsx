import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchTenantScheduleRequests,
  approveScheduleRequest,
  declineScheduleRequest
} from "../../features/scheduleRequests/scheduleRequestsSlice";
import { formatDateOnly } from "../../utils/time";
import Icon from "../ui/Icon";
import Button from "../ui/Button";
import Field from "../ui/Field";
import { SectionHeader, Pill } from "../ui/Primitives";
import BottomSheet from "../ui/BottomSheet";

/*
 * Time-off and swap requests.
 *
 * Rendered once for the whole shop, not once per barber. It always fetched
 * every tenant request and filtered client-side anyway, so the per-barber
 * version was a redundant request — and worse, it meant a pending approval was
 * invisible until the owner happened to tap the barber who raised it.
 */

const STATUS_TONE = {
  PENDING: "warning",
  PENDING_PARTNER: "warning",
  PENDING_ADMIN: "warning",
  APPROVED: "success",
  DECLINED: "danger",
  CANCELLED: "neutral"
};

/* Only these are the owner's to act on: a swap still waiting on the other
   barber is not yet the shop's decision. */
const needsOwner = (request) =>
  (request.RequestType === "TIME_OFF" && request.Status === "PENDING") ||
  (request.RequestType === "SWAP" && request.Status === "PENDING_ADMIN");

export default function ScheduleRequestsSection() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { tenant: requests, tenantLoading } = useAppSelector((state) => state.scheduleRequests);

  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    dispatch(fetchTenantScheduleRequests());
  }, [dispatch]);

  const actionable = requests.filter(needsOwner);
  const history = requests.filter((request) => !needsOwner(request));

  async function run(thunk) {
    setActing(true);
    try {
      await dispatch(thunk).unwrap();
      await dispatch(fetchTenantScheduleRequests());
    } finally {
      setActing(false);
      setDeclineTarget(null);
      setDeclineReason("");
    }
  }

  if (tenantLoading && !requests.length) return null;
  if (!requests.length) return null;

  const title = (request) =>
    request.RequestType === "SWAP"
      ? t("request_swap_title", {
          a: request.RequestingBarberName,
          b: request.PartnerBarberName
        })
      : t("request_time_off_title", { name: request.RequestingBarberName });

  const dates = (request) =>
    `${formatDateOnly(request.StartDate)} – ${formatDateOnly(request.EndDate)}`;

  return (
    <section>
      <SectionHeader
        title={t("schedule_requests")}
        subtitle={
          actionable.length ? t("requests_awaiting", { n: actionable.length }) : undefined
        }
      />

      <ul className="space-y-2">
        {actionable.map((request) => (
          <li
            key={request.Id}
            className="p-3.5 rounded-card bg-brand-gold-soft border border-brand-gold"
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 text-body font-bold text-content-primary">{title(request)}</p>
              <Pill tone="warning">{t("needs_approval")}</Pill>
            </div>

            <p className="mt-1 text-body-sm text-content-secondary tnum">{dates(request)}</p>
            {request.RequestType === "SWAP" ? (
              <p className="text-caption text-content-muted tnum">
                {t("request_swap_for", {
                  range: `${formatDateOnly(request.PartnerStartDate)} – ${formatDateOnly(
                    request.PartnerEndDate
                  )}`
                })}
              </p>
            ) : null}
            {request.Reason ? (
              <p className="mt-1 text-body-sm text-content-secondary">{request.Reason}</p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={acting}
                onClick={() => run(approveScheduleRequest(request.Id))}
              >
                {t("approve")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={acting}
                onClick={() => setDeclineTarget(request)}
              >
                {t("decline")}
              </Button>
            </div>
          </li>
        ))}

        {history.map((request) => (
          <li
            key={request.Id}
            className="flex items-center gap-3 p-3.5 rounded-card bg-surface-raised border border-line-subtle"
          >
            <Icon name="calendar" size={18} className="flex-shrink-0 text-content-muted" />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-semibold text-content-primary truncate">
                {title(request)}
              </p>
              <p className="text-caption text-content-muted tnum">{dates(request)}</p>
            </div>
            <Pill tone={STATUS_TONE[request.Status] || "neutral"}>
              {t(`request_status_${request.Status.toLowerCase()}`)}
            </Pill>
          </li>
        ))}
      </ul>

      <BottomSheet
        open={Boolean(declineTarget)}
        onClose={() => setDeclineTarget(null)}
        title={t("decline_request_title")}
        subtitle={declineTarget ? title(declineTarget) : undefined}
        footer={
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              block
              onClick={() => setDeclineTarget(null)}
              disabled={acting}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="danger-solid"
              block
              loading={acting}
              onClick={() =>
                run(declineScheduleRequest({ id: declineTarget.Id, reason: declineReason }))
              }
            >
              {t("decline")}
            </Button>
          </div>
        }
      >
        <p className="text-body-sm text-content-secondary mb-3">{t("decline_request_message")}</p>
        <Field
          label={t("reason")}
          optional
          optionalLabel={t("optional")}
          value={declineReason}
          onChange={(event) => setDeclineReason(event.target.value)}
          as="textarea"
          hint={t("decline_request_hint")}
        />
      </BottomSheet>
    </section>
  );
}
