import { useState, useEffect } from "react";
import { useAppDispatch } from "../../app/hooks";
import { updateCustomerPlatform } from "../../features/platformCustomers/platformCustomersSlice";
import Modal from "../../components/Modal";

export default function EditCustomerModal({ customer, isOpen, onClose }) {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        fullName: customer.FullName || "",
        phoneNumber: customer.PhoneNumber || "",
        gender: customer.Gender || "",
        birthdate: customer.Birthdate ? customer.Birthdate.split('T')[0] : "",
        allowSMS: customer.AllowSMS ?? true,
        allowWhatsApp: customer.AllowWhatsApp ?? true,
        allowEmail: customer.AllowEmail ?? true,
      });
    }
  }, [customer]);

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
      await dispatch(updateCustomerPlatform({ 
        id: customer.Id, 
        data: formData 
      })).unwrap();
      onClose();
    } catch (err) {
      alert("Failed to update customer: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Customer: ${customer.FullName}`}>
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        
        {/* Profile Details */}
        <section>
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-app-surface-2 text-app-accent rounded-[12px] flex items-center justify-center font-bold">1</div>
             <h3 className="text-lg font-black text-app-text uppercase tracking-tight">Personal Information</h3>
           </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
            <Field label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
            <div className="md:col-span-1">
               <label className="block text-xs font-black text-app-muted uppercase tracking-widest ml-1 mb-1.5">Gender</label>
               <select 
                 name="gender" 
                 value={formData.gender} 
                 onChange={handleChange}
                 className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:bg-app-surface-2 focus:outline-none transition-all text-app-text font-bold"
               >
                 <option value="">Select Gender</option>
                 <option value="Male">Male</option>
                 <option value="Female">Female</option>
                 <option value="Other">Other</option>
               </select>
            </div>
            <Field label="Birth Date" name="birthdate" value={formData.birthdate} onChange={handleChange} type="date" />
          </div>
        </section>

        {/* Notifications */}
        <section>
           <div className="flex items-center gap-2 mb-4">
             <div className="w-8 h-8 bg-app-surface-2 text-app-accent rounded-[12px] flex items-center justify-center font-bold">2</div>
             <h3 className="text-lg font-black text-app-text uppercase tracking-tight">Notification Preferences</h3>
           </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Checkbox label="Allow SMS" name="allowSMS" checked={formData.allowSMS} onChange={handleChange} />
            <Checkbox label="Allow WhatsApp" name="allowWhatsApp" checked={formData.allowWhatsApp} onChange={handleChange} />
            <Checkbox label="Allow Email" name="allowEmail" checked={formData.allowEmail} onChange={handleChange} />
          </div>
        </section>

        <div className="pt-6 border-t border-app-border flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-[12px] font-bold text-app-muted hover:bg-app-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-2.5 rounded-[12px] font-black bg-app-accent text-white hover:bg-app-accent-dark shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Update Profile"}
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
        className="w-full px-4 py-2.5 bg-app-surface border-2 border-app-border rounded-[12px] focus:border-app-accent focus:bg-app-surface-2 focus:outline-none transition-all text-app-text font-bold"
        {...props}
      />
    </div>
  );
}

function Checkbox({ label, name, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 p-4 bg-app-surface rounded-[12px] border-2 border-transparent hover:border-app-border cursor-pointer transition-all group">
      <input 
        type="checkbox" 
        name={name} 
        checked={checked} 
        onChange={onChange}
        className="w-5 h-5 rounded border-app-border text-app-accent focus:ring-app-accent"
      />
      <span className="text-sm font-bold text-app-text group-hover:text-app-accent transition-colors">{label}</span>
    </label>
  );
}
