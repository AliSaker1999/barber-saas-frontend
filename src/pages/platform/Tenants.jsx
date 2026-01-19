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
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tenants</h1>

      {/* CREATE TENANT */}
      <form
        onSubmit={submitTenant}
        className="bg-white shadow rounded-lg p-4 mb-6 flex gap-3"
      >
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Tenant name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Slug"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Create Tenant
        </button>
      </form>

      {loading && (
        <p className="text-gray-500">Loading tenants...</p>
      )}

      {/* TENANT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(t => {
          const admin = admins[t.Id];

          return (
            <div
              key={t.Id}
              className={`border rounded-lg p-4 shadow-sm ${
                t.IsActive
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {t.Name}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t.Slug}
                  </p>
                </div>

                <span
                  className={`px-2 py-1 text-xs font-semibold rounded ${
                    t.IsActive
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {t.IsActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {t.IsActive ? (
                  <>
                    <button
                      onClick={() => dispatch(deactivateTenant(t.Id))}
                      className="px-3 py-1 text-sm border border-red-500 text-red-600 rounded hover:bg-red-50"
                    >
                      Deactivate
                    </button>

                    {!admin ? (
                      <button
                        onClick={() =>
                          setCreateAdminTenantId(t.Id)
                        }
                        className="px-3 py-1 text-sm border border-blue-500 text-blue-600 rounded hover:bg-blue-50"
                      >
                        Create Admin
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setResetAdminTenantId(t.Id)
                        }
                        className="px-3 py-1 text-sm border border-gray-500 text-gray-700 rounded hover:bg-gray-100"
                      >
                        Reset Admin Password
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => dispatch(reactivateTenant(t.Id))}
                    className="px-3 py-1 text-sm border border-green-600 text-green-700 rounded hover:bg-green-50"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
  );
}
