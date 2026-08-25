import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenantsReport, fetchCustomersReport, fetchSubscriptionSummary } from "../../features/reports/reportsSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function Reports() {
  const dispatch = useAppDispatch();
  const { tenants, customers, loading, subscriptionSummary } = useAppSelector(s => s.reports);
  const [activeTab, setActiveTab] = useState("TENANTS");

  // Filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [minRevenue, setMinRevenue] = useState("");
  const [status, setStatus] = useState("ALL");

  useEffect(() => {
    if (activeTab === "TENANTS") {
      dispatch(fetchTenantsReport());
    } else {
      dispatch(fetchCustomersReport());
    }
  }, [activeTab, dispatch]);

  useEffect(() => {
    dispatch(fetchSubscriptionSummary());
  }, [dispatch]);

  const filteredData = useMemo(() => {
    return (activeTab === "TENANTS" ? tenants : customers).filter(item => {
      const name = (item.Name || item.FullName || "").toLowerCase();
      const matchesSearch = name.includes(debouncedSearch.toLowerCase()) ||
                            (item.Email && item.Email.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
                            (item.Slug && item.Slug.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesStatus = status === "ALL" ||
                            (status === "ACTIVE" && item.IsActive) ||
                            (status === "INACTIVE" && !item.IsActive);

      if (activeTab === "TENANTS") {
        const revenue = item.TotalRevenue || 0;
        const matchesRevenue = !minRevenue || revenue >= parseFloat(minRevenue);
        return matchesSearch && matchesStatus && matchesRevenue;
      }

      const spent = item.TotalSpent || 0;
      const matchesSpent = !minRevenue || spent >= parseFloat(minRevenue);
      return matchesSearch && matchesStatus && matchesSpent;
    });
  }, [activeTab, tenants, customers, debouncedSearch, status, minRevenue]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(filteredData, 12);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, minRevenue, status, setCurrentPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-app-text">Platform Reports</h1>
          <p className="text-app-muted font-medium">Master data & business metrics</p>
        </div>
        
        <div className="flex bg-app-surface-2 p-1 rounded-[12px] w-fit">
          <button 
            onClick={() => setActiveTab("TENANTS")}
            className={`px-6 py-2 rounded-[12px] font-bold text-sm transition-all ${activeTab === 'TENANTS' ? 'bg-app-surface text-app-accent shadow-sm' : 'text-app-muted hover:text-app-text'}`}
          >
            Tenants
          </button>
          <button 
            onClick={() => setActiveTab("CUSTOMERS")}
            className={`px-6 py-2 rounded-[12px] font-bold text-sm transition-all ${activeTab === 'CUSTOMERS' ? 'bg-app-surface text-app-accent shadow-sm' : 'text-app-muted hover:text-app-text'}`}
          >
            Customers
          </button>
        </div>
      </div>

      {/* Subscription Summary */}
      {subscriptionSummary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-app-surface p-5 rounded-[12px] shadow-sm border border-app-border">
              <p className="text-xs font-black text-app-muted uppercase tracking-widest mb-1">Projected MRR</p>
              <p className="text-2xl font-black text-app-text">${Number(subscriptionSummary.totals.ProjectedMRR).toLocaleString()}</p>
            </div>
            <div className="bg-app-surface p-5 rounded-[12px] shadow-sm border border-app-border">
              <p className="text-xs font-black text-app-muted uppercase tracking-widest mb-1">Active Shops</p>
              <p className="text-2xl font-black text-app-text">{subscriptionSummary.totals.ActiveTenants}</p>
            </div>
            <div className="bg-app-surface p-5 rounded-[12px] shadow-sm border border-app-border">
              <p className="text-xs font-black text-app-muted uppercase tracking-widest mb-1">Inactive Shops</p>
              <p className="text-2xl font-black text-app-text">{subscriptionSummary.totals.InactiveTenants}</p>
            </div>
            <div className="bg-app-surface p-5 rounded-[12px] shadow-sm border border-app-border">
              <p className="text-xs font-black text-app-muted uppercase tracking-widest mb-1">No Plan Assigned</p>
              <p className="text-2xl font-black text-app-text">{subscriptionSummary.totals.NoPlanTenants}</p>
            </div>
          </div>

          {subscriptionSummary.byPlan.length > 0 && (
            <div className="bg-app-surface p-5 rounded-[12px] shadow-sm border border-app-border">
              <p className="text-xs font-black text-app-muted uppercase tracking-widest mb-3">Active shops by plan</p>
              <div className="flex flex-wrap gap-3">
                {subscriptionSummary.byPlan.map(p => (
                  <div key={p.Id} className="px-4 py-2 bg-app-surface-2 rounded-[12px]">
                    <span className="font-bold text-app-text">{p.Name}</span>
                    <span className="text-app-muted text-sm ml-2">${Number(p.MonthlyPrice).toFixed(0)}/mo × {p.ActiveCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subscriptionSummary.renewingSoon.length > 0 && (
            <div className="bg-app-surface p-5 rounded-[12px] shadow-sm border border-app-border">
              <p className="text-xs font-black text-app-muted uppercase tracking-widest mb-3">Renewing within 7 days</p>
              <div className="space-y-2">
                {subscriptionSummary.renewingSoon.map(t => (
                  <div key={t.Id} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-app-text">{t.Name}</span>
                    <span className="text-app-muted">
                      {t.PlanName} — {t.SubscriptionRenewsAt.slice(5, 7)}/{t.SubscriptionRenewsAt.slice(8, 10)}/{t.SubscriptionRenewsAt.slice(0, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-app-surface p-6 rounded-[12px] shadow-sm border border-app-border grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">Search</label>
          <input 
            type="text" 
            placeholder="Search by name, email, slug..." 
            className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">Status</label>
          <select 
            className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-app-muted uppercase tracking-widest mb-2">Min. {activeTab === 'TENANTS' ? 'Revenue' : 'Spent'}</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
            value={minRevenue}
            onChange={e => setMinRevenue(e.target.value)}
          />
        </div>
      </div>

      {/* Data Table */}
      {loading && <LoadingState label="Loading report data..." blocks={3} />}

      {!loading && filteredData.length === 0 && (
        <EmptyState title="No data matches your filters" description="Try changing your search or filter values." />
      )}

      {!loading && filteredData.length > 0 && (
      <div className="bg-app-surface rounded-[12px] shadow-sm border border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-app-surface-2 border-b border-app-border">
                <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Activity</th>
                <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-xs font-black text-app-muted uppercase tracking-widest">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-app-muted font-bold">Loading report data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-app-muted font-bold">No data matches your filters.</td></tr>
              ) : paginatedItems.map(item => (
                <tr key={item.Id} className="hover:bg-app-surface-2 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-bold text-app-text">{item.Name || item.FullName}</div>
                    <div className="text-xs text-app-muted font-medium">{item.Slug || item.Email}</div>
                    <div className="mt-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${item.IsActive ? 'bg-app-surface-2 text-app-text' : 'bg-app-surface-2 text-app-text'}`}>
                         {item.IsActive ? 'Active' : 'Inactive'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {activeTab === 'TENANTS' ? (
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-app-text">{item.BarbersCount} Barbers</div>
                        <div className="text-xs text-app-muted">{item.ServicesCount} Services Offered</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-app-text">{item.PhoneNumber || 'No Phone'}</div>
                        <div className="text-xs text-app-muted">NoShow Count: <span className="text-app-accent font-bold">{item.NoShowCount}</span></div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-black text-app-text">
                      ${activeTab === 'TENANTS' ? item.TotalRevenue?.toLocaleString() : item.TotalSpent?.toLocaleString()}
                    </div>
                    <div className="text-xs text-app-muted font-medium">{item.CompletedAppointments} / {item.TotalAppointments} Apps.</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-app-text">{new Date(item.CreatedAt).toLocaleDateString()}</div>
                    {item.LastAppointment && (
                       <div className="text-[10px] text-app-muted uppercase font-black mt-1">Last: {new Date(item.LastAppointment).toLocaleDateString()}</div>
                    )}
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
  );
}
