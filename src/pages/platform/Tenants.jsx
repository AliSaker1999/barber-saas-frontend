import { useEffect, useState } from "react";
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

export default function PlatformTenants() {
  const dispatch = useAppDispatch();
  const { items, admins, loading } = useAppSelector(
    s => s.platformTenants
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [createAdminTenantId, setCreateAdminTenantId] = useState(null);
  const [resetAdminTenantId, setResetAdminTenantId] = useState(null);

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
    dispatch(createTenant({ name, slug }));
    setName("");
    setSlug("");
  };

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

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading tenants...</p>
          </div>
        )}

        {/* Tenants Grid */}
        {!loading && items.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No tenants created yet</p>
            <p className="text-gray-400 text-sm mt-2">Create your first tenant to get started</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map(t => {
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
      </div>
    </div>
  );
}
