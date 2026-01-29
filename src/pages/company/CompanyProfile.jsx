import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCompanyProfile, updateCompanyProfile, resetUpdateSuccess } from "../../features/company/companySlice";
import { uploadImage } from "../../services/media";

export default function CompanyProfile() {
  const dispatch = useDispatch();
  const { profile, loading, updateSuccess, error } = useSelector((state) => state.company);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, cover: false });
  const [uploadError, setUploadError] = useState(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState("logo");
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);
  
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
    whishPhoneNumber: "",
    isWhishPaymentEnabled: true,
    isCreditCardPaymentEnabled: false,
  });

  const [prevId, setPrevId] = useState(null);

  if (profile && profile.Id !== prevId) {
    setFormData({
      name: profile.Name || "",
      slug: profile.Slug || "",
      phone: profile.Phone || "",
      whatsappNumber: profile.WhatsappNumber || "",
      email: profile.Email || "",
      websiteUrl: profile.WebsiteUrl || "",
      city: profile.City || "",
      area: profile.Area || "",
      street: profile.Street || "",
      building: profile.Building || "",
      floor: profile.Floor || "",
      googleMapLink: profile.GoogleMapLink || "",
      taxNumber: profile.TaxNumber || "",
      registrationNumber: profile.RegistrationNumber || "",
      logoUrl: profile.LogoUrl || "",
      coverImageUrl: profile.CoverImageUrl || "",
      maxAdvanceBookingDays: profile.MaxAdvanceBookingDays || 30,
      allowSameDayBooking: !!profile.AllowSameDayBooking,
      cancellationPolicyHours: profile.CancellationPolicyHours || 24,
      whishPhoneNumber: profile.WhishPhoneNumber || "",
      isWhishPaymentEnabled: profile.IsWhishPaymentEnabled ?? true,
      isCreditCardPaymentEnabled: profile.IsCreditCardPaymentEnabled ?? false,
    });
    setPrevId(profile.Id);
  }

  useEffect(() => {
    dispatch(fetchCompanyProfile());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      // Defer local state update to avoid synchronous cascading renders
      const timer = setTimeout(() => setIsEditing(false), 0);
      
      dispatch(fetchCompanyProfile()); // Re-fetch to sync state after update
      
      const resetTimer = setTimeout(() => {
        dispatch(resetUpdateSuccess());
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
  }, [updateSuccess, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.Name || "",
        slug: profile.Slug || "",
        phone: profile.Phone || "",
        whatsappNumber: profile.WhatsappNumber || "",
        email: profile.Email || "",
        websiteUrl: profile.WebsiteUrl || "",
        city: profile.City || "",
        area: profile.Area || "",
        street: profile.Street || "",
        building: profile.Building || "",
        floor: profile.Floor || "",
        googleMapLink: profile.GoogleMapLink || "",
        taxNumber: profile.TaxNumber || "",
        registrationNumber: profile.RegistrationNumber || "",
        logoUrl: profile.LogoUrl || "",
        coverImageUrl: profile.CoverImageUrl || "",
        maxAdvanceBookingDays: profile.MaxAdvanceBookingDays || 30,
        allowSameDayBooking: !!profile.AllowSameDayBooking,
        cancellationPolicyHours: profile.CancellationPolicyHours || 24,
        whishPhoneNumber: profile.WhishPhoneNumber || "",
        isWhishPaymentEnabled: profile.IsWhishPaymentEnabled ?? true,
        isCreditCardPaymentEnabled: profile.IsCreditCardPaymentEnabled ?? false,
      });
    }
    setIsEditing(false);
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

  const handleUpload = async (file, kind) => {
    if (!file) return;
    try {
      setUploadError(null);
      setUploading(prev => ({ ...prev, [kind]: true }));
      const { url } = await uploadImage(file, "tenant");
      
      const field = kind === "logo" ? "logoUrl" : "coverImageUrl";
      
      setFormData(prev => ({
        ...prev,
        [field]: url
      }));

      // Immediate update for branding images
      dispatch(updateCompanyProfile({ [field]: url }));
    } catch {
      setUploadError("Failed to upload image. Please try again.");
    } finally {
      setUploading(prev => ({ ...prev, [kind]: false }));
    }
  };

  const openPhotoModal = (kind) => {
    setPhotoTarget(kind);
    setIsPhotoModalOpen(true);
  };

  const triggerFilePicker = (kind) => {
    const ref = kind === "cover" ? coverInputRef : logoInputRef;
    if (ref.current) {
      ref.current.click();
    }
  };

  if (loading && !profile) return (
    <div className="flex items-center justify-center min-h-[400px]">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black text-gray-900 tracking-tight">Shop Profile</h1>
           <p className="text-gray-500 font-medium">Manage your business information and policies</p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-white text-blue-600 border-2 border-blue-600 px-6 py-2.5 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="bg-gray-100 text-gray-600 px-6 py-2.5 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r flex items-center shadow-sm">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {updateSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-r flex items-center justify-between shadow-sm animate-fade-in-down">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="font-bold uppercase tracking-tight text-sm">Settings updated successfully!</span>
          </div>
          <button onClick={() => dispatch(resetUpdateSuccess())} className="text-green-500 hover:text-green-700 transition-colors">
            ✕
          </button>
        </div>
      )}

      <div className="space-y-10">
        {/* Helper function for rendering fields */}
        {(() => {
          const renderFormField = ({ label, value, name, type = "text", placeholder }) => {
            if (!isEditing) {
              return (
                <div className="py-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
                  <div className="text-gray-900 font-bold text-lg min-h-[28px] break-words">
                    {type === "checkbox" 
                      ? (value ? <span className="text-emerald-600 flex items-center gap-1">Enabled <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></span> : <span className="text-gray-400 flex items-center gap-1">Disabled</span>) 
                      : (value || <span className="text-gray-300 italic font-medium">Not specified</span>)}
                  </div>
                </div>
              );
            }
            return (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
                {type === "checkbox" ? (
                  <div className="flex items-center h-12 px-4 bg-gray-50 border-2 border-transparent rounded-2xl hover:bg-gray-100 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      name={name}
                      checked={value}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="ml-3 font-semibold text-gray-700">Enable this option</span>
                  </div>
                ) : (
                  <input
                    type={type}
                    name={name}
                    value={value || ""}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-gray-900 placeholder-gray-400 ${name === 'slug' ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}`}
                    placeholder={placeholder}
                    readOnly={name === 'slug'}
                  />
                )}
              </div>
            );
          };

          return (
            <div className="space-y-10">
              {/* Hero Branding Section */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-60 bg-gray-100 group">
                  {formData.coverImageUrl ? (
                    <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-r from-gray-100 to-gray-200">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">No Cover Image</span>
                    </div>
                  )}
                  
                  {/* Floating Action Buttons for Cover */}
                  <div className="absolute top-6 right-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openPhotoModal("cover")}
                      className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-sm font-bold text-gray-700 border-0 shadow-lg hover:bg-white flex items-center gap-2 transition-all active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Change Cover
                    </button>
                    {uploading.cover && (
                      <div className="bg-white/80 backdrop-blur p-2 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      </div>
                    )}
                  </div>

                  {/* Logo Overlay */}
                  <div className="absolute -bottom-12 left-10">
                    <div className="relative group/logo">
                      <button
                        type="button"
                        onClick={() => openPhotoModal("logo")}
                        className="w-32 h-32 rounded-3xl border-4 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.02]"
                        aria-label="Change logo"
                      >
                        {formData.logoUrl ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                             <span className="text-4xl mb-1">🏪</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest">Logo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm">Update Logo</span>
                        </div>
                      </button>
                      
                      {uploading.logo && (
                         <div className="absolute -right-2 top-0 bg-white shadow-md rounded-full p-2 animate-bounce">
                           <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-16 pb-6 px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{formData.name || "Your Company"}</h2>
                    <p className="text-gray-500 font-medium">/{formData.slug}</p>
                  </div>
                  
                  {uploadError && (
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-shake">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Basic Info */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                   <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {renderFormField({ label: "Company Name", name: "name", value: formData.name })}
                  {renderFormField({ label: "URL Slug (Immutable)", name: "slug", value: formData.slug })}
                  {renderFormField({ label: "Tax Number", name: "taxNumber", value: formData.taxNumber })}
                  {renderFormField({ label: "Registration Number", name: "registrationNumber", value: formData.registrationNumber })}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">Contact Details</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {renderFormField({ label: "Phone Number", name: "phone", value: formData.phone, type: "tel" })}
                  {renderFormField({ label: "WhatsApp", name: "whatsappNumber", value: formData.whatsappNumber, type: "tel" })}
                  {renderFormField({ label: "Email Address", name: "email", value: formData.email, type: "email" })}
                  {renderFormField({ label: "Website", name: "websiteUrl", value: formData.websiteUrl, type: "url", placeholder: "https://" })}
                </div>
              </div>

              {/* Location */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                   <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">Location Settings</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8 mb-8">
                  {renderFormField({ label: "City", name: "city", value: formData.city })}
                  {renderFormField({ label: "Area / District", name: "area", value: formData.area })}
                  {renderFormField({ label: "Street Name", name: "street", value: formData.street })}
                  {renderFormField({ label: "Building", name: "building", value: formData.building })}
                  {renderFormField({ label: "Floor / Office", name: "floor", value: formData.floor })}
                </div>
                <div className="pt-4 border-t border-gray-50">
                  {renderFormField({ label: "Google Maps Shared Link", name: "googleMapLink", value: formData.googleMapLink, type: "url" })}
                </div>
              </div>

              {/* Payment Integration */}
              {/* Payment Methods */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                   <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">Payment Methods</h2>
                </div>
                
                <div className="space-y-8">
                  {/* Whish Section */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                           Whish Money
                           <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase tracking-wide">Manual</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-xl">
                          Enable customers to transfer directly to your Whish wallet. You verify the transaction manually.
                        </p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {renderFormField({ 
                          label: "Enable Whish", 
                          name: "isWhishPaymentEnabled", 
                          value: formData.isWhishPaymentEnabled, 
                          type: "checkbox" 
                        })}
                      </div>
                    </div>
                    
                    {/* Show phone input only if enabled OR if in view mode and enabled */}
                    {(formData.isWhishPaymentEnabled || isEditing) && (
                       <div className={`mt-4 pt-4 border-t border-gray-200 transition-all ${!formData.isWhishPaymentEnabled ? 'opacity-50 grayscale' : ''}`}>
                         {renderFormField({ 
                            label: "Whish Phone Number for Receiving Payments", 
                            name: "whishPhoneNumber", 
                            value: formData.whishPhoneNumber,
                            placeholder: "e.g. +961 70 123456",
                            type: "tel"
                          })}
                          {!formData.isWhishPaymentEnabled && isEditing && (
                            <p className="text-xs text-red-500 font-bold mt-2">Currently Disabled - Enable to accept payments</p>
                          )}
                       </div>
                    )}
                  </div>

                  {/* Credit Card Section */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Credit Card
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase tracking-wide">Automatic</span>
                         </h3>
                         <p className="text-sm text-gray-500 mt-1">
                           Accept online payments via Debit/Credit Card (Visa, MasterCard).
                         </p>
                       </div>
                       <div className="flex-shrink-0 ml-4">
                           {renderFormField({ 
                            label: "Enable Credit Card", 
                            name: "isCreditCardPaymentEnabled", 
                            value: formData.isCreditCardPaymentEnabled, 
                            type: "checkbox" 
                          })}
                       </div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Policies */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-gray-900">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50">
                   <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-gray-900">Booking Policies</h2>
                </div>
                <div className="space-y-10">
                  {renderFormField({ label: "Same Day Booking", name: "allowSameDayBooking", value: formData.allowSameDayBooking, type: "checkbox" })}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {renderFormField({ 
                      label: "Maximum Advance Booking Window", 
                      name: "maxAdvanceBookingDays", 
                      value: isEditing ? formData.maxAdvanceBookingDays : `${formData.maxAdvanceBookingDays} Days`, 
                      type: isEditing ? "number" : "text" 
                    })}
                    {renderFormField({ 
                      label: "Minimum Cancellation Notice", 
                      name: "cancellationPolicyHours", 
                      value: isEditing ? formData.cancellationPolicyHours : `${formData.cancellationPolicyHours} Hours before`, 
                      type: isEditing ? "number" : "text" 
                    })}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-4 pb-12">
                   <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-100 text-gray-600 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-12 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
            </div>
          );
        })()}
      </div>

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900">Update Image</h3>
            <p className="text-sm text-gray-500 mt-1">Choose a new image to upload.</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerFilePicker(photoTarget);
                  setIsPhotoModalOpen(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold transition"
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleUpload(e.target.files?.[0], "logo");
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleUpload(e.target.files?.[0], "cover");
          e.target.value = "";
        }}
        className="hidden"
      />

    </div>
  );
}
