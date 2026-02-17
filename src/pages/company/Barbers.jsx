import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchBarbers,
  createBarber,
  toggleBarberService,
  toggleAvailability
} from "../../features/barbers/barbersSlice";
import { fetchServices } from "../../features/services/servicesSlice";
import BarberWorkingHours from "./BarberWorkingHours";
import ErrorState from "../../components/ErrorState";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

export default function Barbers() {
  const dispatch = useAppDispatch();

  const barbers = useAppSelector(s => s.barbers.items);
  const services = useAppSelector(s => s.services.items);
  const user = useAppSelector(s => s.auth.user);

  const [selectedBarber, setSelectedBarber] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [selfAssignModal, setSelfAssignModal] = useState(false);
  const [selfAssignPayload, setSelfAssignPayload] = useState(null);

  useEffect(() => {
    dispatch(fetchBarbers());
    dispatch(fetchServices());
  }, [dispatch]);

  const isSelfAssign =
    user?.email &&
    email.trim() &&
    email.trim().toLowerCase() === user.email.toLowerCase();

  const submitPayload = payload => {
    dispatch(createBarber(payload))
      .unwrap()
      .then(() => {
        setFullName("");
        setEmail("");
        setPassword("");
        dispatch(fetchBarbers());
      })
      .catch(error => {
        const message =
          typeof error === "string"
            ? error
            : error?.response?.data?.message ||
              error?.message ||
              "Failed to add barber";

        if (
          message ===
          "Email already exists. Confirm self-assign to add yourself as barber."
        ) {
          setFormError("");
          setSelfAssignPayload({ ...payload, selfAssign: true });
          setSelfAssignModal(true);
          return;
        }

        setFormError(getFriendlyErrorMessage(error, message || "Unable to add barber right now."));
      });
  };

  const submit = e => {
    e.preventDefault();
    setFormError("");

    if (!fullName.trim() || !email.trim() || (!isSelfAssign && !password.trim())) {
      setFormError("Please fill all fields");
      return;
    }

    const payload = { fullName, email, password };
    submitPayload(payload);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">👥 Team Management</h1>
        <p className="text-gray-600">Manage your barber team, services, and schedule</p>
      </div>

      {/* Add Barber Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">➕ Add New Barber</h2>
        
        {formError && <ErrorState message={formError} onRetry={() => setFormError("")} retryLabel="Dismiss" />}

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="John Doe"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="john@barber.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              placeholder={isSelfAssign ? "Uses your admin password" : "••••••••"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!isSelfAssign}
              disabled={isSelfAssign}
            />
            {isSelfAssign && (
              <p className="text-xs text-gray-500 mt-2">
                You can use your admin password for barber login.
              </p>
            )}
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl">
              Add Barber
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Barbers List */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Team Members</h3>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {barbers.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2z" />
                </svg>
                <p className="text-gray-500 font-medium">No barbers added yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {barbers.map(barber => (
                  <button
                    key={barber.Id}
                    onClick={() => setSelectedBarber(barber.Id === selectedBarber ? null : barber.Id)}
                    className={`w-full text-left p-4 transition-all hover:bg-blue-50 ${
                      barber.Id === selectedBarber ? "bg-blue-50 border-l-4 border-blue-600" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {barber.FullName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{barber.FullName}</p>
                        <p className="text-xs text-gray-600">{barber.Email}</p>
                      </div>
                      {barber.IsAvailable && (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel */}
        {selectedBarber && (
          <div className="lg:col-span-2">
            {(() => {
              const barber = barbers.find(b => b.Id === selectedBarber);
              return (
                barber && (
                  <div className="space-y-6">
                    {/* Availability & Info */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">{barber.FullName}</h3>
                        <button
                          onClick={() => dispatch(toggleAvailability({
                            barberId: barber.Id,
                            isAvailable: !barber.IsAvailable
                          }))}
                          className={`px-6 py-2 rounded-full font-semibold transition-all ${
                            barber.IsAvailable
                              ? "bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300"
                          }`}
                        >
                          {barber.IsAvailable ? "✓ Working" : "○ Off-Duty"}
                        </button>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
                          <span className="text-sm font-bold text-gray-700">Online Appointments</span>
                          <button
                            onClick={() => dispatch(toggleAvailability({
                              barberId: barber.Id,
                              isAcceptingAppointments: !barber.IsAcceptingAppointments
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
                              barber.IsAcceptingAppointments ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                            }`}
                          >
                            {barber.IsAcceptingAppointments ? "Active" : "Disabled"}
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 flex-1">
                          <span className="text-sm font-bold text-gray-700">Auto-Accept Policy</span>
                          <button
                            onClick={() => dispatch(toggleAvailability({
                              barberId: barber.Id,
                              autoAcceptAppointments: !barber.AutoAcceptAppointments
                            }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-tight transition-all ${
                              barber.AutoAcceptAppointments ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-orange-100 text-orange-700 border border-orange-200"
                            }`}
                          >
                            {barber.AutoAcceptAppointments ? "Auto" : "Manual"}
                          </button>
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm font-medium">{barber.Email}</p>
                    </div>

                    {/* Services */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">Services</h4>
                      {services.length === 0 ? (
                        <p className="text-gray-500">No services available. Add services first.</p>
                      ) : (
                        <div className="space-y-3">
                          {services.map(service => (
                            <label key={service.Id} className="flex items-center p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                              <input
                                type="checkbox"
                                checked={barber.ServiceIds?.includes(service.Id) || false}
                                onChange={() => dispatch(toggleBarberService({ barberId: barber.Id, serviceId: service.Id }))}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300"
                              />
                              <span className="ml-3 flex-1">
                                <p className="font-semibold text-gray-900">{service.Name}</p>
                                <p className="text-sm text-gray-600">${service.Price} • {service.DurationMinutes}min</p>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Working Hours */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4">⏰ Working Hours</h4>
                      <BarberWorkingHours barber={barber} />
                    </div>
                  </div>
                )
              );
            })()}
          </div>
        )}

        {/* Empty State */}
        {!selectedBarber && barbers.length > 0 && (
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-12 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <p className="text-gray-600 font-medium">Select a barber to view and manage their details</p>
            </div>
          </div>
        )}
      </div>

      {selfAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Confirm barber assignment</h3>
            <p className="text-sm text-gray-600">
              You are about to assign yourself as a barber. You can continue using your admin password for barber logins.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelfAssignModal(false);
                  setSelfAssignPayload(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                No
              </button>
              <button
                onClick={() => {
                  if (!selfAssignPayload) return;
                  setSelfAssignModal(false);
                  submitPayload(selfAssignPayload);
                  setSelfAssignPayload(null);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 transition"
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
