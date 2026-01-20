import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { selectTenant } from "../../features/booking/bookingSlice";
import { joinQueue } from "../../features/queue/queueSlice";

export default function Tenants() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tenants, loading } = useAppSelector(state => state.tenants);

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Find a Barbershop</h1>
        <p className="text-gray-600 text-lg">Browse and book appointments at your favorite salons</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 text-lg">Loading barbershops...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && tenants.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-gray-500 text-lg font-semibold">No barbershops available</p>
          <p className="text-gray-400 mt-2">Please check back later or contact support</p>
        </div>
      )}

      {/* Tenants Grid */}
      {!loading && tenants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map(tenant => (
            <div key={tenant.Id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
              {/* Card Header with Gradient */}
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 100 100">
                    <circle cx="20" cy="20" r="15" opacity="0.5" />
                    <circle cx="80" cy="80" r="20" opacity="0.5" />
                  </svg>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-6 py-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tenant.Name}</h3>
                <p className="text-gray-600 text-sm mb-6">Premium barbershop experience</p>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Book Appointment Button */}
                  <button
                    onClick={() => {
                      dispatch(selectTenant(tenant.Id));
                      navigate("/customer/services");
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Book Appointment
                  </button>

                  {/* Join Queue Button */}
                  <button
                    onClick={async () => {
                      try {
                        await dispatch(joinQueue(tenant.Id)).unwrap();
                        navigate("/customer/queue");
                      } catch (err) {
                        alert(err.message || "Cannot join queue");
                      }
                    }}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-indigo-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Join Queue
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
