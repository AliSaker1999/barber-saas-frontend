import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCompanyProfile, updateCompanyProfile, resetUpdateSuccess } from "../../features/company/companySlice";

export default function CompanyProfile() {
  const dispatch = useDispatch();
  const { profile, loading, updateSuccess, error } = useSelector((state) => state.company);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    phone: "",
    whatsappNumber: "",
    email: "",
    websiteUrl: "",
    city: "",
    area: "",
    street: "",
    building: "",
    floor: "",
    googleMapLink: "",
    taxNumber: "",
    registrationNumber: "",
    logoUrl: "",
    coverImageUrl: "",
    maxAdvanceBookingDays: 30,
    allowSameDayBooking: true,
    cancellationPolicyHours: 24,
  });

  const [prevId, setPrevId] = useState(null);

  if (profile && profile.Id !== prevId) {
    setFormData((prev) => ({
      ...prev,
      ...profile,
    }));
    setPrevId(profile.Id);
  }

  useEffect(() => {
    dispatch(fetchCompanyProfile());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      alert("Profile updated successfully!");
      dispatch(resetUpdateSuccess());
    }
  }, [updateSuccess, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      maxAdvanceBookingDays: Number(formData.maxAdvanceBookingDays),
      cancellationPolicyHours: Number(formData.cancellationPolicyHours),
    };
    dispatch(updateCompanyProfile(payload));
  };

  if (loading && !profile) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Shop Profile</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Basic Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL Slug</label>
              <input
                type="text"
                name="slug"
                value={formData.slug || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tax Number</label>
              <input
                type="text"
                name="taxNumber"
                value={formData.taxNumber || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Registration Number</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Contact Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <input
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                name="websiteUrl"
                value={formData.websiteUrl || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="https://"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Location</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Area</label>
              <input
                type="text"
                name="area"
                value={formData.area || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Street</label>
              <input
                type="text"
                name="street"
                value={formData.street || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Building</label>
              <input
                type="text"
                name="building"
                value={formData.building || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Floor</label>
              <input
                type="text"
                name="floor"
                value={formData.floor || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1">Google Maps Link</label>
              <input
                type="url"
                name="googleMapLink"
                value={formData.googleMapLink || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
                placeholder="https://maps.google.com/..."
              />
            </div>
          </div>
        </div>

         {/* Images */}
         <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Branding (Image URLs)</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Logo URL</label>
              <input
                type="url"
                name="logoUrl"
                value={formData.logoUrl || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cover Image URL</label>
              <input
                type="url"
                name="coverImageUrl"
                value={formData.coverImageUrl || ""}
                onChange={handleChange}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
        </div>

        {/* Policies */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Booking Policies</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="allowSameDayBooking"
                checked={formData.allowSameDayBooking}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label className="ml-2 block text-sm font-medium">Allow Same Day Booking</label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Max Advance Booking (Days)</label>
                <input
                  type="number"
                  name="maxAdvanceBookingDays"
                  value={formData.maxAdvanceBookingDays}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cancellation Policy (Hours before)</label>
                <input
                  type="number"
                  name="cancellationPolicyHours"
                  value={formData.cancellationPolicyHours}
                  onChange={handleChange}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </form>
    </div>
  );
}
