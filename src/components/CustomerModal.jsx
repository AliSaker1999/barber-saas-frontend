import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCustomerTenantDetails, clearSelectedCustomer } from "../features/customers/customersSlice";

export default function CustomerModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { selectedCustomer, loading, updateSuccess } = useSelector((state) => state.customers);

  const [notes, setNotes] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [prevId, setPrevId] = useState(null);

  if (selectedCustomer && selectedCustomer.Id !== prevId) {
    setNotes(selectedCustomer.Notes || "");
    setLoyaltyPoints(selectedCustomer.LoyaltyPoints || 0);
    setPrevId(selectedCustomer.Id);
  }

  useEffect(() => {
    if (updateSuccess) {
      onClose();
      dispatch(clearSelectedCustomer());
    }
  }, [updateSuccess, onClose, dispatch]);

  const handleSave = () => {
    dispatch(updateCustomerTenantDetails({
      customerId: selectedCustomer.Id,
      notes,
      loyaltyPoints: parseInt(loyaltyPoints)
    }));
  };

  if (!isOpen || !selectedCustomer) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-3xl border border-white/20">
              👤
            </div>
            <div>
              <h2 className="text-3xl font-bold">{selectedCustomer.FullName}</h2>
              <p className="text-gray-300 mt-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                Member since {selectedCustomer.CreatedAt ? new Date(selectedCustomer.CreatedAt).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Customer Global Info (Read Only) */}
          <section className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Gender</p>
              <p className="font-bold text-gray-800">{selectedCustomer.Gender || "Not Set"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Birthdate</p>
              <p className="font-bold text-gray-800">
                {selectedCustomer.Birthdate ? new Date(selectedCustomer.Birthdate).toLocaleDateString() : "Not Set"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Last Visit</p>
              <p className="font-bold text-gray-800 text-blue-600">
                {selectedCustomer.LastAppointmentDate ? new Date(selectedCustomer.LastAppointmentDate).toLocaleDateString() : "First Time"}
              </p>
            </div>
          </section>

          {/* Contact Methods */}
          <section className="flex flex-wrap gap-4">
            <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${selectedCustomer.AllowSMS ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400 line-through"}`}>
              📱 SMS
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${selectedCustomer.AllowWhatsApp ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400 line-through"}`}>
              💬 WhatsApp
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${selectedCustomer.AllowEmail ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-400 line-through"}`}>
              📧 Email
            </div>
          </section>

          {/* Editable Tenant Info */}
          <div className="space-y-6 pt-6 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Loyalty Points</label>
                <div className="relative">
                  <input
                    type="number"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(e.target.value)}
                    className="w-full bg-indigo-50 border-none rounded-2xl py-4 px-6 text-xl font-black text-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all pointer-events-auto"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">🏆</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">No Show Count</label>
                <div className="w-full bg-red-50 border-none rounded-2xl py-4 px-6 text-xl font-black text-red-700 flex items-center justify-between">
                  <span>{selectedCustomer.NoShowCount || 0}</span>
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Privat Staff Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-4 focus:ring-gray-100 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                placeholder="Mention allergies, style preferences, or special requests here..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-white text-gray-700 font-bold rounded-2xl border-2 border-gray-100 hover:bg-gray-50 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl shadow-gray-200 hover:bg-black hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Customer Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
