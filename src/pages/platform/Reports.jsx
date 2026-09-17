import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchTenantsReport,
  fetchCustomersReport,
  fetchSubscriptionSummary
} from "../../features/reports/reportsSlice";
import { formatMoney } from "../../utils/format";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { Pill } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * Like the activity log, this read `{ tenants, customers, loading,
 * subscriptionSummary }` and never `error`, so a failed request rendered "No
 * data matches your filters" — a report claiming the platform is empty when it
 * simply could not be reached.
 *
 * Money here was also unlabelled. A shop's revenue is in that shop's own
 * currency and every figure was rendered behind a hardcoded "$", so a Tripoli
 * shop's lira takings read as dollars. A customer's spend can genuinely span
 * both currencies, and the query now says when it does — this refuses to put a
 * symbol on a mixed total rather than choosing one.
 *
 * Projected MRR is the exception and is correctly in dollars: it is what Ajmal
 * bills shops, and SubscriptionPlans has no currency column.
 */

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses", icon: "list" },
  { value: "ACTIVE", label: "Active", icon: "check" },
  { value: "INACTIVE", label: "Inactive", icon: "x" }
];

export default function Reports() {
  const dispatch = useAppDispatch();
  const { tenants, customers, loading, error, subscriptionSummary } = useAppSelector(
    (s) => s.reports
  );
  const [activeTab, setActiveTab] = useState("TENANTS");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [minRevenue, setMinRevenue] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    if (activeTab === "TENANTS") dispatch(fetchTenantsReport());
    else dispatch(fetchCustomersReport());
  }, [activeTab, dispatch]);

  useEffect(() => {
    dispatch(fetchSubscriptionSummary());
  }, [dispatch]);

  const isTenants = activeTab === "TENANTS";

  const filteredData = useMemo(() => {
    const needle = debouncedSearch.toLowerCase();
    return (isTenants ? tenants : customers).filter((item) => {
      const name = (item.Name || item.FullName || "").toLowerCase();
      const matchesSearch =
        name.includes(needle) ||
        (item.Email || "").toLowerCase().includes(needle) ||
        (item.Slug || "").toLowerCase().includes(needle);

      const matchesStatus =
        status === "ALL" ||
        (status === "ACTIVE" && item.IsActive) ||
        (status === "INACTIVE" && !item.IsActive);

      const amount = Number(isTenants ? item.TotalRevenue : item.TotalSpent) || 0;
      const matchesAmount = !minRevenue || amount >= parseFloat(minRevenue);

      return matchesSearch && matchesStatus && matchesAmount;
    });
  }, [isTenants, tenants, customers, debouncedSearch, status, minRevenue]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(
    filteredData,
    12
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, minRevenue, status, setCurrentPage]);

  /* The payload has been reshaped before; a missing `totals` used to throw and
     take the whole page with it. */
  const totals = subscriptionSummary?.totals;

  function reload() {
    if (isTenants) dispatch(fetchTenantsReport());
    else dispatch(fetchCustomersReport());
    dispatch(fetchSubscriptionSummary());
  }

  function renderAmount(item) {
    if (isTenants) {
      return formatMoney(item.TotalRevenue, item.Currency || "USD");
    }
    if ((item.SpendCurrencyCount ?? 1) > 1) {
      /* Two currencies are two numbers; adding them would need a rate this
         product deliberately does not have. */
      return <span className="text-content-muted">Mixed currencies</span>;
    }
    return formatMoney(item.TotalSpent, item.SpendCurrency || "USD");
  }

  return (
    <div className="min-h-screen bg-surface-base p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-h1 text-content-primary">Reports</h1>
            <p className="text-body-sm text-content-secondary">
              Master data and business metrics
            </p>
          </div>

          <div className="flex bg-surface-sunken p-1 rounded-control w-fit">
            {[
              { key: "TENANTS", label: "Shops" },
              { key: "CUSTOMERS", label: "Customers" }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`press min-h-[40px] px-5 rounded-control text-body-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-surface-raised text-content-primary"
                    : "text-content-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {totals ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Projected MRR",
                  /* Ajmal's own billing currency, not any shop's. */
                  value: formatMoney(totals.ProjectedMRR, "USD")
                },
                { label: "Active shops", value: totals.ActiveTenants },
                { label: "Inactive shops", value: totals.InactiveTenants },
                { label: "No plan", value: totals.NoPlanTenants }
              ].map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-card bg-surface-raised border border-line-subtle p-4"
                >
                  <p className="text-label uppercase text-content-muted mb-1">{tile.label}</p>
                  <p className="text-h2 text-content-primary tnum">{tile.value}</p>
                </div>
              ))}
            </div>

            {subscriptionSummary.byPlan?.length ? (
              <div className="rounded-card bg-surface-raised border border-line-subtle p-4">
                <p className="text-label uppercase text-content-muted mb-2.5">
                  Active shops by plan
                </p>
                <div className="flex flex-wrap gap-2">
                  {subscriptionSummary.byPlan.map((plan) => (
                    <div
                      key={plan.Id}
                      className="px-3 py-2 rounded-control bg-surface-sunken text-body-sm"
                    >
                      <span className="font-semibold text-content-primary">{plan.Name}</span>
                      <span className="text-content-muted tnum">
                        {" "}
                        {formatMoney(plan.MonthlyPrice, "USD")}/mo x {plan.ActiveCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {subscriptionSummary.renewingSoon?.length ? (
              <div className="rounded-card bg-surface-raised border border-line-subtle p-4">
                <p className="text-label uppercase text-content-muted mb-2.5">
                  Renewing within 7 days
                </p>
                <div className="space-y-1.5">
                  {subscriptionSummary.renewingSoon.map((tenant) => (
                    <div
                      key={tenant.Id}
                      className="flex items-center justify-between gap-3 text-body-sm"
                    >
                      <span className="font-semibold text-content-primary truncate">
                        {tenant.Name}
                      </span>
                      <span className="text-content-muted tnum flex-shrink-0">
                        {tenant.PlanName} ·{" "}
                        {/* A calendar date, read as written rather than through
                            Date, which shifts it by the browser's offset. */}
                        {tenant.SubscriptionRenewsAt?.slice(0, 10) || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-card bg-surface-raised border border-line-subtle p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Field
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or slug"
            />
          </div>
          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">Status</p>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
              aria-label="Filter by status"
            />
          </div>
          <Field
            label={isTenants ? "Min. revenue" : "Min. spent"}
            value={minRevenue}
            onChange={(e) => setMinRevenue(e.target.value)}
            type="number"
            inputMode="decimal"
            dir="ltr"
            inputClassName="tnum"
            placeholder="0"
          />
        </div>

        {loading && !filteredData.length ? (
          <ListSkeleton count={5} />
        ) : error ? (
          <ErrorState title="Could not load the report" message={error} onRetry={reload} />
        ) : !filteredData.length ? (
          <EmptyState
            icon="chart"
            title="Nothing matches these filters"
            description="Try a different search, status or minimum."
          />
        ) : (
          <div className="rounded-card bg-surface-raised border border-line-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-surface-sunken border-b border-line-subtle">
                    {["Who", "Activity", isTenants ? "Revenue" : "Spent", "Joined"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-label uppercase text-content-muted text-start"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {paginatedItems.map((item) => (
                    <tr key={item.Id}>
                      <td className="px-4 py-4">
                        <div className="text-body font-semibold text-content-primary">
                          {item.Name || item.FullName || "No name"}
                        </div>
                        <div className="text-caption text-content-muted truncate">
                          {item.Slug || item.Email || "—"}
                        </div>
                        <Pill tone={item.IsActive ? "success" : "neutral"} className="mt-1.5">
                          {item.IsActive ? "Active" : "Inactive"}
                        </Pill>
                      </td>
                      <td className="px-4 py-4">
                        {isTenants ? (
                          <>
                            <div className="text-body-sm font-semibold text-content-primary tnum">
                              {item.BarbersCount} barbers
                            </div>
                            <div className="text-caption text-content-muted tnum">
                              {item.ServicesCount} services
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-body-sm font-semibold text-content-primary tnum">
                              {item.PhoneNumber || "No phone"}
                            </div>
                            <div className="text-caption text-content-muted tnum">
                              {item.NoShowCount} no-shows
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-body font-bold text-content-primary tnum">
                          {renderAmount(item)}
                        </div>
                        <div className="text-caption text-content-muted tnum">
                          {item.CompletedAppointments} of {item.TotalAppointments} completed
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-body-sm text-content-primary tnum">
                          {item.CreatedAt ? new Date(item.CreatedAt).toLocaleDateString() : "—"}
                        </div>
                        {item.LastAppointment ? (
                          <div className="text-caption text-content-muted tnum">
                            Last {new Date(item.LastAppointment).toLocaleDateString()}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
