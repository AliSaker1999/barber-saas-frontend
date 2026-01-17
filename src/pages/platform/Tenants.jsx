import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchPlatformTenants,
  createTenant,
  deactivateTenant
} from "../../features/platformTenants/platformTenantsSlice";
import CreateTenantAdminModal from "./CreateTenantAdminModal";

export default function PlatformTenants() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(
    s => s.platformTenants
  );

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
const [selectedTenantId, setSelectedTenantId] = useState(null);

  useEffect(() => {
    dispatch(fetchPlatformTenants());
  }, [dispatch]);

  const submitTenant = e => {
    e.preventDefault();
    dispatch(createTenant({ name, slug }));
    setName("");
    setSlug("");
  };

  return (
    <div>
      <h3>Tenants</h3>

      <form onSubmit={submitTenant}>
        <input
          placeholder="Tenant name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          placeholder="Slug"
          value={slug}
          onChange={e => setSlug(e.target.value)}
        />
        <button>Create Tenant</button>
      </form>

      {loading && <p>Loading...</p>}

      <ul>
        {items.map(t => (
          <li key={t.Id}>
            <strong>{t.Name}</strong> ({t.Slug}){" "}
            {t.IsActive ? "ACTIVE" : "INACTIVE"}

            {t.IsActive && (
              <>
                <button
                  onClick={() =>
                    dispatch(deactivateTenant(t.Id))
                  }
                >
                  Deactivate
                </button>

                <button
                    onClick={() => setSelectedTenantId(t.Id)}
                    >
                    Create Admin
                </button>
              </>
            )}
            <CreateTenantAdminModal
                tenantId={selectedTenantId}
                open={!!selectedTenantId}
                onClose={() => setSelectedTenantId(null)}
/>
          </li>
        ))}
      </ul>
    </div>
  );
}
