import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

export default function TenantDetailsModal({ isOpen, onClose, tenant, onBook, onQueue }) {
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loyalty, setLoyalty] = useState({ settings: null, rewards: [] });
  const [expandedBarberId, setExpandedBarberId] = useState(null);
  const [availabilityByBarber, setAvailabilityByBarber] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState({});

  useEffect(() => {
    if (!isOpen || !tenant?.Id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [servicesRes, barbersRes, loyaltyRes] = await Promise.all([
          api.get(`/services/tenant/${tenant.Id}`),
          api.get(`/barbers/tenants/${tenant.Id}/barbers`),
          api.get(`/loyalty/tenant/${tenant.Id}`)
        ]);
        setServices(servicesRes.data?.data || []);
        setBarbers(barbersRes.data?.data || []);
        setLoyalty(loyaltyRes.data?.data || { settings: null, rewards: [] });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load shop details");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, tenant?.Id]);

  useEffect(() => {
    if (!isOpen) {
      setExpandedBarberId(null);
      setAvailabilityByBarber({});
      setAvailabilityLoading({});
    }
  }, [isOpen]);

  const loadAvailability = async (barberId) => {
    if (availabilityByBarber[barberId] || availabilityLoading[barberId]) return;

    setAvailabilityLoading(prev => ({ ...prev, [barberId]: true }));
    try {
      const res = await api.get(`/barbers/${barberId}/availability`);
      setAvailabilityByBarber(prev => ({ ...prev, [barberId]: res.data?.data || [] }));
    } catch {
      setAvailabilityByBarber(prev => ({ ...prev, [barberId]: [] }));
    } finally {
      setAvailabilityLoading(prev => ({ ...prev, [barberId]: false }));
    }
  };

  const getScheduleRows = (barberId) => {
    const data = availabilityByBarber[barberId] || [];
    return DAY_NAMES.map((label, dayIndex) => {
      const slots = data.filter(s => s.DayOfWeek === dayIndex);
      return { label, slots };
    });
  };

  const activeServices = useMemo(
    () => services.filter(s => s.IsActive !== false),
    [services]
  );

  const loyaltyEnabled = loyalty?.settings?.loyaltyEnabled;
  const loyaltyAllowRedemption = loyalty?.settings?.loyaltyAllowRedemption;

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[2rem] shadow-2xl max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header / Cover */}
        <div className="relative h-48 sm:h-56 bg-gray-200">
          {tenant.CoverImageUrl ? (
            <img src={tenant.CoverImageUrl} alt={tenant.Name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600" />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-white/90 hover:bg-white transition-colors shadow tap-target"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute -bottom-10 left-6 w-20 h-20 bg-white rounded-2xl shadow-lg p-1 border-4 border-white overflow-hidden">
            {tenant.LogoUrl ? (
              <img src={tenant.LogoUrl} alt={tenant.Name} className="w-full h-full object-contain rounded-xl" />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center font-bold text-2xl text-blue-600">
                {tenant.Name ? tenant.Name[0] : "?"}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 pt-14 overflow-y-auto flex-1 pb-24 sm:pb-8">
          {/* Title & actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900">{tenant.Name}</h2>
              <p className="text-gray-500 mt-1">
                {tenant.Area || "Premium Barbershop"}{tenant.City ? ` • ${tenant.City}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {onBook && (
                <button
                  onClick={onBook}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow tap-target"
                >
                  Book
                </button>
              )}
              {onQueue && (
                <button
                  onClick={onQueue}
                  className="bg-white border-2 border-gray-100 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-xl tap-target"
                >
                  Join Queue
                </button>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {tenant.Phone && (
              <a
                href={`tel:${tenant.Phone}`}
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors tap-target"
              >
                <span className="text-blue-500">📞</span> {tenant.Phone}
              </a>
            )}
            {tenant.WhatsappNumber && (
              <a
                href={`https://wa.me/${tenant.WhatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors tap-target"
              >
                <span className="text-emerald-500">💬</span> WhatsApp
              </a>
            )}
            {tenant.GoogleMapLink && (
              <a
                href={tenant.GoogleMapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors tap-target"
              >
                <span className="text-red-500">📍</span> View Map
              </a>
            )}
            {tenant.WebsiteUrl && (
              <a
                href={tenant.WebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors tap-target"
              >
                <span>🌐</span> Website
              </a>
            )}
          </div>

          {loading && (
            <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-500 font-bold">Loading details...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-6 font-bold">
              {error}
            </div>
          )}

          {/* Services */}
          {!loading && (
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-3">Services</h3>
              {activeServices.length === 0 ? (
                <p className="text-gray-500">No services listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeServices.map(service => (
                    <span
                      key={service.Id}
                      className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100"
                    >
                      {service.Name} • {service.DurationMinutes}m • ${service.Price}
                      {service.LoyaltyPointsEarned ? ` • ${service.LoyaltyPointsEarned} pts` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loyalty Program */}
          {!loading && loyaltyEnabled && (
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-3">Loyalty Rewards</h3>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                <p className="text-sm text-amber-900 font-semibold">
                  Earn points on services and redeem them for rewards.
                  {loyaltyAllowRedemption ? " Loyalty redemption is available." : " Redemption is currently disabled."}
                </p>
              </div>
              {loyalty.rewards?.length === 0 ? (
                <p className="text-gray-500">No rewards available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {loyalty.rewards.map(reward => (
                    <span
                      key={reward.Id}
                      className="text-xs font-bold bg-white text-amber-700 px-3 py-1.5 rounded-full border border-amber-100"
                    >
                      {reward.PointsRequired} pts → {reward.ServiceName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Barbers */}
          {!loading && (
            <div>
              <h3 className="text-xl font-black text-gray-900 mb-3">Barbers</h3>
              {barbers.length === 0 ? (
                <p className="text-gray-500">No barbers available.</p>
              ) : (
                <div className="space-y-3">
                  {barbers.map(barber => {
                    const isExpanded = expandedBarberId === barber.barberId;
                    return (
                      <div key={barber.barberId} className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                              {barber.profileImage ? (
                                <img src={barber.profileImage} alt={barber.fullName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xl">👤</span>
                              )}
                            </div>
                            <div>
                              <div className="text-lg font-bold text-gray-900">{barber.fullName}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <span>⭐ {barber.averageRating || 0} ({barber.reviewsCount || 0})</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                <span>{barber.isAvailable ? "Available" : "Offline"}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const next = isExpanded ? null : barber.barberId;
                              setExpandedBarberId(next);
                              if (!isExpanded) {
                                loadAvailability(barber.barberId);
                              }
                            }}
                            className="text-sm font-bold text-blue-600 hover:text-blue-700"
                          >
                            {isExpanded ? "Hide" : "View"} Schedule
                          </button>
                        </div>

                        {/* Barber services */}
                        {barber.services?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {barber.services.map(service => (
                              <span
                                key={service.id}
                                className="text-[11px] font-bold bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border border-gray-100"
                              >
                                {service.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {isExpanded && (
                          <div className="mt-4 bg-gray-50 rounded-xl p-3">
                            {availabilityLoading[barber.barberId] && (
                              <p className="text-sm text-gray-500">Loading schedule...</p>
                            )}
                            {!availabilityLoading[barber.barberId] && (
                              <div className="space-y-2">
                                {getScheduleRows(barber.barberId).map(day => (
                                  <div key={day.label} className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-gray-700">{day.label}</span>
                                    <span className="text-gray-600">
                                      {day.slots.length === 0
                                        ? "Closed"
                                        : day.slots.map(s => `${s.StartTime} - ${s.EndTime}`).join(", ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {(onBook || onQueue) && (
          <div className="sm:hidden sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
            {onBook && (
              <button
                onClick={onBook}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow tap-target"
              >
                Book
              </button>
            )}
            {onQueue && (
              <button
                onClick={onQueue}
                className="flex-1 bg-white border-2 border-gray-100 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl tap-target"
              >
                Join Queue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
