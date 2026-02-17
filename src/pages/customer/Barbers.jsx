import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchBarbersForTenant,
  selectBarber
} from "../../features/booking/bookingSlice";
import BarberProfileModal from "../../components/BarberProfileModal";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import OptimizedImage from "../../components/OptimizedImage";

export default function Barbers() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    services,
    selectedServiceIds,
    barbers,
    selectedBarberId,
    barbersLoading,
    barbersError
  } = useAppSelector(state => state.booking);

  const [expandedBarbers, setExpandedBarbers] = useState({});
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState(null);

  const openProfile = (id) => {
    setViewProfileId(id);
    setProfileModalOpen(true);
  };

  useEffect(() => {
    if (!tenantId) {
      navigate("/customer");
      return;
    }

    if (!selectedServiceIds.length) {
      navigate("/customer/services");
      return;
    }

    dispatch(fetchBarbersForTenant({ tenantId }));
  }, [tenantId, selectedServiceIds, dispatch, navigate]);

  useEffect(() => {
    if (!selectedBarberId) return;
    const currentBarber = barbers.find(b => b.barberId === selectedBarberId);
    if (!currentBarber) return;
    const missing = selectedServiceIds.filter(id => !currentBarber.serviceIds.includes(id));
    if (missing.length) {
      dispatch(selectBarber(null));
    }
  }, [barbers, selectedBarberId, selectedServiceIds, dispatch]);

  const serviceLookup = useMemo(() => {
    return services.reduce((acc, service) => {
      acc[service.Id] = service;
      return acc;
    }, {});
  }, [services]);

  const selectedServiceNames = selectedServiceIds.map(
    id => serviceLookup[id]?.Name || "Unknown service"
  );

  const matchedBarbersCount = barbers.filter(barber =>
    selectedServiceIds.every(id => barber.serviceIds.includes(id))
  ).length;

  const toggleServices = (barberId) => {
    setExpandedBarbers(prev => ({
      ...prev,
      [barberId]: !prev[barberId]
    }));
  };

  const handleSelectBarber = (barber) => {
    const missing = selectedServiceIds.filter(id => !barber.serviceIds.includes(id));
    if (missing.length) return;
    dispatch(selectBarber(barber.barberId));
    navigate("/customer/slots");
  };

  const formatPrice = (value) => {
    if (value === null || value === undefined) {
      return "—";
    }
    return Number(value).toFixed(2);
  };

  if (barbersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <LoadingState label="Loading barbers that match your services..." blocks={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <button
            onClick={() => navigate("/customer/services")}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Services
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose Your Barber</h1>
          <p className="text-gray-600">
            You selected {selectedServiceIds.length} service{selectedServiceIds.length > 1 ? "s" : ""}: {" "}
            {selectedServiceNames.join(", ")}. Only cards labeled as a full match can be booked directly.
          </p>
        </div>

        {barbersError && (
          <ErrorState message={barbersError} onRetry={() => dispatch(fetchBarbersForTenant({ tenantId }))} />
        )}

        <div className={`rounded-2xl border px-5 py-4 text-sm ${matchedBarbersCount ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-orange-100 bg-orange-50 text-orange-700"}`}>
          {matchedBarbersCount
            ? `${matchedBarbersCount} ${matchedBarbersCount === 1 ? "barber" : "barbers"} can serve every selected service.`
            : "No barber currently covers every selected service. Try reducing the selection or choose a barber and update services accordingly."}
        </div>

        {barbers.length === 0 ? (
          <div className="space-y-4">
            <EmptyState
              title="No barbers available"
              description="We could not find any barbers available for your selected services right now."
            />
            <button
              onClick={() => navigate("/customer")}
              className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
            >
              Try another shop
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {barbers.map(barber => {
              const missingServices = selectedServiceIds.filter(id => !barber.serviceIds.includes(id));
              const supportsAll = missingServices.length === 0;
              const selectedCount = selectedServiceIds.length - missingServices.length;

              return (
                <article
                  key={barber.barberId}
                  className={`rounded-2xl border transition ${selectedBarberId === barber.barberId ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"} ${supportsAll ? "bg-white" : "bg-gray-50"}`}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="cursor-pointer" onClick={() => openProfile(barber.barberId)}>
                        <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">{barber.fullName}</h3>
                        <div className="flex items-center text-sm mt-0.5">
                           <span className="text-yellow-500 mr-1">★</span>
                           <span className="font-bold mr-1">{barber.averageRating ? Number(barber.averageRating).toFixed(1) : "New"}</span>
                           <span className="text-gray-400 text-xs">({barber.reviewsCount || 0} reviews)</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${supportsAll ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>
                        {supportsAll ? "Full match" : `${selectedCount}/${selectedServiceIds.length} services`}
                      </span>
                    </div>

                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openProfile(barber.barberId); }}
                      className="w-full relative group h-32 rounded-2xl overflow-hidden block"
                    >
                      {barber.profileImage ? (
                        <OptimizedImage
                          src={barber.profileImage}
                          alt={barber.fullName}
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          fetchPriority="low"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex flex-col items-center justify-center text-white">
                          <p className="text-sm font-semibold">{barber.isAvailable ? "Available now" : "Currently offline"}</p>
                          <p className="text-xs text-blue-100 mt-1">Tap to see profile</p>
                        </div>
                      )}
                      
                      {barber.profileImage && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white font-semibold text-sm border border-white px-3 py-1 rounded-full">View Profile</span>
                        </div>
                      )}
                    </button>

                    {missingServices.length > 0 && (
                      <p className="text-sm text-red-600">
                        Missing {missingServices.map(id => serviceLookup[id]?.Name || "service").join(", ")}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleServices(barber.barberId);
                      }}
                      className="text-left text-sm font-semibold uppercase tracking-wide text-blue-600 hover:text-blue-800"
                    >
                      {expandedBarbers[barber.barberId] ? "Hide linked services" : "View linked services"}
                    </button>

                    {expandedBarbers[barber.barberId] && (
                      <div className="space-y-3">
                        {barber.services.length === 0 && (
                          <p className="text-sm text-gray-500">This barber has no services linked right now.</p>
                        )}
                        {barber.services.map(service => (
                          <div
                            key={service.id}
                            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {service.name || serviceLookup[service.id]?.Name || "Unknown service"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {service.durationMinutes ?? 0} min · ${formatPrice(service.price)}
                              </p>
                            </div>
                            <span className={`text-[11px] px-2 py-1 rounded-full ${selectedServiceIds.includes(service.id) ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}>
                              {selectedServiceIds.includes(service.id) ? "Selected" : "Available"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelectBarber(barber)}
                      disabled={!supportsAll}
                      className={`w-full py-3 rounded-xl font-semibold transition ${supportsAll ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
                    >
                      {selectedBarberId === barber.barberId
                        ? "✓ Selected"
                        : supportsAll
                          ? "Select barber"
                          : "Can’t serve selected services"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {barbers.length > 0 && (
          <div className="flex flex-col gap-4 md:flex-row">
            <button
              onClick={() => navigate("/customer/services")}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-semibold text-gray-900 hover:border-gray-400 transition-colors"
            >
              ← Update Services
            </button>
            <button
              onClick={() => selectedBarberId && navigate("/customer/slots")}
              disabled={!selectedBarberId}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition ${selectedBarberId ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
            >
              Continue →
            </button>
          </div>
        )}
      </div>

       <BarberProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
        barberId={viewProfileId} 
      />
    </div>
  );
}
