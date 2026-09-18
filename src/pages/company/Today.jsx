import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchQueue, moveNext, markQueueNoShow, notifyCustomer } from "../../features/queue/queueSlice";
import {
  fetchAppointments,
  markNoShow,
  acceptAppointment,
  arriveForAppointment
} from "../../features/appointments/appointmentsSlice";
import { fetchBarbersForTenant } from "../../features/booking/bookingSlice";
import { fetchBarbers } from "../../features/barbers/barbersSlice";
import { fetchCompanyProfile } from "../../features/company/companySlice";
import { getSocket } from "../../services/socket";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import { ConfirmSheet } from "../../components/ui/BottomSheet";
import { Avatar, Pill, SectionHeader } from "../../components/ui/Primitives";
import { StatStrip, PersonRow } from "../../components/shop/ShopDayComponents";
import SetupBanner from "../../components/setup/SetupBanner";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";
import { formatDuration, formatMoney, formatTime, formatWaitRange, toDate } from "../../utils/format";
import {
  appointmentTotals,
  isActive,
  isCompleted,
  statusLabel,
  statusOf,
  statusTone
} from "../../utils/appointmentStatus";

/*
 * "Today" — the one screen a shop should be able to run its day from
 * (spec §15, §16).
 *
 * Owners and barbers share this screen, and the role decides its scope: a
 * barber sees only their own chair and queue, an owner sees the floor. A
 * barber does not need revenue or per-barber workload, so those sections
 * simply don't render for them (spec §16).
 *
 * The layout is deliberately unequal. What needs a decision right now — who is
 * in the chair, who is next, who has been waiting too long — is at the top at
 * full size. The counters are one compact strip, because a number nobody acts
 * on does not deserve a card of its own.
 */

const QUEUE_WAITING = 1;
const QUEUE_IN_PROGRESS = 2;
const QUEUE_AWAITING_PAYMENT = 6;
const QUEUE_PENDING_APPROVAL = 7;

/* A booking counts as "running late" once the start time has passed and the
   customer still hasn't been checked in. */
const LATE_GRACE_MINUTES = 10;

export default function Today() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const queue = useAppSelector((state) => state.queue);
  const appointments = useAppSelector((state) => state.appointments);
  const barbers = useAppSelector((state) => state.booking.barbers);
  /* The customer-facing roster only lists barbers who are currently bookable.
     Workload has to include whoever is off today too, and only the admin
     endpoint returns them. */
  const allBarbers = useAppSelector((state) => state.barbers.items);
  const company = useAppSelector((state) => state.company.profile);

  const isOwner = Boolean(user?.roles?.includes("ADMIN"));
  const tenantId = user?.tenantId;
  const currency = company?.Currency || "USD";

  /* A barber's own Barbers row — used to scope every list to their chair. */
  const myBarberId = useMemo(() => {
    if (isOwner) return null;
    return barbers.find((b) => b.userId === user?.id)?.barberId || null;
  }, [isOwner, barbers, user?.id]);

  const [confirm, setConfirm] = useState(null);
  const [acting, setActing] = useState(false);

  const today = useMemo(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const load = useCallback(() => {
    dispatch(fetchQueue());
    dispatch(fetchAppointments({ startDate: today, endDate: today }));
    if (tenantId) dispatch(fetchBarbersForTenant({ tenantId }));
    if (isOwner) {
      dispatch(fetchCompanyProfile());
      dispatch(fetchBarbers());
    }
  }, [dispatch, today, tenantId, isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  /* The floor changes under the owner's hands, so the screen follows the same
     socket events the customer app does. */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !tenantId) return;

    socket.emit("join-tenant", tenantId);
    const refresh = () => load();

    socket.on("queue:update", refresh);
    socket.on("appointments:update", refresh);

    return () => {
      socket.off("queue:update", refresh);
      socket.off("appointments:update", refresh);
    };
  }, [tenantId, load]);

  /* ---- queue, scoped to the viewer ---- */
  const myQueue = useMemo(() => {
    const items = myBarberId ? queue.items.filter((i) => i.barberId === myBarberId) : queue.items;
    return {
      inChair: items.filter((i) => i.statusId === QUEUE_IN_PROGRESS),
      waiting: items
        .filter((i) => i.statusId === QUEUE_WAITING)
        .sort((a, b) => String(a.joinedAt).localeCompare(String(b.joinedAt))),
      needsApproval: items.filter((i) => i.statusId === QUEUE_PENDING_APPROVAL),
      needsPayment: items.filter((i) => i.statusId === QUEUE_AWAITING_PAYMENT)
    };
  }, [queue.items, myBarberId]);

  /* ---- today's appointments ---- */
  const todaysAppointments = useMemo(() => {
    const items = myBarberId
      ? appointments.items.filter((a) => a.BarberId === myBarberId)
      : appointments.items;

    return [...items].sort((a, b) => toDate(a.StartTime) - toDate(b.StartTime));
  }, [appointments.items, myBarberId]);

  const upcoming = useMemo(
    () => todaysAppointments.filter((a) => isActive(a) && toDate(a.StartTime) > new Date()),
    [todaysAppointments]
  );

  const late = useMemo(() => {
    const cutoff = Date.now() - LATE_GRACE_MINUTES * 60000;
    return todaysAppointments.filter(
      (a) => isActive(a) && toDate(a.StartTime) && toDate(a.StartTime).getTime() < cutoff
    );
  }, [todaysAppointments]);

  const pendingAppointments = useMemo(
    () => todaysAppointments.filter((a) => statusOf(a) === "PENDING"),
    [todaysAppointments]
  );

  const completed = useMemo(
    () => todaysAppointments.filter(isCompleted),
    [todaysAppointments]
  );

  const revenue = useMemo(
    () => completed.reduce((sum, a) => sum + appointmentTotals(a).price, 0),
    [completed]
  );

  /* Per-barber workload — owners only. */
  const workload = useMemo(() => {
    if (!isOwner) return [];

    /* /barbers returns Id/FullName/ProfileImage; normalise to the same shape
       the rest of this screen uses. */
    return allBarbers.map((barber) => {
      const barberId = barber.Id;
      const queued = queue.items.filter(
        (i) => i.barberId === barberId && i.statusId === QUEUE_WAITING
      );
      const serving = queue.items.find(
        (i) => i.barberId === barberId && i.statusId === QUEUE_IN_PROGRESS
      );
      const booked = todaysAppointments.filter((a) => a.BarberId === barberId && isActive(a));

      return {
        barberId,
        fullName: barber.FullName,
        profileImage: barber.ProfileImage,
        isAvailable: Boolean(barber.IsAvailable),
        queued: queued.length,
        serving,
        booked: booked.length,
        minutes: queued.reduce((sum, i) => sum + Number(i.totalDuration || 0), 0)
      };
    });
  }, [isOwner, allBarbers, queue.items, todaysAppointments]);

  const stats = useMemo(() => {
    const base = [
      { label: t("waiting_now"), value: myQueue.waiting.length },
      { label: t("appointments_today"), value: upcoming.length },
      { label: t("completed_today"), value: completed.length },
      { label: t("late_arrivals"), value: late.length }
    ];

    if (isOwner) {
      base.push({ label: t("revenue_today"), value: formatMoney(revenue, currency) });
    }

    return base;
  }, [t, myQueue.waiting.length, upcoming.length, completed.length, late.length, isOwner, revenue, currency]);

  /* ---- actions ---- */
  const runAction = async (thunk, successKey) => {
    setActing(true);
    try {
      await dispatch(thunk).unwrap();
      if (successKey) toast.success(t(successKey));
      load();
      setConfirm(null);
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setActing(false);
    }
  };

  const isLoading = queue.loading && !queue.items.length && appointments.loading;
  const hasError = queue.error && !queue.items.length;

  return (
    <div className="pb-6">
      <TopBar
        title={t("today_overview")}
        subtitle={new Date().toLocaleDateString(locale === "ar" ? "ar-LB" : "en-US", {
          weekday: "long",
          day: "numeric",
          month: "long"
        })}
        actions={
          <>
            <IconButton icon="refresh" label={t("retry")} onClick={load} />
            {isOwner ? (
              <IconButton icon="plus" label={t("add_walk_in")} to="/company/queue" variant="solid" />
            ) : null}
          </>
        }
      />

      {isLoading ? (
        <div className="px-4 space-y-3">
          <ListSkeleton count={4} />
        </div>
      ) : hasError ? (
        <div className="px-4">
          <ErrorState message={queue.error} onRetry={load} />
        </div>
      ) : (
        <>
          {/* Only an owner can act on it — a barber has no access to services,
              the team or the shop's hours. */}
          {isOwner ? <SetupBanner /> : null}

          <StatStrip stats={stats} />

          {/* ---- needs a decision now ---- */}
          {myQueue.needsApproval.length || pendingAppointments.length ? (
            <section className="px-4 mt-6">
              <SectionHeader
                title={t("queue_pending_title")}
                subtitle={t("queue_pending_sub")}
              />
              <div className="space-y-2.5">
                {myQueue.needsApproval.map((item) => (
                  <PersonRow
                    key={item.id}
                    name={item.customerName}
                    photo={item.customerProfileImage}
                    primary={item.services.map((s) => s.name).join(" + ")}
                    secondary={`${item.barberName} · ${formatDuration(item.totalDuration, t)}`}
                    tone="warning"
                    toneLabel={t("status_pending")}
                    onOpen={() => navigate("/company/queue")}
                    highlight
                  />
                ))}
                {pendingAppointments.map((appointment) => (
                  <PersonRow
                    key={appointment.Id}
                    name={appointment.CustomerName}
                    photo={appointment.CustomerProfileImage}
                    primary={appointmentTotals(appointment).names.join(" + ")}
                    secondary={formatTime(appointment.StartTime, locale)}
                    tone="warning"
                    toneLabel={t("status_pending")}
                    onOpen={() => navigate("/company/appointments")}
                    highlight
                    actions={
                      <Button
                        size="sm"
                        onClick={() => runAction(acceptAppointment(appointment.Id), "accept")}
                      >
                        {t("accept")}
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ---- in the chair ---- */}
          <section className="px-4 mt-6">
            <SectionHeader title={t("current_customer")} />
            {myQueue.inChair.length ? (
              <div className="space-y-2.5">
                {myQueue.inChair.map((item) => (
                  <PersonRow
                    key={item.id}
                    name={item.customerName}
                    photo={item.customerProfileImage}
                    primary={item.services.map((s) => s.name).join(" + ")}
                    secondary={`${isOwner ? `${item.barberName} · ` : ""}${formatDuration(
                      item.totalDuration,
                      t
                    )}`}
                    tone="success"
                    toneLabel={t("busy_now")}
                    onOpen={() => navigate("/company/queue")}
                    highlight
                    actions={
                      <Button
                        size="sm"
                        icon="check"
                        onClick={() =>
                          setConfirm({
                            title: t("complete_service"),
                            message: t("are_you_sure"),
                            confirmLabel: t("complete_service"),
                            destructive: false,
                            action: moveNext({
                              barberId: item.barberId,
                              expectedInChairId: item.id
                            })
                          })
                        }
                      >
                        {t("complete_service")}
                      </Button>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-card bg-surface-raised border border-line-subtle p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-control bg-surface-sunken text-content-muted flex items-center justify-center">
                  <Icon name="scissors" size={19} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-content-primary">{t("free_now")}</p>
                  <p className="text-caption text-content-muted">
                    {myQueue.waiting.length
                      ? t("next_customer") + ": " + myQueue.waiting[0].customerName
                      : t("nobody_waiting")}
                  </p>
                </div>
                {myQueue.waiting.length ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setConfirm({
                        title: t("start_service"),
                        message: t("are_you_sure"),
                        confirmLabel: t("start_service"),
                        destructive: false,
                        /* Starting a service when the chair is empty — there
                           is nobody to complete, so nobody to name. */
                        action: moveNext({
                          barberId: myQueue.waiting[0].barberId,
                          expectedInChairId: null
                        })
                      })
                    }
                  >
                    {t("start_service")}
                  </Button>
                ) : null}
              </div>
            )}
          </section>

          {/* ---- the queue ---- */}
          <section className="px-4 mt-6">
            <SectionHeader
              title={t("live_queue")}
              subtitle={
                myQueue.waiting.length
                  ? formatWaitRange(
                      myQueue.waiting.reduce((sum, i) => sum + Number(i.totalDuration || 0), 0),
                      t
                    )
                  : null
              }
              action={t("manage_queue")}
              actionTo="/company/queue"
            />

            {myQueue.waiting.length ? (
              <ol className="space-y-2.5">
                {myQueue.waiting.slice(0, 6).map((item, index) => (
                  <li key={item.id}>
                    <PersonRow
                      name={item.customerName}
                      photo={item.customerProfileImage}
                      primary={item.services.map((s) => s.name).join(" + ")}
                      secondary={`#${index + 1}${isOwner ? ` · ${item.barberName}` : ""} · ${
                        item.joinedAt ? formatTime(item.joinedAt, locale) : ""
                      }`}
                      onOpen={() => navigate("/company/queue")}
                      actions={
                        <>
                          <IconButton
                            icon="bell"
                            label={t("notifications")}
                            onClick={() => runAction(notifyCustomer(item.id))}
                          />
                          <IconButton
                            icon="x"
                            label={t("mark_no_show")}
                            onClick={() =>
                              setConfirm({
                                title: t("mark_no_show"),
                                message: t("cannot_undo"),
                                confirmLabel: t("mark_no_show"),
                                destructive: true,
                                action: markQueueNoShow(item.id)
                              })
                            }
                          />
                        </>
                      }
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                icon="users"
                title={t("nobody_waiting")}
                description={t("nobody_waiting_body")}
              />
            )}
          </section>

          {/* ---- running late ---- */}
          {late.length ? (
            <section className="px-4 mt-6">
              <SectionHeader title={t("late_arrivals")} />
              <div className="space-y-2.5">
                {late.map((appointment) => (
                  <PersonRow
                    key={appointment.Id}
                    name={appointment.CustomerName}
                    photo={appointment.CustomerProfileImage}
                    primary={appointmentTotals(appointment).names.join(" + ")}
                    secondary={`${formatTime(appointment.StartTime, locale)}${
                      isOwner ? ` · ${appointment.BarberName}` : ""
                    }`}
                    tone="danger"
                    toneLabel={statusLabel(appointment, t)}
                    onOpen={() => navigate("/company/appointments")}
                    actions={
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runAction(arriveForAppointment(appointment.Id))}
                        >
                          {t("check_in")}
                        </Button>
                        <IconButton
                          icon="x"
                          label={t("mark_no_show")}
                          onClick={() =>
                            setConfirm({
                              title: t("mark_no_show"),
                              message: t("cannot_undo"),
                              confirmLabel: t("mark_no_show"),
                              destructive: true,
                              action: markNoShow(appointment.Id)
                            })
                          }
                        />
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* ---- today's bookings ---- */}
          <section className="px-4 mt-6">
            <SectionHeader
              title={t("appointments_today")}
              action={t("manage_appointments")}
              actionTo="/company/appointments"
            />

            {upcoming.length ? (
              <div className="space-y-2.5">
                {upcoming.slice(0, 6).map((appointment) => (
                  <PersonRow
                    key={appointment.Id}
                    name={appointment.CustomerName}
                    photo={appointment.CustomerProfileImage}
                    primary={appointmentTotals(appointment).names.join(" + ")}
                    secondary={`${formatTime(appointment.StartTime, locale)}${
                      isOwner ? ` · ${appointment.BarberName}` : ""
                    }`}
                    tone={statusTone(appointment)}
                    toneLabel={statusLabel(appointment, t)}
                    onOpen={() => navigate("/company/appointments")}
                    actions={
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction(arriveForAppointment(appointment.Id))}
                      >
                        {t("check_in")}
                      </Button>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="calendar"
                title={t("no_appointments_today")}
                description={t("no_appointments_today_body")}
              />
            )}
          </section>

          {/* ---- barber workload (owner only) ---- */}
          {isOwner && workload.length ? (
            <section className="px-4 mt-6">
              <SectionHeader title={t("barber_workload")} action={t("manage_barbers")} actionTo="/company/barbers" />
              <div className="bg-surface-raised border border-line-subtle rounded-card divide-y divide-line-subtle">
                {workload.map((barber) => (
                  <div key={barber.barberId} className="flex items-center gap-3 p-3.5">
                    <Avatar src={barber.profileImage} name={barber.fullName} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-content-primary truncate">
                        {barber.fullName}
                      </p>
                      <p className="text-caption text-content-muted tnum">
                        {barber.queued} {t("waiting_now")} · {barber.booked}{" "}
                        {t("appointments_today")}
                      </p>
                    </div>
                    {barber.serving ? (
                      <Pill tone="success" dot>
                        {t("busy_now")}
                      </Pill>
                    ) : barber.isAvailable ? (
                      <Pill tone="neutral">{t("free_now")}</Pill>
                    ) : (
                      <Pill tone="neutral">{t("off_today")}</Pill>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* ---- payments waiting on the shop ---- */}
          {myQueue.needsPayment.length ? (
            <section className="px-4 mt-6">
              <SectionHeader title={t("payment_pending")} action={t("manage_queue")} actionTo="/company/queue" />
              <div className="space-y-2.5">
                {myQueue.needsPayment.map((item) => (
                  <PersonRow
                    key={item.id}
                    name={item.customerName}
                    photo={item.customerProfileImage}
                    primary={item.services.map((s) => s.name).join(" + ")}
                    secondary={item.paymentReference || t("unpaid")}
                    tone="warning"
                    toneLabel={t("status_awaiting_payment")}
                    onOpen={() => navigate("/company/queue")}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <ConfirmSheet
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && runAction(confirm.action)}
        loading={acting}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
      />
    </div>
  );
}
