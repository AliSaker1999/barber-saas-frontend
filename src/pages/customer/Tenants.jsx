import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { selectTenant } from "../../features/booking/bookingSlice";

export default function Tenants() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tenants, loading } = useAppSelector(state => state.tenants);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");

  useEffect(() => {
    dispatch(fetchTenants());
  }, [dispatch]);

  const cities = ["All", ...new Set(tenants.map(t => t.City).filter(Boolean))];

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.Name.toLowerCase().includes(search.toLowerCase()) || 
                         (t.Area && t.Area.toLowerCase().includes(search.toLowerCase()));
    const matchesCity = selectedCity === "All" || t.City === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section with Search */}
      <div className="relative mb-12 text-center">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          The Best Barbers, <span className="text-blue-600">Your Style.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Discover top-rated barbershops in your area and book your next cut in seconds.
        </p>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or area..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <select
              className="w-full py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option disabled>Filter by City</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-3xl h-96 shadow-sm border border-gray-100"></div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTenants.length === 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center max-w-lg mx-auto">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
        </div>
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTenants.map((tenant) => (
          <div
            key={tenant.Id}
            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col h-full"
          >
            {/* Header / Cover Image */}
            <div className="relative h-48 overflow-hidden bg-gray-200">
              {tenant.CoverImageUrl ? (
                <img
                  src={tenant.CoverImageUrl}
                  alt={tenant.Name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 opacity-80"></div>
              )}
              
              {/* Logo Overlay */}
              <div className="absolute -bottom-6 left-6 w-20 h-20 bg-white rounded-2xl shadow-lg p-1 border-4 border-white overflow-hidden">
                {tenant.LogoUrl ? (
                  <img src={tenant.LogoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-2xl text-blue-600">
                    {tenant.Name[0]}
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="absolute top-4 right-4 flex gap-2">
                {tenant.City && (
                  <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {tenant.City}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-8 pt-10 flex flex-col flex-grow">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {tenant.Name}
                </h3>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  {tenant.Area || "Premium Barbershop"} • {tenant.Street || "Central Location"}
                </p>
              </div>

              {/* Contact Quick Info */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {tenant.Phone && (
                  <a
                    href={`tel:${tenant.Phone}`}
                    className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    Call Now
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
                    WhatsApp
                  </a>
                )}
                {tenant.GoogleMapLink && (
                  <a
                    href={tenant.GoogleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    View Map
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto space-y-3">
                <button
                  onClick={() => {
                    dispatch(selectTenant(tenant.Id));
                    navigate("/customer/services");
                  }}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Appointment
                </button>
                
                <button
                  onClick={() => {
                    dispatch(selectTenant(tenant.Id));
                    navigate("/customer/queue");
                  }}
                  className="w-full bg-white text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-50 transition-all border-2 border-gray-100 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Join the Queue
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
