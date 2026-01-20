import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchServices,
  addService,
  toggleService,
  deleteService
} from "../../features/services/servicesSlice";

export default function Services() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.services);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    dispatch(fetchServices());
  }, [dispatch]);

  const submit = e => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !price || !duration) {
      setFormError("Please fill all fields");
      return;
    }

    dispatch(addService({
      name,
      price: Number(price),
      durationMinutes: Number(duration)
    }));

    setName("");
    setPrice("");
    setDuration("");
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">✂️ Services</h1>
        <p className="text-gray-600">Manage your salon services and pricing</p>
      </div>

      {/* Add Service Form */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">➕ Add New Service</h2>
        
        {formError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium">{formError}</p>
          </div>
        )}

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Service Name</label>
            <input
              placeholder="e.g., Haircut"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
            <input
              placeholder="25.00"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (min)</label>
            <input
              placeholder="30"
              type="number"
              min="1"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              Add Service
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 text-lg mt-4">Loading services...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p className="text-gray-500 text-lg font-semibold">No services added yet</p>
          <p className="text-gray-400 mt-2">Add your first service using the form above</p>
        </div>
      )}

      {/* Services Grid */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(service => (
            <div
              key={service.Id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-24 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 100 100">
                    <circle cx="30" cy="30" r="20" opacity="0.5" />
                    <circle cx="70" cy="70" r="25" opacity="0.5" />
                  </svg>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{service.Name}</h3>

                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">⏱️ Duration</span>
                    <span className="font-bold text-indigo-600">{service.DurationMinutes} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">💰 Price</span>
                    <span className="font-bold text-green-600 text-lg">${service.Price}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => dispatch(toggleService({
                      id: service.Id,
                      isActive: !service.IsActive
                    }))}
                    className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-all ${
                      service.IsActive
                        ? "bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-300"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300"
                    }`}
                  >
                    {service.IsActive ? "✓ Active" : "○ Inactive"}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("Delete this service?")) {
                        dispatch(deleteService(service.Id));
                      }
                    }}
                    className="font-semibold py-2 px-4 rounded-lg transition-all bg-red-100 hover:bg-red-200 text-red-700 border-2 border-red-300"
                  >
                    Delete
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
