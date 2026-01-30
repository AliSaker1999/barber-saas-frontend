import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchServices,
  addService,
  updateService,
  deleteService
} from "../../features/services/servicesSlice";
import Modal from "../../components/Modal";

export default function Services() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.services);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [formError, setFormError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editService, setEditService] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editLoyaltyPoints, setEditLoyaltyPoints] = useState("");

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    serviceId: null,
    serviceName: ""
  });

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
      durationMinutes: Number(duration),
      loyaltyPointsEarned: Number(loyaltyPoints || 0)
    }))
      .unwrap()
      .then(() => dispatch(fetchServices()))
      .catch(err => setFormError(err?.message || "Failed to add service"));

    setName("");
    setPrice("");
    setDuration("");
    setLoyaltyPoints("");
  };

  const toggleActive = service => {
    setFormError("");
    dispatch(updateService({
      serviceId: service.Id,
      updates: {
        name: service.Name,
        durationMinutes: service.DurationMinutes,
        price: service.Price,
        isActive: !service.IsActive
      }
    }))
      .unwrap()
      .catch(err => setFormError(err || "Failed to update service"));
  };

  const openEditModal = service => {
    setEditService(service);
    setEditName(service.Name || "");
    setEditPrice(String(service.Price ?? ""));
    setEditDuration(String(service.DurationMinutes ?? ""));
    setEditLoyaltyPoints(String(service.LoyaltyPointsEarned ?? ""));
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditService(null);
    setEditName("");
    setEditPrice("");
    setEditDuration("");
    setEditLoyaltyPoints("");
  };

  const saveEdit = () => {
    if (!editService) return;
    if (!editName.trim() || !editPrice || !editDuration) {
      setFormError("Please fill all fields");
      return;
    }

    dispatch(updateService({
      serviceId: editService.Id,
      updates: {
        name: editName.trim(),
        price: Number(editPrice),
        durationMinutes: Number(editDuration),
        loyaltyPointsEarned: Number(editLoyaltyPoints || 0),
        isActive: editService.IsActive
      }
    }))
      .unwrap()
      .then(() => closeEditModal())
      .catch(err => setFormError(err || "Failed to update service"));
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

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Loyalty Points</label>
            <input
              placeholder="10"
              type="number"
              min="0"
              value={loyaltyPoints}
              onChange={e => setLoyaltyPoints(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
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
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">⭐ Loyalty Points</span>
                    <span className="font-bold text-amber-600">{service.LoyaltyPointsEarned ?? 0}</span>
                  </div>
                </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleActive(service)}
                      className={`flex-1 font-semibold py-2 px-4 rounded-lg transition-all ${
                        service.IsActive
                          ? "bg-green-100 hover:bg-green-200 text-green-700 border-2 border-green-300"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-gray-300"
                      }`}
                    >
                      {service.IsActive ? "✓ Active" : "○ Inactive"}
                    </button>
                    <button
                      onClick={() => openEditModal(service)}
                      className="font-semibold py-2 px-4 rounded-lg transition-all bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteModal({
                        isOpen: true,
                        serviceId: service.Id,
                        serviceName: service.Name
                      })}
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

      {/* Edit Service Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        title="Edit Service"
      >
        <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (min)</label>
                <input
                  type="number"
                  min="1"
                  value={editDuration}
                  onChange={e => setEditDuration(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Loyalty Points</label>
                <input
                  type="number"
                  min="0"
                  value={editLoyaltyPoints}
                  onChange={e => setEditLoyaltyPoints(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-bold text-white hover:from-blue-700 hover:to-indigo-700 transition shadow-lg"
              >
                Save Changes
              </button>
            </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        title="Delete Service"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete {deleteModal.serviceName}?</h3>
            <p className="text-gray-500 mb-8">Are you sure? This action cannot be undone and may affect existing appointments.</p>
            
            <div className="flex gap-3">
                <button 
                    onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => {
                        dispatch(deleteService(deleteModal.serviceId));
                        setDeleteModal({ ...deleteModal, isOpen: false });
                    }}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg shadow-red-200"
                >
                    Delete Now
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
