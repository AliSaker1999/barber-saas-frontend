import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { selectTenant } from "../../features/booking/bookingSlice";
import { findMyActiveQueue } from "../../features/queue/queueSlice";
import { requestUserLocation } from "../../features/location/locationSlice";
import { haversineDistanceKm, formatDistanceKm } from "../../utils/geo";
import TenantDetailsModal from "../../components/TenantDetailsModal";
import MobileHeader from "../../components/MobileHeader";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import OptimizedImage from "../../components/OptimizedImage";
import Pagination from "../../components/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import usePagination from "../../hooks/usePagination";
import { runBackgroundJob } from "../../utils/backgroundJob";

/* Enhanced Dropdown Component */
function Dropdown({ value, onChange, options = [], icon = null, placeholder = null }) {
  return (
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none">{icon}</div>}
      <select
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={`w-full appearance-none bg-transparent border border-app-border rounded-lg px-3 py-2 ${icon ? 'pl-10' : ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
const TenantLogo = memo(function TenantLogo({ tenant }) {
  const [error, setError] = useState(false);

  if (tenant.LogoUrl && !error) {
    return (
      <OptimizedImage
        src={tenant.LogoUrl}
        alt={tenant.Name}
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    );
  }
  // fallback: show initials or a placeholder
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 font-bold text-xl">
      {tenant.Name ? tenant.Name[0] : "?"}
    </div>
  );
});

function Tenants() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tenants, loading } = useAppSelector(state => state.tenants);
  const activeQueue = useAppSelector(state => state.queue.activeQueue);
  const locationState = useAppSelector(state => state.location);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [selectedCity, setSelectedCity] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("newest");
  const [nearMeOnly, setNearMeOnly] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [processedTenants, setProcessedTenants] = useState([]);

  useEffect(() => {
    dispatch(fetchTenants());
    dispatch(findMyActiveQueue());
  }, [dispatch]);

  const openDetails = useCallback((tenant) => {
    setSelectedTenant(tenant);
    setDetailsOpen(true);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailsOpen(false);
  }, []);

  const goToActiveQueue = useCallback(() => {
    if (activeQueue) {
      dispatch(selectTenant(activeQueue.tenantId));
      navigate("/customer/queue");
    }
  }, [activeQueue, dispatch, navigate]);

  const handleUseLocation = async () => {
    try {
      await dispatch(requestUserLocation()).unwrap();
      setNearMeOnly(true);
      setSortBy("distance");
    } catch (err) {
      console.error("Location error", err);
    }
  };

  const cities = useMemo(() => ["All", ...new Set(tenants.map(t => t.City).filter(Boolean))], [tenants]);

  const userCoords = locationState.coords;
  useEffect(() => {
    let isCancelled = false;

    runBackgroundJob(() => {
      const tenantsWithDistance = tenants.map(t => {
        const lat = t.Latitude ?? t.latitude;
        const lon = t.Longitude ?? t.longitude;
        const hasCoords = lat != null && lon != null;
        const distanceKm = userCoords && hasCoords
          ? haversineDistanceKm(userCoords, { latitude: Number(lat), longitude: Number(lon) })
          : null;
        return { ...t, distanceKm };
      });

      return [...tenantsWithDistance]
        .filter(t => {
          const matchesSearch = t.Name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (t.Area && t.Area.toLowerCase().includes(debouncedSearch.toLowerCase()));
          const matchesCity = selectedCity === "All" || t.City === selectedCity;
          const matchesRating = (t.AverageRating || 0) >= minRating;
          const matchesNearMe = !nearMeOnly || (t.distanceKm != null && t.distanceKm <= radiusKm);
          return matchesSearch && matchesCity && matchesRating && matchesNearMe;
        })
        .sort((a, b) => {
          if (sortBy === "name_asc") return a.Name.localeCompare(b.Name);
          if (sortBy === "name_desc") return b.Name.localeCompare(a.Name);
          if (sortBy === "newest") return new Date(b.CreatedAt) - new Date(a.CreatedAt);
          if (sortBy === "rating_desc") return (b.AverageRating || 0) - (a.AverageRating || 0);
          if (sortBy === "distance") {
            if (a.distanceKm == null && b.distanceKm == null) return 0;
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
          }
          return 0;
        });
    }).then(results => {
      if (!isCancelled) setProcessedTenants(results);
    });

    return () => {
      isCancelled = true;
    };
  }, [tenants, userCoords, debouncedSearch, selectedCity, minRating, nearMeOnly, radiusKm, sortBy]);

  const totalVisible = processedTenants.length;
  const topRatedCount = processedTenants.filter(t => (t.AverageRating || 0) >= 4.5).length;
  const nearbyCount = processedTenants.filter(t => t.distanceKm != null && t.distanceKm <= radiusKm).length;
  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    selectedCity !== "All" ||
    minRating > 0 ||
    nearMeOnly ||
    sortBy !== "newest";

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedCity("All");
    setMinRating(0);
    setSortBy("newest");
    setNearMeOnly(false);
    setRadiusKm(10);
  }, []);

  const featuredTenant = processedTenants[0] || null;
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems
  } = usePagination(processedTenants, 9);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedCity, minRating, nearMeOnly, radiusKm, sortBy, setCurrentPage]);
  
  // Dropdown Options
  const cityOptions = cities.map(c => ({ value: c, label: c === "All" ? "All Cities" : c }));
  
  const ratingOptions = [
    { value: 0, label: "All Ratings" },
    { value: 4, label: "4.0+ Stars" },
    { value: 4.5, label: "4.5+ Stars" },
    { value: 3, label: "3.0+ Stars" },
  ];

  const radiusOptions = [
    { value: 3, label: "Within 3 km" },
    { value: 5, label: "Within 5 km" },
    { value: 10, label: "Within 10 km" },
    { value: 25, label: "Within 25 km" },
  ];

  const sortOptions = [
    { value: "newest", label: "Latest Shops" },
    { value: "rating_desc", label: "Top Rated" },
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
    ...(locationState.coords ? [{ value: "distance", label: "Closest to Me" }] : [])
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <MobileHeader
        title="Barbershops"
        onBack={() => navigate("/customer")}
        primaryAction={activeQueue ? { label: "Queue", onClick: goToActiveQueue } : null}
        subtitle="Discover & book"
      />
      {/* Active Queue Banner */}
      {activeQueue && (
        <div className="mb-4 sm:mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl sm:rounded-3xl p-0.5 sm:p-1 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white/10 backdrop-blur-sm rounded-[14px] sm:rounded-[22px] p-3 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-5 text-white w-full sm:w-auto">
              <div className="bg-white text-blue-600 p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg">
                <svg className="w-5 h-5 sm:w-8 sm:h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-extrabold text-sm sm:text-xl tracking-tight line-clamp-1">In line at {activeQueue.tenantName}</p>
                <p className="text-blue-100 text-[10px] sm:text-base font-medium opacity-90 truncate">Barber: {activeQueue.barberName}</p>
              </div>
            </div>
            <button 
              onClick={goToActiveQueue}
              className="w-full sm:w-auto bg-white text-blue-600 px-4 py-2 sm:px-8 sm:py-3 rounded-lg sm:rounded-xl font-bold hover:bg-blue-50 transition-all active:scale-95 text-xs sm:text-base"
            >
              Go to Queue →
            </button>
          </div>
        </div>
      )}

      {/* Hero Section with Search */}
      <div className="relative mb-2 sm:mb-10 px-1 sm:px-2">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-100/60 to-indigo-100/30 blur-2xl" />
        <div className="relative text-center px-1 sm:px-4 pt-1 sm:pt-4">
          <h1 className="text-2xl sm:text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-1.5 sm:mb-5 leading-[1.05]">
            Your Next Cut,
            <span className="block sm:inline bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Perfectly Matched.</span>
          </h1>
          <p className="hidden sm:block text-sm sm:text-lg text-gray-500 max-w-2xl mx-auto mb-3 sm:mb-7 leading-relaxed">
            Search, compare, and book trusted barbershops in seconds with smart filters that adapt to your location.
          </p>

          <div className="hidden sm:flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <span className="px-3 py-1.5 rounded-full bg-white border border-blue-100 text-[11px] sm:text-sm font-bold text-blue-700 shadow-sm">
              {totalVisible} shops available
            </span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-emerald-100 text-[11px] sm:text-sm font-bold text-emerald-700 shadow-sm">
              {topRatedCount} top-rated 4.5+
            </span>
            {locationState.coords && (
              <span className="px-3 py-1.5 rounded-full bg-white border border-indigo-100 text-[11px] sm:text-sm font-bold text-indigo-700 shadow-sm">
                {nearbyCount} within {radiusKm} km
              </span>
            )}
          </div>
        </div>

        {/* Search & Filter Bar - Enhanced Design */}
        <div className="bg-white/95 backdrop-blur p-2 sm:p-3 rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100 max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-1.5 sm:gap-3">
            {/* Search Input */}
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search salons..."
                className="w-full pl-9 pr-3 py-2 sm:pl-12 sm:pr-4 sm:py-3.5 bg-gray-50 border-2 border-transparent rounded-lg sm:rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder-gray-400 text-xs sm:text-base"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(prev => !prev)}
              className="sm:hidden w-full py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700"
            >
              {mobileFiltersOpen ? "Hide filters" : "Show filters"}
            </button>
            
            {/* Filters Row */}
            <div className={`${mobileFiltersOpen ? "grid" : "hidden"} sm:grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-3 w-full lg:w-auto`}>
              <div className="w-full lg:w-48">
                <Dropdown 
                  value={selectedCity} 
                  onChange={setSelectedCity} 
                  options={cityOptions} 
                  icon={
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  }
                />
              </div>
              <div className="w-full lg:w-48">
                <Dropdown 
                  value={sortBy} 
                  onChange={setSortBy} 
                  options={sortOptions}
                  icon={
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>
                  }
                />
              </div>
              <div className="w-full lg:w-48 col-span-2 sm:col-span-1 hidden sm:block">
                <Dropdown 
                  value={minRating} 
                  onChange={setMinRating} 
                  options={ratingOptions}
                  icon={
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location Panel */}
        <div className={`${mobileFiltersOpen ? "block" : "hidden"} sm:block mt-2 sm:mt-4 max-w-6xl mx-auto bg-white rounded-xl sm:rounded-2xl border border-gray-100 shadow-sm p-2.5 sm:p-5`}>
          <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={handleUseLocation}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition disabled:opacity-60 text-[10px] sm:text-base"
              disabled={locationState.loading}
            >
              {locationState.loading ? (
                <svg className="animate-spin w-3 h-3 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-3 h-3 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm7.5-2.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                </svg>
              )}
              Use My Location
            </button>

            <div className="flex-1 hidden sm:block">
              {locationState.coords ? (
                <div className="text-sm text-gray-600 font-semibold">
                  Location enabled • Accuracy ~{Math.round(locationState.accuracy || 0)}m
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Enable location to see the closest barbershops.
                </div>
              )}
              {locationState.error && (
                <div className="text-xs text-red-600 mt-1">{locationState.error}</div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="w-full sm:w-48">
                <Dropdown
                  value={radiusKm}
                  onChange={setRadiusKm}
                  options={radiusOptions}
                  icon={<span className="text-gray-400">📍</span>}
                  placeholder="Radius"
                />
              </div>
              <label className="inline-flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold text-gray-700 whitespace-nowrap">
                <input
                  type="checkbox"
                  className="h-3 w-3 sm:h-4 sm:w-4"
                  checked={nearMeOnly}
                  onChange={(e) => setNearMeOnly(e.target.checked)}
                  disabled={!locationState.coords}
                />
                Near me only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Results Insight */}
      <div className="mb-2 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
        <div>
          <p className="hidden sm:block text-xs sm:text-sm font-semibold text-gray-500 uppercase tracking-wide">Discover</p>
          <h2 className="text-base sm:text-2xl font-black text-gray-900">
            Showing {totalVisible} of {tenants.length} barbershops
          </h2>
          {featuredTenant && (
            <p className="hidden sm:block text-xs sm:text-sm text-gray-500 mt-1">
              Featured right now: <span className="font-bold text-gray-700">{featuredTenant.Name}</span>
            </p>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <LoadingState label="Loading barbershops..." blocks={6} />
      )}

      {/* Empty State */}
      {!loading && processedTenants.length === 0 && (
        <EmptyState title="No barbershops found" description="Try adjusting your search, city, or distance filters." />
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-7 auto-rows-fr">
        {paginatedItems.map((tenant, idx) => (
          <div
            key={tenant.Id}
            className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full"
          >
            {/* Header / Cover Image */}
            <div
              className="relative h-20 sm:h-48 overflow-hidden bg-app-surface-2 cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => openDetails(tenant)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  openDetails(tenant);
                }
              }}
            >
              {/* choose cover: for 3rd and 4th items reuse first/second cover if available */}
              {
                (() => {
                  const firstCover = paginatedItems[0]?.CoverImageUrl || paginatedItems[0]?.LogoUrl;
                  const secondCover = paginatedItems[1]?.CoverImageUrl || paginatedItems[1]?.LogoUrl;
                  let coverUrl = tenant.CoverImageUrl || tenant.LogoUrl || null;
                  if (!coverUrl) {
                    if (idx === 2) coverUrl = firstCover;
                    if (idx === 3) coverUrl = secondCover;
                  }
                  if (coverUrl) {
                    return (
                      <OptimizedImage
                        src={coverUrl}
                        alt={tenant.Name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 33vw, (max-width: 1024px) 50vw, 33vw"
                        fetchPriority="low"
                      />
                    );
                  }
                  return <div className="w-full h-full gradient-app-primary opacity-90"></div>;
                })()
              }
              
              {/* Logo Overlay */}
              <div className="absolute -bottom-3 left-1.5 w-8 h-8 sm:-bottom-6 sm:left-6 sm:w-20 sm:h-20 bg-white rounded-lg sm:rounded-2xl shadow-lg p-0.5 sm:p-1 border-2 sm:border-4 border-white overflow-hidden">
                <TenantLogo tenant={tenant} />
              </div>

              {/* Badges - Hidden/Simplified on mobile */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 sm:top-4 sm:right-4 sm:gap-2">
                {tenant.distanceKm != null && (
                  <span className="bg-white/90 backdrop-blur px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-indigo-700 shadow-sm flex items-center gap-1 self-end">
                    <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm7.5-2.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                    </svg>
                    {formatDistanceKm(tenant.distanceKm)}
                  </span>
                )}
                {tenant.AverageRating > 0 && (
                  <span className="bg-white/90 backdrop-blur px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-yellow-600 shadow-sm flex items-center gap-1 self-end">
                    <svg className="w-2 h-2 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {tenant.AverageRating}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-2 pt-3 sm:p-8 sm:pt-10 flex flex-col flex-grow">
              <div className="mb-1.5 sm:mb-4">
                <h3 className="text-[11px] sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1 group-hover:text-blue-600 transition-colors truncate">
                  {tenant.Name}
                </h3>
                <p className="text-[9px] sm:text-sm text-gray-500 flex items-center gap-1 truncate">
                  {tenant.Area || "Premium"}
                </p>
                <p className="hidden sm:block text-[11px] sm:text-sm text-gray-400 truncate mt-1">
                  {tenant.City || "Lebanon"}
                  {tenant.distanceKm != null ? ` • ${formatDistanceKm(tenant.distanceKm)}` : ""}
                </p>
              </div>

              {/* Contact Quick Info - Hidden on mobile */}
              <div className="hidden sm:grid grid-cols-2 gap-3 mb-6">
                {tenant.Phone && (
                  <a
                    href={`tel:${tenant.Phone}`}
                    className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    Call
                  </a>
                )}
                {tenant.WhatsappNumber && (
                  <a
                    href={`https://wa.me/${tenant.WhatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                  >
                    <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.216 3.075.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WA
                  </a>
                )}
              </div>

              {/* Actions - Combined/Simplified on mobile */}
              <div className="mt-auto flex flex-col gap-1 sm:gap-3">
                <button
                  onClick={() => {
                    dispatch(selectTenant(tenant.Id));
                    navigate("/customer/services");
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-1.5 sm:py-4 rounded-lg sm:rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-base"
                >
                  <svg className="w-2.5 h-2.5 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">Book</span>
                </button>
                
                <button
                  onClick={() => openDetails(tenant)}
                  className="hidden sm:flex w-full bg-white text-gray-600 sm:text-blue-600 font-bold py-2 sm:py-3 rounded-xl sm:rounded-2xl hover:bg-blue-50 transition-all border sm:border-2 border-gray-100 sm:border-blue-100 items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-base"
                >
                  <svg className="w-2.5 h-2.5 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="truncate">Details</span>
                </button>
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

      <TenantDetailsModal
        isOpen={detailsOpen}
        onClose={closeDetails}
        tenant={selectedTenant}
        onBook={() => {
          if (!selectedTenant) return;
          dispatch(selectTenant(selectedTenant.Id));
          navigate("/customer/services");
          closeDetails();
        }}
        onQueue={() => {
          if (!selectedTenant) return;
          dispatch(selectTenant(selectedTenant.Id));
          navigate("/customer/queue");
          closeDetails();
        }}
      />
    </div>
  );
}

export default Tenants;
