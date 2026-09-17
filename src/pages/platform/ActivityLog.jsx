import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchActivityLog } from "../../features/activityLog/activityLogSlice";
import { fetchPlatformTenants } from "../../features/platformTenants/platformTenantsSlice";
import Pagination from "../../components/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { Pill } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";

/*
 * Platform staff tooling — deliberately English-only, see REDESIGN.md.
 *
 * The defect here was the worst of the platform screens, because of what this
 * screen is for. activityLogSlice records a failed fetch in `state.error`, and
 * this component destructured `{ items, total, pageSize, loading }` — no
 * `error`. So a 500 on /activity-logs rendered "No activity found. Try
 * adjusting your filters."
 *
 * An audit log that reports itself empty when it is actually unreachable is
 * worse than one that is down, because the reader believes it.
 */

const anyFilter = (tenantId, action, from, to) =>
  Boolean(tenantId || action || from || to);

export default function ActivityLog() {
  const dispatch = useAppDispatch();
  const { items, total, pageSize, loading, error } = useAppSelector((s) => s.activityLog);
  const tenants = useAppSelector((s) => s.platformTenants.items);

  const [tenantId, setTenantId] = useState("");
  const [action, setAction] = useState("");
  const debouncedAction = useDebouncedValue(action, 300);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    dispatch(fetchPlatformTenants());
  }, [dispatch]);

  function load() {
    dispatch(
      fetchActivityLog({
        tenantId: tenantId || undefined,
        action: debouncedAction || undefined,
        from: from || undefined,
        to: to || undefined,
        page: currentPage,
        pageSize: 25
      })
    );
  }

  useEffect(() => {
    load();
    /* `load` closes over every filter; listing them is the dependency set. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, tenantId, debouncedAction, from, to, currentPage]);

  const totalPages = Math.ceil(total / pageSize) || 1;
  const filtered = anyFilter(tenantId, debouncedAction, from, to);

  return (
    <div className="min-h-screen bg-surface-base p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-h1 text-content-primary">Activity log</h1>
          <p className="text-body-sm text-content-secondary">Who did what, across every shop</p>
        </div>

        <div className="rounded-card bg-surface-raised border border-line-subtle p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">Shop</p>
            <Select
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="All shops"
              searchPlaceholder="Search shops"
              aria-label="Filter by shop"
              options={[
                { value: "", label: "All shops", icon: "globe" },
                ...tenants.map((tenant) => ({
                  value: tenant.Id,
                  label: tenant.Name,
                  icon: "scissors"
                }))
              ]}
            />
          </div>
          <Field
            label="Action contains"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="cancelled, price_updated"
            dir="ltr"
          />
          <Field
            label="From"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setCurrentPage(1);
            }}
            type="date"
            dir="ltr"
          />
          <Field
            label="To"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setCurrentPage(1);
            }}
            type="date"
            dir="ltr"
          />
        </div>

        {loading && !items.length ? (
          <ListSkeleton count={5} />
        ) : error ? (
          /* Never an empty state for a failed read — this is an audit trail. */
          <ErrorState
            title="Could not load the activity log"
            message={error}
            onRetry={load}
          />
        ) : !items.length ? (
          <EmptyState
            icon="list"
            title={filtered ? "Nothing matches these filters" : "No activity recorded yet"}
            description={
              filtered
                ? "Try a wider date range, or clear the shop and action filters."
                : "Actions people take across the platform show up here."
            }
          />
        ) : (
          <div className="rounded-card bg-surface-raised border border-line-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-surface-sunken border-b border-line-subtle">
                    {["When", "Who", "Shop", "Action", "Details"].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-label uppercase text-content-muted text-start"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle">
                  {items.map((row) => {
                    let parsed = null;
                    try {
                      parsed = row.Data ? JSON.parse(row.Data) : null;
                    } catch {
                      /* A malformed payload is not worth losing the row over. */
                    }
                    const isExpanded = expandedId === row.Id;

                    return (
                      <tr key={row.Id}>
                        <td className="px-4 py-3 text-body-sm text-content-primary whitespace-nowrap tnum">
                          {new Date(row.CreatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-body-sm font-semibold text-content-primary">
                            {row.UserFullName || "System"}
                          </div>
                          {row.UserEmail ? (
                            <div className="text-caption text-content-muted">{row.UserEmail}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-body-sm text-content-primary">
                          {row.TenantName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Pill>{row.Action}</Pill>
                        </td>
                        <td className="px-4 py-3 text-caption text-content-muted max-w-xs">
                          {parsed ? (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() => setExpandedId(isExpanded ? null : row.Id)}
                              className="text-start underline decoration-dotted"
                            >
                              {isExpanded ? (
                                <pre className="whitespace-pre-wrap break-words">
                                  {JSON.stringify(parsed, null, 2)}
                                </pre>
                              ) : (
                                "View details"
                              )}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
