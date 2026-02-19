import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchCustomers,
  deactivateCustomer,
  reactivateCustomer
} from "../../features/platformCustomers/platformCustomersSlice";

import ResetCustomerPasswordModal from "./ResetCustomerPasswordModal";
import EditCustomerModal from "./EditCustomerModal";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function PlatformCustomers() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(
    s => s.platformCustomers
  );

  const [resetId, setResetId] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const filteredCustomers = useMemo(() => {
    return items.filter(c => {
      const matchesSearch = c.FullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            c.Email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            (c.PhoneNumber && c.PhoneNumber.includes(debouncedSearch));
      const matchesStatus = statusFilter === "ALL" ||
                            (statusFilter === "ACTIVE" && c.IsActive) ||
                            (statusFilter === "INACTIVE" && !c.IsActive);
      return matchesSearch && matchesStatus;
    });
  }, [items, debouncedSearch, statusFilter]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(filteredCustomers, 9);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, setCurrentPage]);

  return (
    <div className="min-h-screen bg-app-bg p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-app-text mb-2">Customers</h1>
          <p className="text-app-muted">Platform-wide customer management</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              className="w-full pl-10 pr-4 py-2 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-medium text-app-text"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full px-4 py-2 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:outline-none transition-all font-bold text-app-text"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && <LoadingState label="Loading customers..." blocks={3} />}

        {!loading && filteredCustomers.length === 0 && (
          <EmptyState
            title={search || statusFilter !== "ALL" ? "No customers match your filters" : "No customers found"}
            description={search || statusFilter !== "ALL" ? "Try changing your filters." : "Customer records will appear here once registered."}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedItems.map(c => (
            <div
              key={c.Id}
              className={`rounded-[12px] shadow-sm overflow-hidden transition-all hover:shadow-lg border-t-4 bg-app-surface ${
                c.IsActive ? "border-app-accent" : "border-app-border"
              }`}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-12 h-12 rounded-full bg-app-surface-2 flex items-center justify-center text-app-muted font-bold text-xl uppercase">
                     {c.FullName?.charAt(0) || '?'}
                   </div>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${c.IsActive ? 'bg-app-accent/10 text-app-accent' : 'bg-app-surface-2 text-app-text'}`}>
                     {c.IsActive ? 'Active' : 'Inactive'}
                   </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-black text-app-text leading-tight">{c.FullName}</h3>
                  <p className="text-app-muted font-medium text-sm truncate">{c.Email}</p>
                </div>

                 <button
                   onClick={() => setEditingCustomer(c)}
                   className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-app-accent text-white hover:bg-app-accent-dark rounded-[12px] font-bold text-sm transition-all shadow-md hover:scale-[1.02] active:scale-95 mb-3"
                 >
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                   </svg>
                   Manage Profile
                 </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => setResetId(c.Id)}
                    className="flex-1 px-3 py-2 text-xs font-bold bg-app-surface-2 text-app-text hover:bg-app-surface rounded-[12px] transition-colors"
                  >
                    Reset Password
                  </button>
                  
                  {c.IsActive ? (
                    <button
                      onClick={() => dispatch(deactivateCustomer(c.Id))}
                      className="flex-1 px-3 py-2 text-xs font-bold bg-app-surface-2 text-red-600 hover:bg-app-surface rounded-[12px] transition-colors"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => dispatch(reactivateCustomer(c.Id))}
                      className="flex-1 px-3 py-2 text-xs font-bold bg-app-accent/10 text-app-accent hover:bg-app-accent/20 rounded-[12px] transition-colors"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <ResetCustomerPasswordModal
          customerId={resetId}
          open={!!resetId}
          onClose={() => setResetId(null)}
        />

        <EditCustomerModal
          customer={editingCustomer}
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      </div>
    </div>
  );
}
