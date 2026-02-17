import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchServices,
  toggleService,
  selectBarber,
  fetchBarbersForTenant
} from "../../features/booking/bookingSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";

export default function Services() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    services,
    selectedServiceIds,
    selectedBarberId,
    barbers,
    loading,
    error
  } = useAppSelector(state => state.booking);

  /* 🚨 Guard: user refreshed or skipped tenant */
  useEffect(() => {
    if (!tenantId) {
      navigate("/customer");
      return;
    }

    dispatch(fetchServices(tenantId));
    if (selectedBarberId && barbers.length === 0) {
      dispatch(fetchBarbersForTenant({ tenantId }));
    }
  }, [tenantId, dispatch, navigate, selectedBarberId, barbers.length]);

  const filteredServices = selectedBarberId
    ? services.filter(s => {
        const selectedBarber = barbers.find(b => b.barberId === selectedBarberId);
        return selectedBarber?.serviceIds?.includes(s.Id);
      })
    : services;

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <button
          onClick={() => navigate("/customer")}
          className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-2 mb-4 hover:translate-x-1 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Barbershops
        </button>
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            {selectedBarberId ? `Services for ${barbers.find(b => b.barberId === selectedBarberId)?.fullName || "Barber"}` : "Select Services"}
            {selectedBarberId && (
                <button 
                  onClick={() => dispatch(selectBarber(null))}
                  className="text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 px-3 py-1.5 rounded-full font-medium transition-colors"
                >
                  Show all barbers
                </button>
            )}
        </h1>
        <p className="text-gray-600">Choose the services you'd like</p>
      </div>

      {/* Loading State */}
      {loading && (
        <LoadingState label="Loading services..." blocks={3} />
      )}

      {/* Error State */}
      {!loading && error && (
        <ErrorState message={error} onRetry={() => dispatch(fetchServices(tenantId))} />
      )}

      {/* Empty State */}
      {!loading && !error && services.length === 0 && (
        <EmptyState title="No services available" description="This barbershop doesn't have any services yet." />
      )}

      {/* Services Grid */}
      {!loading && !error && filteredServices.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {filteredServices.map(service => (
              <div
                key={service.Id}
                onClick={() => dispatch(toggleService(service.Id))}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selectedServiceIds.includes(service.Id)
                    ? "border-indigo-600 bg-indigo-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                    selectedServiceIds.includes(service.Id)
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-gray-300"
                  }`}>
                    {selectedServiceIds.includes(service.Id) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{service.Name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {service.DurationMinutes} min
                      </span>
                      <span className="font-semibold text-indigo-600 text-base">
                        ${service.Price}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary and Navigation */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Services selected:</p>
                <p className="text-3xl font-bold text-gray-900">{selectedServiceIds.length}</p>
              </div>
              <button
                disabled={selectedServiceIds.length === 0}
                onClick={() => navigate("/customer/barbers")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Continue
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
