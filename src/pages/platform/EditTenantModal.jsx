import { useState, useEffect } from "react";
import { useAppDispatch } from "../../app/hooks";
import { updateTenantPlatform } from "../../features/platformTenants/platformTenantsSlice";
import Modal from "../../components/Modal";

export default function EditTenantModal({ tenant, isOpen, onClose }) {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.Name || "",
        slug: tenant.Slug || "",
        phone: tenant.Phone || "",
        whatsappNumber: tenant.WhatsappNumber || "",
        email: tenant.Email || "",
        websiteUrl: tenant.WebsiteUrl || "",
        city: tenant.City || "",
        area: tenant.Area || "",
        street: tenant.Street || "",
        building: tenant.Building || "",
        floor: tenant.Floor || "",
        googleMapLink: tenant.GoogleMapLink || "",
        taxNumber: tenant.TaxNumber || "",
        registrationNumber: tenant.RegistrationNumber || "",
        maxAdvanceBookingDays: tenant.MaxAdvanceBookingDays || 30,
        allowSameDayBooking: tenant.AllowSameDayBooking ?? true,
        cancellationPolicyHours: tenant.CancellationPolicyHours || 24,
      });
    }
  }, [tenant]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateTenantPlatform({ 
        tenantId: tenant.Id, 
        data: formData 
      })).unwrap();
      onClose();
    } catch (err) {
      alert("Failed to update tenant: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage: ${tenant.Name}`}>
      <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
        
        {/* Basic Info */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">1</div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Basic Identification</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Business Name" name="name" value={formData.name} onChange={handleChange} required />
            <Field label="URL Slug" name="slug" value={formData.slug} onChange={handleChange} required />
          </div>
        </section>

        {/* Contact Info */}
        <section>
          <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-bold">2</div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Contact & Social</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Landline Phone" name="phone" value={formData.phone} onChange={handleChange} />
            <Field label="WhatsApp Number" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} />
            <Field label="Public Email" name="email" value={formData.email} onChange={handleChange} type="email" />
            <Field label="Website URL" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} />
          </div>
        </section>

        {/* Location */}
        <section>
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold">3</div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Physical Location</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="City" name="city" value={formData.city} onChange={handleChange} />
            <Field label="Area / Neighborhood" name="area" value={formData.area} onChange={handleChange} />
            <Field label="Street" name="street" value={formData.street} onChange={handleChange} />
            <Field label="Building / Floor" name="building" value={formData.building} onChange={handleChange} placeholder="e.g. Tower 1, 4th Floor" />
            <div className="md:col-span-2">
               <Field label="Google Maps Link" name="googleMapLink" value={formData.googleMapLink} onChange={handleChange} />
            </div>
          </div>
        </section>

        {/* Booking Policy */}
        <section>
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center font-bold">4</div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Booking Policy</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Max Advance Days" name="maxAdvanceBookingDays" value={formData.maxAdvanceBookingDays} onChange={handleChange} type="number" />
            <Field label="Cancellation (Hours)" name="cancellationPolicyHours" value={formData.cancellationPolicyHours} onChange={handleChange} type="number" />
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="allowSameDayBooking" 
                  checked={formData.allowSameDayBooking} 
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900 transition-colors">Allow Same-Day</span>
              </label>
            </div>
          </div>
        </section>

        {/* Legal/Official */}
        <section>
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center font-bold">5</div>
             <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Business Registration</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Tax Number (VAT/TRN)" name="taxNumber" value={formData.taxNumber} onChange={handleChange} />
            <Field label="Registration Number" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} />
          </div>
        </section>

        <div className="sticky bottom-0 bg-white pt-6 border-t flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 rounded-xl font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <input
        className="w-full px-4 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300"
        {...props}
      />
    </div>
  );
}
