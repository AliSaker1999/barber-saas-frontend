import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchBarbersByService,
  selectBarber
} from "../../features/booking/bookingSlice";

export default function Barbers() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    tenantId,
    selectedServiceIds,
    barbers,
    selectedBarberId,
    loading
  } = useAppSelector(state => state.booking);

  /* 🚨 Guards */
  useEffect(() => {
    if (!tenantId) {
      navigate("/customer");
      return;
    }

    if (!selectedServiceIds.length) {
      navigate("/customer/services");
      return;
    }

    dispatch(fetchBarbersByService(selectedServiceIds[0]));
  }, [tenantId, selectedServiceIds, dispatch, navigate]);

  const handleSelectBarber = (barberId) => {
    dispatch(selectBarber(barberId));
    navigate("/customer/slots");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Finding available barbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
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
          <p className="text-gray-600">Select your preferred barber for the best experience</p>
        </div>

        {/* Empty State */}
        {barbers.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No barbers available</p>
            <p className="text-gray-400 text-sm mt-2">No barbers are currently available for this service</p>
            <button
              onClick={() => navigate("/customer/services")}
              className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Try Another Service
            </button>
          </div>
        )}

        {/* Barbers Grid */}
        {barbers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map(barber => (
              <div
                key={barber.BarberId}
                onClick={() => handleSelectBarber(barber.BarberId)}
                className={`rounded-lg shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-xl ${
                  selectedBarberId === barber.BarberId
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : "bg-white hover:shadow-lg"
                }`}
              >
                {/* Barber Avatar */}
                <div className="h-40 bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>

                {/* Barber Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900">{barber.FullName}</h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">(24 reviews)</span>
                  </div>

                  {/* Experience */}
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-semibold">8+ years</span> of experience
                  </p>

                  {/* Select Button */}
                  <button
                    onClick={() => handleSelectBarber(barber.BarberId)}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                      selectedBarberId === barber.BarberId
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {selectedBarberId === barber.BarberId ? "✓ Selected" : "Select"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Navigation */}
        {barbers.length > 0 && (
          <div className="mt-12 flex gap-4">
            <button
              onClick={() => navigate("/customer/services")}
              className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg font-semibold text-gray-900 hover:border-gray-400 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                if (selectedBarberId) {
                  navigate("/customer/slots");
                }
              }}
              disabled={!selectedBarberId}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                selectedBarberId
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
