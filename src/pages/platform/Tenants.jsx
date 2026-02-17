import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchPlatformTenants,
  createTenant,
  deactivateTenant,
  reactivateTenant,
  fetchTenantAdmin
} from "../../features/platformTenants/platformTenantsSlice";

import CreateTenantAdminModal from "./CreateTenantAdminModal";
import ResetTenantAdminModal from "./ResetTenantAdminModal";
import EditTenantModal from "./EditTenantModal";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";

export default function PlatformTenants() {
  const dispatch = useAppDispatch();
  const { items, admins, loading } = useAppSelector(
    s => s.platformTenants
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [createAdminTenantId, setCreateAdminTenantId] = useState(null);
  const [resetAdminTenantId, setResetAdminTenantId] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);

  useEffect(() => {
    dispatch(fetchPlatformTenants());
  }, [dispatch]);

  useEffect(() => {
    items.forEach(t => {
      dispatch(fetchTenantAdmin(t.Id));
    });
  }, [items, dispatch]);

  const submitTenant = e => {
    e.preventDefault();
    dispatch(createTenant({ name, slug, phoneNumber }));
    setName("");
    setSlug("");
    setPhoneNumber("");
  };

  const filteredTenants = useMemo(() => {
    return items.filter(t => {
      const matchesSearch = t.Name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                            t.Slug.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter === "ALL" ||
                            (statusFilter === "ACTIVE" && t.IsActive) ||
                            (statusFilter === "INACTIVE" && !t.IsActive);
      return matchesSearch && matchesStatus;
    });
  }, [items, debouncedSearch, statusFilter]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(filteredTenants, 8);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, setCurrentPage]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tenants</h1>
          <p className="text-gray-600">Manage all salon tenants on the platform</p>
        </div>

        {/* Create Tenant Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Tenant</h2>
          <form
            onSubmit={submitTenant}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant Name</label>
              <input
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Downtown Barbershop"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
              <input
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g., downtown-barber"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="e.g., +961..."
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg">
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Tenant
              </button>
            </div>
          </form>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or slug..."
              className="w-full pl-10 pr-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full px-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all font-bold text-gray-700"
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
        {loading && <LoadingState label="Loading tenants..." blocks={3} />}

        {/* Tenants Grid */}
        {!loading && filteredTenants.length === 0 && (
          <EmptyState
            title={search || statusFilter !== "ALL" ? "No tenants match your filters" : "No tenants created yet"}
            description={search || statusFilter !== "ALL" ? "Try changing your filters." : "Create your first tenant to get started."}
          />
        )}

        {!loading && filteredTenants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedItems.map(t => {
              const admin = admins[t.Id];

              return (
                <div
                  key={t.Id}
                  className={`rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${
                    t.IsActive
                      ? "bg-white border-l-4 border-green-500"
                      : "bg-gray-100 border-l-4 border-red-500"
                  }`}
                >
                  {/* Tenant Header */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {t.Name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Slug: <span className="font-mono text-gray-700">{t.Slug}</span>
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${
                          t.IsActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {t.IsActive ? "✓ ACTIVE" : "✕ INACTIVE"}
                      </span>
                    </div>

                    {/* Admin Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-gray-600 font-medium mb-2">ADMIN</p>
                      {admin ? (
                        <div>
                          <p className="font-semibold text-gray-900">{admin.FullName}</p>
                          <p className="text-sm text-gray-600">{admin.Email}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No admin assigned</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setEditingTenant(t)}
                        className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-bold text-sm transition-all shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-95 mb-1"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Advanced Settings
                      </button>

                      {t.IsActive ? (
                        <>
                          {!admin ? (
                            <button
                              onClick={() => setCreateAdminTenantId(t.Id)}
                              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Create Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => setResetAdminTenantId(t.Id)}
                              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-medium text-sm transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Reset Password
                            </button>
                          )}
                          <button
                            onClick={() => dispatch(deactivateTenant(t.Id))}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium text-sm transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Deactivate
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => dispatch(reactivateTenant(t.Id))}
                          className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg font-medium transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                          </svg>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* MODALS */}
        <CreateTenantAdminModal
          tenantId={createAdminTenantId}
          open={!!createAdminTenantId}
          onClose={() => setCreateAdminTenantId(null)}
        />

        <ResetTenantAdminModal
          tenantId={resetAdminTenantId}
          open={!!resetAdminTenantId}
          onClose={() => setResetAdminTenantId(null)}
        />

        <EditTenantModal
          tenant={editingTenant}
          isOpen={!!editingTenant}
          onClose={() => setEditingTenant(null)}
        />
      </div>
    </div>
  );
}
