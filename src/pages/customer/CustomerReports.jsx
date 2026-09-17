import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchCustomerDashboard } from "../../features/reports/reportsSlice";
import { formatMoney } from "../../utils/format";
import { formatDateOnly } from "../../utils/time";
import { localized } from "../../utils/localized";
import TopBar from "../../components/ui/TopBar";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import { Avatar, Pill, SectionHeader } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import RateBarberModal from "../../components/RateBarberModal";

/*
 * A customer looking back at what they have spent and where.
 *
 * The old version had two bugs that between them made half the screen
 * meaningless, and a third that made it dishonest.
 *
 * It read `stats.TotalAppointments`; getCustomerDashboard returns
 * `TotalVisits`. The Appointments tile rendered blank and Reliability, which
 * divides by it, was permanently "0%".
 *
 * And it printed a single `$${stats.TotalSpent}`, where TotalSpent was
 * SUM(Price) across every shop with nothing consulting Tenants.Currency — so
 * a customer with a $20 cut in Beirut and a 1,800,000 L.L. cut in Tripoli was
 * shown "$1,800,020". That is precisely the silent conversion the product
 * promises never to make. The query now groups by currency and this screen
 * labels each total in the currency it was actually charged in.
 */

const STATUS_TONE = {
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger"
};

export default function CustomerReports() {
  const dispatch = useAppDispatch();
  const { t, locale } = useI18n();

  const { customerDashboard, loading, error } = useAppSelector((state) => state.reports);

  const [rating, setRating] = useState(null);

  useEffect(() => {
    dispatch(fetchCustomerDashboard());
  }, [dispatch]);

  if (loading && !customerDashboard) {
    return (
      <div className="pb-8">
        <TopBar title={t("your_stats")} subtitle={t("your_stats_sub")} />
        <div className="px-4 pt-3">
          <ListSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (!customerDashboard) {
    return (
      <div className="pb-8">
        <TopBar title={t("your_stats")} subtitle={t("your_stats_sub")} />
        <div className="px-4 pt-3">
          {error ? (
            <ErrorState
              message={error}
              onRetry={() => dispatch(fetchCustomerDashboard())}
            />
          ) : (
            <EmptyState
              icon="chart"
              title={t("stats_empty_title")}
              description={t("stats_empty_sub")}
              actionLabel={t("find_a_barber")}
              actionTo="/customer/explore"
            />
          )}
        </div>
      </div>
    );
  }

  const {
    stats,
    spendByCurrency = [],
    shopSpending = [],
    servicePrefs = [],
    recentActivities = []
  } = customerDashboard;

  const totalVisits = stats?.TotalVisits ?? 0;
  const completed = stats?.CompletedCount ?? 0;
  /* Kept honest about division by zero: a customer with no visits is not 0%
     reliable, they are simply new. */
  const reliability = totalVisits > 0 ? Math.round((completed / totalVisits) * 100) : null;

  return (
    <div className="pb-8">
      <TopBar title={t("your_stats")} subtitle={t("your_stats_sub")} />

      <div className="px-4 pt-3 space-y-5">
        {/* ---- the three numbers ---- */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label={t("stats_visits")} value={totalVisits} />
          <Stat label={t("stats_completed")} value={completed} />
          <Stat
            label={t("stats_reliability")}
            value={reliability === null ? "—" : `${reliability}%`}
          />
        </div>

        {/* ---- spend, one line per currency ---- */}
        <section>
          <SectionHeader title={t("stats_spend")} subtitle={t("stats_spend_sub")} />
          {!spendByCurrency.length ? (
            <p className="text-body-sm text-content-muted">{t("stats_no_spend")}</p>
          ) : (
            <div className="space-y-2">
              {spendByCurrency.map((row) => (
                <div
                  key={row.Currency}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-card bg-surface-raised border border-line-subtle"
                >
                  <span className="text-body-sm text-content-secondary">
                    {t("stats_spent_in", { currency: row.Currency })}
                  </span>
                  <span className="text-h2 text-content-primary tnum">
                    {formatMoney(row.TotalSpent, row.Currency)}
                  </span>
                </div>
              ))}
              {spendByCurrency.length > 1 ? (
                /* Two currencies are two numbers. Adding them would need a rate
                   the app deliberately does not have. */
                <p className="text-caption text-content-muted">{t("stats_two_currencies")}</p>
              ) : null}
            </div>
          )}
        </section>

        {/* ---- shops ---- */}
        {shopSpending.length ? (
          <section>
            <SectionHeader title={t("stats_your_shops")} />
            <ul className="space-y-2">
              {shopSpending.map((shop) => (
                <li key={shop.TenantId}>
                  <Link
                    to={`/customer/shop/${shop.TenantId}`}
                    className="press flex items-center gap-3 p-3.5 rounded-card bg-surface-raised border border-line-subtle"
                  >
                    <Avatar name={localized(shop, "TenantName", locale)} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-content-primary truncate">
                        {localized(shop, "TenantName", locale)}
                      </p>
                      <p className="text-caption text-content-muted tnum">
                        {t("stats_visits_and_last", {
                          n: shop.VisitCount,
                          date: formatDateOnly(shop.LastVisit)
                        })}
                      </p>
                    </div>
                    <span className="text-body font-bold text-content-primary tnum flex-shrink-0">
                      {formatMoney(shop.TotalSpent, shop.Currency)}
                    </span>
                    <Icon name="chevron-right" size={18} className="text-content-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---- what they get ---- */}
        {servicePrefs.length ? (
          <section>
            <SectionHeader title={t("stats_services")} subtitle={t("stats_services_sub")} />
            <ul className="space-y-2">
              {servicePrefs.map((pref) => (
                <li
                  key={`${pref.TenantId}-${pref.ServiceId}`}
                  className="flex items-center gap-3 p-3 rounded-card bg-surface-raised border border-line-subtle"
                >
                  <span className="flex-shrink-0 min-w-[36px] h-9 px-2 rounded-control bg-surface-sunken flex items-center justify-center text-body-sm font-bold text-content-primary tnum">
                    {pref.Count}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-content-primary truncate">
                      {localized(pref, "ServiceName", locale)}
                    </p>
                    {/* The shop is part of the identity: two shops' "Haircut"
                        are different services at different prices, and the
                        query used to merge them by name. */}
                    <p className="text-caption text-content-muted truncate">
                      {pref.TenantName}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---- history ---- */}
        <section>
          <SectionHeader title={t("stats_history")} />
          {!recentActivities.length ? (
            <EmptyState
              icon="clock"
              title={t("stats_no_history")}
              description={t("stats_no_history_sub")}
            />
          ) : (
            <ul className="space-y-2">
              {recentActivities.map((activity) => (
                <li
                  key={`${activity.Type}-${activity.VisitId}`}
                  className="p-3.5 rounded-card bg-surface-raised border border-line-subtle"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-content-primary truncate">
                        {localized(activity, "TenantName", locale)}
                      </p>
                      <p className="text-caption text-content-muted truncate">
                        {activity.Services || t("stats_no_services_listed")}
                      </p>
                      <p className="text-caption text-content-muted tnum">
                        {formatDateOnly(activity.Date)}
                      </p>
                    </div>

                    <Pill tone={STATUS_TONE[activity.Status] || "neutral"}>
                      {t(`activity_status_${String(activity.Status).toLowerCase()}`)}
                    </Pill>
                  </div>

                  {activity.Status === "COMPLETED" ? (
                    activity.IsRated ? (
                      <p className="flex items-center gap-1.5 mt-2 text-caption text-content-muted">
                        <Icon name="check" size={14} className="text-state-success" />
                        {t("stats_rated")}
                      </p>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2.5"
                        icon="star"
                        onClick={() =>
                          setRating({
                            barberId: activity.BarberId,
                            appointmentId: activity.Type === "Appointment" ? activity.VisitId : null,
                            queueId: activity.Type === "Walk-in" ? activity.VisitId : null
                          })
                        }
                      >
                        {t("stats_rate_visit")}
                      </Button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <RateBarberModal
        isOpen={Boolean(rating)}
        onClose={() => setRating(null)}
        barberId={rating?.barberId}
        appointmentId={rating?.appointmentId}
        queueId={rating?.queueId}
        onSuccess={() => dispatch(fetchCustomerDashboard())}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-card bg-surface-raised border border-line-subtle text-center">
      <p className="text-h2 text-content-primary tnum">{value}</p>
      <p className="text-caption text-content-muted">{label}</p>
    </div>
  );
}
