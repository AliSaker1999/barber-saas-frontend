import { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenantsReport, fetchCustomersReport } from "../../features/reports/reportsSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function Reports() {
  const dispatch = useAppDispatch();
  const { tenants, customers, loading } = useAppSelector(s => s.reports);
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
          <h1 className="text-3xl font-black text-gray-900">Platform Reports</h1>
          <p className="text-gray-500 font-medium">Master data & business metrics</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
          <button 
            onClick={() => setActiveTab("TENANTS")}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'TENANTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tenants
          </button>
          <button 
            onClick={() => setActiveTab("CUSTOMERS")}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'CUSTOMERS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Customers
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Search</label>
          <input 
            type="text" 
            placeholder="Search by name, email, slug..." 
            className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
          <select 
            className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Min. {activeTab === 'TENANTS' ? 'Revenue' : 'Spent'}</label>
          <input 
            type="number" 
            placeholder="0.00" 
            className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold"
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Activity</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-bold">Loading report data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400 font-bold">No data matches your filters.</td></tr>
              ) : paginatedItems.map(item => (
                <tr key={item.Id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-bold text-gray-900">{item.Name || item.FullName}</div>
                    <div className="text-xs text-gray-500 font-medium">{item.Slug || item.Email}</div>
                    <div className="mt-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${item.IsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {item.IsActive ? 'Active' : 'Inactive'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {activeTab === 'TENANTS' ? (
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-gray-700">{item.BarbersCount} Barbers</div>
                        <div className="text-xs text-gray-500">{item.ServicesCount} Services Offered</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-gray-700">{item.PhoneNumber || 'No Phone'}</div>
                        <div className="text-xs text-gray-500">NoShow Count: <span className="text-red-600 font-bold">{item.NoShowCount}</span></div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-black text-gray-900">
                      ${activeTab === 'TENANTS' ? item.TotalRevenue?.toLocaleString() : item.TotalSpent?.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">{item.CompletedAppointments} / {item.TotalAppointments} Apps.</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-gray-700">{new Date(item.CreatedAt).toLocaleDateString()}</div>
                    {item.LastAppointment && (
                       <div className="text-[10px] text-gray-400 uppercase font-black mt-1">Last: {new Date(item.LastAppointment).toLocaleDateString()}</div>
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
