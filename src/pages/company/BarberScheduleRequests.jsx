import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchTenantScheduleRequests,
  approveScheduleRequest,
  declineScheduleRequest
} from "../../features/scheduleRequests/scheduleRequestsSlice";
import { formatDateOnly } from "../../utils/time";

const STATUS_COLORS = {
  PENDING: "bg-amber-100 text-amber-700",
  PENDING_PARTNER: "bg-amber-100 text-amber-700",
  PENDING_ADMIN: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600"
};

export default function BarberScheduleRequests({ barber }) {
  const dispatch = useAppDispatch();
  const { tenant: requests, tenantLoading } = useAppSelector(s => s.scheduleRequests);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    dispatch(fetchTenantScheduleRequests());
  }, [dispatch]);

  const relevant = requests.filter(
    r => r.RequestingBarberId === barber.Id || r.PartnerBarberId === barber.Id
  );
  const actionable = relevant.filter(
    r => (r.RequestType === "TIME_OFF" && r.Status === "PENDING") ||
         (r.RequestType === "SWAP" && r.Status === "PENDING_ADMIN")
  );
  const other = relevant.filter(r => !actionable.includes(r));

  const handleApprove = (id) => {
    dispatch(approveScheduleRequest(id)).then(() => dispatch(fetchTenantScheduleRequests()));
  };

  const submitDecline = () => {
    dispatch(declineScheduleRequest({ id: declineTarget, reason: declineReason }))
      .then(() => dispatch(fetchTenantScheduleRequests()));
    setDeclineTarget(null);
    setDeclineReason("");
  };

  if (tenantLoading && !relevant.length) {
    return <p className="text-sm text-app-muted">Loading requests...</p>;
  }

  if (!relevant.length) {
    return <p className="text-sm text-app-muted">No time-off or swap requests from this barber.</p>;
  }

  return (
    <div className="space-y-3">
      {actionable.map(r => (
        <div key={r.Id} className="bg-amber-50 border border-amber-200 rounded-[12px] p-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-sm font-bold text-app-text">
              {r.RequestType === "SWAP"
                ? `Swap: ${r.RequestingBarberName} ↔ ${r.PartnerBarberName}`
                : `Time off: ${r.RequestingBarberName}`}
            </p>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Needs your approval
            </span>
          </div>
          <p className="text-xs text-app-muted mb-1">
            {formatDateOnly(r.StartDate)}–{formatDateOnly(r.EndDate)}
            {r.RequestType === "SWAP" && ` in exchange for ${formatDateOnly(r.PartnerStartDate)}–${formatDateOnly(r.PartnerEndDate)}`}
          </p>
          {r.Reason && <p className="text-xs text-app-muted italic mb-2">"{r.Reason}"</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={() => handleApprove(r.Id)} className="px-4 py-1.5 rounded-lg bg-app-accent text-white font-bold text-xs">
              Approve
            </button>
            <button onClick={() => setDeclineTarget(r.Id)} className="px-4 py-1.5 rounded-lg bg-app-surface text-app-muted font-bold text-xs border border-app-border">
              Decline
            </button>
          </div>
          {declineTarget === r.Id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="Reason (optional)"
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-app-border rounded-lg bg-app-surface text-app-text text-xs"
              />
              <button onClick={submitDecline} className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs">Confirm</button>
              <button onClick={() => setDeclineTarget(null)} className="px-3 py-1.5 rounded-lg bg-app-surface-2 text-app-muted font-bold text-xs">Cancel</button>
            </div>
          )}
        </div>
      ))}

      {other.map(r => (
        <div key={r.Id} className="bg-app-surface-2 rounded-[12px] p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-app-text">
              {r.RequestType === "SWAP" ? `Swap: ${r.RequestingBarberName} ↔ ${r.PartnerBarberName}` : `Time off: ${r.RequestingBarberName}`}
            </p>
            <p className="text-[11px] text-app-muted">{formatDateOnly(r.StartDate)}–{formatDateOnly(r.EndDate)}</p>
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[r.Status] || "bg-gray-100 text-gray-600"}`}>
            {r.Status.replace("_", " ")}
          </span>
        </div>
      ))}
    </div>
  );
}
