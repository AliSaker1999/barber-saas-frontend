import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import { selectTenant } from "../../features/booking/bookingSlice";
import { findMyActiveQueue } from "../../features/queue/queueSlice";

/* Enhanced Dropdown Component */
const Dropdown = ({ value, onChange, options, icon, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full py-3.5 px-4 bg-white border-2 border-transparent rounded-2xl flex items-center justify-between transition-all duration-200 ${
          isOpen 
            ? 'border-blue-600 shadow-lg ring-4 ring-blue-50/50' 
            : 'hover:bg-gray-50'
        }`}
        style={{ backgroundColor: isOpen ? 'white' : '#F9FAFB' }} // Match bg-gray-50 when closed
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className={`font-bold truncate ${isOpen ? 'text-blue-600' : 'text-gray-700'}`}>
            {selectedLabel}
          </span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
          <div className="max-h-60 overflow-y-auto section-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm font-bold transition-all border-l-4 ${
                  value === option.value 
                    ? "bg-blue-50 text-blue-600 border-blue-600" 
                    : "text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Tenants() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tenants, loading } = useAppSelector(state => state.tenants);
  const activeQueue = useAppSelector(state => state.queue.activeQueue);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    dispatch(fetchTenants());
    dispatch(findMyActiveQueue());
  }, [dispatch]);

  const goToActiveQueue = () => {
    if (activeQueue) {
      dispatch(selectTenant(activeQueue.tenantId));
      navigate("/customer/queue");
    }
  };

  const cities = ["All", ...new Set(tenants.map(t => t.City).filter(Boolean))];

  const processedTenants = [...tenants]
    .filter(t => {
      const matchesSearch = t.Name.toLowerCase().includes(search.toLowerCase()) || 
                           (t.Area && t.Area.toLowerCase().includes(search.toLowerCase()));
      const matchesCity = selectedCity === "All" || t.City === selectedCity;
      const matchesRating = (t.AverageRating || 0) >= minRating;
      return matchesSearch && matchesCity && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.Name.localeCompare(b.Name);
      if (sortBy === "name_desc") return b.Name.localeCompare(a.Name);
      if (sortBy === "newest") return new Date(b.CreatedAt) - new Date(a.CreatedAt);
      if (sortBy === "rating_desc") return (b.AverageRating || 0) - (a.AverageRating || 0);
      return 0;
    });
  
  // Dropdown Options
  const cityOptions = cities.map(c => ({ value: c, label: c === "All" ? "All Cities" : c }));
  
  const ratingOptions = [
    { value: 0, label: "All Ratings" },
    { value: 4, label: "4.0+ Stars" },
    { value: 4.5, label: "4.5+ Stars" },
    { value: 3, label: "3.0+ Stars" },
  ];

  const sortOptions = [
    { value: "newest", label: "Latest Shops" },
    { value: "rating_desc", label: "Top Rated" },
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Active Queue Banner */}
      {activeQueue && (
        <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-1 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white/10 backdrop-blur-sm rounded-[22px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-5 text-white">
              <div className="bg-white text-blue-600 p-3 rounded-2xl shadow-lg">
                <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-extrabold text-xl tracking-tight">You're in line at {activeQueue.tenantName}</p>
                <p className="text-blue-100 font-medium opacity-90">Barber: {activeQueue.barberName}</p>
              </div>
            </div>
            <button 
              onClick={goToActiveQueue}
              className="w-full sm:w-auto bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 hover:scale-105 hover:shadow-lg transition-all active:scale-95"
            >
              Go to Queue →
            </button>
          </div>
        </div>
      )}

      {/* Hero Section with Search */}
      <div className="relative mb-12 text-center">
        <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mb-6">
          The Best Barbers,<br/><span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Your Style.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Discover top-rated barbershops in your area and book your next cut in seconds.
        </p>

        {/* Search & Filter Bar - Enhanced Design */}
        <div className="bg-white p-3 rounded-3xl shadow-2xl shadow-blue-900/5 border border-gray-100 max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search salons..."
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder-gray-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
              <div className="w-full lg:w-48">
                <Dropdown 
                  value={selectedCity} 
                  onChange={setSelectedCity} 
                  options={cityOptions} 
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  }
                />
              </div>
              <div className="w-full lg:w-48">
                <Dropdown 
                  value={minRating} 
                  onChange={setMinRating} 
                  options={ratingOptions}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                  }
                />
              </div>
              <div className="w-full lg:w-48">
                <Dropdown 
                  value={sortBy} 
                  onChange={setSortBy} 
                  options={sortOptions}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>
                  }
                />
              </div>
            </div>
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
      {!loading && processedTenants.length === 0 && (
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
        {processedTenants.map((tenant) => (
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
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {tenant.City && (
                  <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm flex items-center gap-1">
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {tenant.City}
                  </span>
                )}
                {tenant.AverageRating > 0 && (
                  <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-yellow-600 shadow-sm flex items-center gap-1 self-end">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {tenant.AverageRating} ({tenant.ReviewsCount})
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
