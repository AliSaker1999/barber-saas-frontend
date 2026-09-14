import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchTenantDashboard } from "../../features/reports/reportsSlice";
import { fetchCompanyProfile } from "../../features/company/companySlice";
import { formatMoney } from "../../utils/format";
import { formatDateOnly } from "../../utils/time";
import TopBar from "../../components/ui/TopBar";
import { IconButton } from "../../components/ui/Button";
import { Card, SectionHeader, Pill } from "../../components/ui/Primitives";
import { PersonRow } from "../../components/shop/ShopDayComponents";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";

/*
 * Shop analytics.
 *
 * A rebuild, not a restyle. `new Date(dailyRevenue[0]?.Date)` rendered the
 * literal text "Invalid Date" for any shop with no revenue in the last 30
 * days — checked live against the real seeded shops, 4 of 5 hit this today.
 * `summary.TotalRevenue.toLocaleString()` had no null guard either; the
 * current SQL always returns 0, not null, so this was latent rather than
 * live, but it was one query change away from breaking with no warning.
 * The currency symbol was a hardcoded `$` in five places, which is exactly
 * the "never silently convert" rule this app holds everywhere else — an LBP
 * shop's real numbers were being mislabelled as dollars. All three are fixed
 * by routing every amount and date through formatMoney/formatDateOnly.
 */

/* Translated at the call site — the acquisition vocabulary is a closed,
   small set (public-booking.schemas.ts) worth naming in full rather than
   falling back to the raw code for the common ones. */
const SOURCE_LABEL_KEYS = {
  qr: "source_qr",
  instagram: "source_instagram",
  whatsapp: "source_whatsapp",
  poster: "source_poster",
  referral: "source_referral",
  search: "source_search",
  direct: "source_direct",
  walk_in: "source_walk_in",
  unknown: "source_unknown"
};

export default function AdminReports() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { tenantDashboard, loading, error } = useAppSelector((state) => state.reports);
  const currency = useAppSelector((state) => state.company.profile?.Currency) || "USD";

  useEffect(() => {
    dispatch(fetchTenantDashboard());
    dispatch(fetchCompanyProfile());
  }, [dispatch]);

  function reload() {
    dispatch(fetchTenantDashboard());
  }

  return (
    <div className="pb-12">
      <TopBar
        title={t("reports_title")}
        subtitle={t("reports_subtitle")}
        actions={
          <IconButton icon="refresh" label={t("refresh")} onClick={reload} disabled={loading} />
        }
      />

      <div className="px-4 pt-3 space-y-6">
        {loading && !tenantDashboard ? (
          <ReportsSkeleton />
        ) : error && !tenantDashboard ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !tenantDashboard ? (
          <EmptyState
            icon="chart"
            title={t("reports_empty_title")}
            description={t("reports_empty_sub")}
          />
        ) : (
          <ReportsBody dashboard={tenantDashboard} currency={currency} t={t} />
        )}
      </div>
    </div>
  );
}

function ReportsBody({ dashboard, currency, t }) {
  const { summary, barbers, services, dailyRevenue, topCustomers, acquisitionSources } = dashboard;

  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.Revenue), 1);
  /* Computed once, not re-derived inside the barbers loop on every row —
     the old version called Math.max(...barbers.map(...)) once per iteration. */
  const maxBarberRevenue = Math.max(...barbers.map((b) => b.Revenue), 1);
  const totalAttributed = acquisitionSources.reduce((sum, s) => sum + s.CustomerCount, 0);

  return (
    <>
      {/* ---- summary ---- */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          tone="gold"
          title={t("reports_total_revenue")}
          value={formatMoney(summary.TotalRevenue, currency)}
          subtext={t("reports_revenue_subtext")}
        />
        <StatCard
          tone="success"
          title={t("reports_completed")}
          value={summary.CompletedApptCount + summary.CompletedQueueCount}
          subtext={t("reports_appt_queue_split", {
            appt: summary.CompletedApptCount,
            queue: summary.CompletedQueueCount
          })}
        />
        <StatCard
          tone="danger"
          title={t("reports_no_shows")}
          value={summary.NoShowApptCount + summary.NoShowQueueCount}
          subtext={t("reports_appt_queue_split", {
            appt: summary.NoShowApptCount,
            queue: summary.NoShowQueueCount
          })}
        />
        <StatCard
          tone="warning"
          title={t("reports_cancellations")}
          value={summary.CancelledApptCount + summary.CancelledQueueCount}
          subtext={t("reports_appt_queue_split", {
            appt: summary.CancelledApptCount,
            queue: summary.CancelledQueueCount
          })}
        />
      </div>

      {/* ---- revenue trend ---- */}
      <section>
        <SectionHeader title={t("reports_revenue_trend")} subtitle={t("reports_last_30_days")} />
        <Card>
          {dailyRevenue.length ? (
            <>
              <div className="h-40 flex items-end gap-1">
                {dailyRevenue.map((d) => (
                  <div
                    key={d.Date}
                    className="flex-1 min-w-[2px] rounded-t-sm bg-brand-gold-soft"
                    style={{ height: `${Math.max((d.Revenue / maxRevenue) * 100, 2)}%` }}
                    title={`${formatDateOnly(d.Date)}: ${formatMoney(d.Revenue, currency)}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-3 text-caption text-content-muted">
                <span>{formatDateOnly(dailyRevenue[0].Date)}</span>
                <span>{t("today")}</span>
              </div>
            </>
          ) : (
            <p className="text-body-sm text-content-secondary py-4 text-center">
              {t("reports_no_activity_yet")}
            </p>
          )}
        </Card>
      </section>

      {/* ---- barbers ---- */}
      <section>
        <SectionHeader title={t("reports_barber_performance")} />
        {barbers.length ? (
          <Card className="space-y-4">
            {barbers.map((b) => (
              <div key={b.BarberName}>
                <div className="flex justify-between text-body-sm font-bold text-content-primary">
                  <span className="truncate">{b.BarberName}</span>
                  <span className="tnum flex-shrink-0">{formatMoney(b.Revenue, currency)}</span>
                </div>
                <div className="w-full h-2 rounded-pill bg-surface-sunken overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-brand-gold rounded-pill"
                    style={{ width: `${(b.Revenue / maxBarberRevenue) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-caption text-content-muted">
                  <span>{t("reports_completed_count", { n: b.CompletedCount })}</span>
                  <span>{t("reports_total_count", { n: b.TotalAppointments })}</span>
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState icon="users" title={t("reports_no_barber_activity")} />
        )}
      </section>

      {/* ---- top services ---- */}
      <section>
        <SectionHeader title={t("reports_top_services")} />
        {services.length ? (
          <ul className="space-y-2">
            {services.slice(0, 6).map((s, i) => (
              <li
                key={s.ServiceName}
                className="flex items-center gap-3 p-3.5 rounded-card bg-surface-raised border border-line-subtle"
              >
                <span className="w-8 h-8 flex-shrink-0 rounded-control bg-surface-sunken flex items-center justify-center text-caption font-bold text-content-muted tnum">
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-body font-bold text-content-primary truncate">
                    {s.ServiceName}
                  </span>
                  <span className="block text-caption text-content-muted">
                    {t("reports_times_used", { n: s.UsageCount })}
                  </span>
                </span>
                <span className="text-body-sm font-bold text-brand-gold-text tnum flex-shrink-0">
                  {formatMoney(s.Revenue, currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="scissors" title={t("reports_no_service_activity")} />
        )}
      </section>

      {/* ---- top customers ---- */}
      <section>
        <SectionHeader title={t("reports_top_customers")} />
        {topCustomers.length ? (
          <ul className="space-y-2">
            {topCustomers.map((c) => (
              <li key={c.CustomerId}>
                <PersonRow
                  name={c.FullName}
                  secondary={c.Email}
                  badges={
                    <Pill tone="gold">{t("reports_visit_count", { n: c.VisitCount })}</Pill>
                  }
                  actions={
                    <span className="text-body font-bold text-brand-gold-text tnum">
                      {formatMoney(c.TotalSpend, currency)}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="users" title={t("reports_no_customers_yet")} />
        )}
      </section>

      {/* ---- acquisition ---- */}
      <section>
        <SectionHeader
          title={t("reports_acquisition_title")}
          subtitle={t("reports_acquisition_sub")}
        />
        {acquisitionSources.length ? (
          <Card className="space-y-3">
            {acquisitionSources.map((row) => (
              <div key={row.Source}>
                <div className="flex justify-between text-body-sm font-semibold text-content-primary">
                  <span>{t(SOURCE_LABEL_KEYS[row.Source] || "source_unknown")}</span>
                  <span className="tnum">
                    {t("reports_customer_count", { n: row.CustomerCount })}
                  </span>
                </div>
                <div className="w-full h-2 rounded-pill bg-surface-sunken overflow-hidden mt-1.5">
                  <div
                    className="h-full bg-brand-gold rounded-pill"
                    style={{ width: `${(row.CustomerCount / totalAttributed) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState
            icon="qr"
            title={t("reports_no_acquisition_yet")}
            description={t("reports_no_acquisition_sub")}
          />
        )}
      </section>
    </>
  );
}

const STAT_TONE = {
  gold: "bg-brand-gold text-content-on-gold",
  success: "bg-state-success text-content-on-success",
  danger: "bg-state-danger text-content-on-danger",
  warning: "bg-state-warning text-content-on-warning"
};

function StatCard({ tone, title, value, subtext }) {
  return (
    <div className={`p-4 rounded-card ${STAT_TONE[tone] || STAT_TONE.gold}`}>
      <p className="text-label uppercase opacity-80">{title}</p>
      <p className="text-h2 tnum mt-1">{value}</p>
      {subtext ? <p className="text-caption opacity-75 mt-0.5">{subtext}</p> : null}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" rounded="rounded-card" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" rounded="rounded-card" />
      <Skeleton className="h-48 w-full" rounded="rounded-card" />
    </div>
  );
}
