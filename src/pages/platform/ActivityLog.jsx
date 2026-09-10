import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchActivityLog } from "../../features/activityLog/activityLogSlice";
import { fetchPlatformTenants } from "../../features/platformTenants/platformTenantsSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Select from "../../components/ui/Select";

export default function ActivityLog() {
  const dispatch = useAppDispatch();
  const { items, total, pageSize, loading } = useAppSelector(s => s.activityLog);
  const tenants = useAppSelector(s => s.platformTenants.items);

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

  useEffect(() => {
    dispatch(fetchActivityLog({
      tenantId: tenantId || undefined,
      action: debouncedAction || undefined,
      from: from || undefined,
      to: to || undefined,
      page: currentPage,
      pageSize: 25
    }));
  }, [dispatch, tenantId, debouncedAction, from, to, currentPage]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-app-text">Activity Log</h1>
        <p className="text-app-muted font-medium">Who did what, across every shop</p>
      </div>

      <div className="bg-app-surface p-6 rounded-[12px] shadow-sm border border-app-border grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">Shop</label>
          <Select
            value={tenantId}
            onChange={e => { setTenantId(e.target.value); setCurrentPage(1); }}
            placeholder="All shops"
            searchPlaceholder="Search shops..."
            options={[
              { value: "", label: "All shops", icon: "globe" },
              ...tenants.map(t => ({ value: t.Id, label: t.Name, icon: "scissors" }))
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">Action contains</label>
          <input
            type="text"
            placeholder="e.g. cancelled, price_updated"
            className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
            value={action}
            onChange={e => { setAction(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">From</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
            value={from}
            onChange={e => { setFrom(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">To</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
            value={to}
            onChange={e => { setTo(e.target.value); setCurrentPage(1); }}
          />
        </div>
      </div>

      {loading && <LoadingState label="Loading activity..." blocks={4} />}

      {!loading && items.length === 0 && (
        <EmptyState title="No activity found" description="Try adjusting your filters." />
      )}

      {!loading && items.length > 0 && (
        <div className="bg-app-surface rounded-[12px] shadow-sm border border-app-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-app-surface-2 border-b border-app-border">
                  <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">When</th>
                  <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Actor</th>
                  <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Shop</th>
                  <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Action</th>
                  <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {items.map(row => {
                  let parsedData = null;
                  try { parsedData = row.Data ? JSON.parse(row.Data) : null; } catch { /* leave null */ }
                  const isExpanded = expandedId === row.Id;
                  return (
                    <tr key={row.Id} className="hover:bg-app-surface-2 transition-colors">
                      <td className="px-6 py-4 text-sm text-app-text whitespace-nowrap">
                        {new Date(row.CreatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-app-text">{row.UserFullName || "System"}</div>
                        {row.UserEmail && <div className="text-xs text-app-muted">{row.UserEmail}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-app-text">{row.TenantName || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded bg-app-surface-2 text-app-text text-xs font-black uppercase tracking-wide">
                          {row.Action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-app-muted max-w-xs">
                        {parsedData ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : row.Id)}
                            className="text-left"
                          >
                            {isExpanded ? (
                              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(parsedData, null, 2)}</pre>
                            ) : (
                              <span className="underline decoration-dotted">View details</span>
                            )}
                          </button>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
