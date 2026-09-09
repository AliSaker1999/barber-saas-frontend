import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchActiveTenants } from "../../features/publicBooking/publicBookingSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import OptimizedImage from "../../components/OptimizedImage";
import { captureAcquisitionSource } from "../../utils/acquisition";

export default function FindShop() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { activeTenants, activeTenantsLoading, activeTenantsError } = useAppSelector(s => s.publicBooking);
  const [search, setSearch] = useState("");

  useEffect(() => {
    /* The shop directory is also a shared entry point (an Ajmal-wide QR or
       Instagram post), so the tag is captured here too. */
    captureAcquisitionSource();
    dispatch(fetchActiveTenants());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activeTenants;
    return activeTenants.filter(t =>
      t.Name?.toLowerCase().includes(term) ||
      t.City?.toLowerCase().includes(term) ||
      t.Area?.toLowerCase().includes(term)
    );
  }, [activeTenants, search]);

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-app-text">Find a shop</h1>
          <p className="text-sm text-app-muted mt-1">Book an appointment without an account — just pick a shop to get started.</p>
        </div>

        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by shop name, city, or area..."
            className="w-full pl-12 pr-4 py-3 border border-app-border rounded-xl bg-app-surface text-app-text focus:ring-2 focus:ring-app-primary"
          />
        </div>

        {activeTenantsLoading && <LoadingState label="Loading shops..." blocks={4} />}

        {activeTenantsError && !activeTenantsLoading && (
          <EmptyState title="Couldn't load shops" description={activeTenantsError} />
        )}

        {!activeTenantsLoading && !activeTenantsError && filtered.length === 0 && (
          <EmptyState title="No shops found" description="Try a different search term." />
        )}

        <div className="space-y-3">
          {filtered.map(tenant => (
            <button
              key={tenant.Id}
              onClick={() => navigate(`/book/${tenant.Slug}`)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-app-border bg-app-surface text-left hover:border-blue-400 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-app-surface-2 overflow-hidden flex items-center justify-center flex-shrink-0">
                {tenant.LogoUrl ? (
                  <OptimizedImage src={tenant.LogoUrl} alt={tenant.Name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-lg text-blue-600">{tenant.Name?.[0] || "?"}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-app-text truncate">{tenant.Name}</p>
                <p className="text-sm text-app-muted truncate">
                  {tenant.Area || tenant.City || "Lebanon"}
                  {tenant.AverageRating > 0 ? ` · ⭐ ${tenant.AverageRating}` : ""}
                </p>
              </div>
              <svg className="w-5 h-5 text-app-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
