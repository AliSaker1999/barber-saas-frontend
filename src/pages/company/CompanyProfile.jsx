import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCompanyProfile, updateCompanyProfile, resetUpdateSuccess } from "../../features/company/companySlice";
import { fetchServices } from "../../features/services/servicesSlice";
import {
  fetchLoyaltyRewards,
  createLoyaltyReward,
  updateLoyaltyReward,
  deleteLoyaltyReward
} from "../../features/loyalty/loyaltySlice";
import { requestUserLocation } from "../../features/location/locationSlice";
import { uploadImage } from "../../services/media";
import Modal from "../../components/Modal";
import OptimizedImage from "../../components/OptimizedImage";
import ShareButton from "../../components/ShareButton";

export default function CompanyProfile() {
  const dispatch = useDispatch();
  const { profile, loading, updateSuccess, error } = useSelector((state) => state.company);
  const services = useSelector((state) => state.services.items);
  const { items: rewards, loading: rewardsLoading, error: rewardsError } = useSelector(
    (state) => state.loyalty.rewards
  );
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
    latitude: "",
    longitude: "",
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
    loyaltyEnabled: false,
    loyaltyAllowRedemption: false,
    depositAmount: "",
    depositRequireAll: false,
    depositRequireAfterNoShows: false,
    depositNoShowThreshold: "",
    depositRequireForNewCustomers: false,
    depositNewCustomerVisitThreshold: "",
  });

  const [newRewardServiceId, setNewRewardServiceId] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState("");
  const [editRewardModalOpen, setEditRewardModalOpen] = useState(false);
  const [editReward, setEditReward] = useState(null);
  const [editRewardServiceId, setEditRewardServiceId] = useState("");
  const [editRewardPoints, setEditRewardPoints] = useState("");
  const [editRewardActive, setEditRewardActive] = useState(true);

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
      latitude: profile.Latitude ?? "",
      longitude: profile.Longitude ?? "",
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
      loyaltyEnabled: profile.LoyaltyEnabled ?? false,
      loyaltyAllowRedemption: profile.LoyaltyAllowRedemption ?? false,
      depositAmount: profile.DepositAmount ?? "",
      depositRequireAll: !!profile.DepositRequireAll,
      depositRequireAfterNoShows: !!profile.DepositRequireAfterNoShows,
      depositNoShowThreshold: profile.DepositNoShowThreshold ?? "",
      depositRequireForNewCustomers: !!profile.DepositRequireForNewCustomers,
      depositNewCustomerVisitThreshold: profile.DepositNewCustomerVisitThreshold ?? "",
    });
    setPrevId(profile.Id);
  }

  useEffect(() => {
    dispatch(fetchCompanyProfile());
    dispatch(fetchServices());
    dispatch(fetchLoyaltyRewards());
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
        latitude: profile.Latitude ?? "",
        longitude: profile.Longitude ?? "",
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
        loyaltyEnabled: profile.LoyaltyEnabled ?? false,
        loyaltyAllowRedemption: profile.LoyaltyAllowRedemption ?? false,
        depositAmount: profile.DepositAmount ?? "",
        depositRequireAll: !!profile.DepositRequireAll,
        depositRequireAfterNoShows: !!profile.DepositRequireAfterNoShows,
        depositNoShowThreshold: profile.DepositNoShowThreshold ?? "",
        depositRequireForNewCustomers: !!profile.DepositRequireForNewCustomers,
        depositNewCustomerVisitThreshold: profile.DepositNewCustomerVisitThreshold ?? "",
      });
    }
    setIsEditing(false);
  };

  const handleUseLocation = async () => {
    try {
      const coords = await dispatch(requestUserLocation()).unwrap();
      setFormData((prev) => ({
        ...prev,
        latitude: coords.latitude.toFixed(6),
        longitude: coords.longitude.toFixed(6)
      }));
    } catch (err) {
      console.error("Failed to get location", err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      maxAdvanceBookingDays: Number(formData.maxAdvanceBookingDays),
      cancellationPolicyHours: Number(formData.cancellationPolicyHours),
      latitude: formData.latitude === "" ? null : Number(formData.latitude),
      longitude: formData.longitude === "" ? null : Number(formData.longitude),
      depositAmount: formData.depositAmount === "" ? null : Number(formData.depositAmount),
      depositNoShowThreshold: formData.depositNoShowThreshold === "" ? null : Number(formData.depositNoShowThreshold),
      depositNewCustomerVisitThreshold: formData.depositNewCustomerVisitThreshold === "" ? null : Number(formData.depositNewCustomerVisitThreshold),
    };
    dispatch(updateCompanyProfile(payload));
  };

  const handleAddReward = async () => {
    if (!newRewardServiceId || !newRewardPoints) {
      return;
    }

    try {
      await dispatch(
        createLoyaltyReward({
          serviceId: newRewardServiceId,
          pointsRequired: Number(newRewardPoints)
        })
      ).unwrap();
      setNewRewardServiceId("");
      setNewRewardPoints("");
    } catch (err) {
      console.error("Failed to add reward", err);
    }
  };

  const openEditReward = (reward) => {
    setEditReward(reward);
    setEditRewardServiceId(reward.ServiceId);
    setEditRewardPoints(String(reward.PointsRequired));
    setEditRewardActive(!!reward.IsActive);
    setEditRewardModalOpen(true);
  };

  const saveRewardEdit = async () => {
    if (!editReward) return;
    try {
      await dispatch(
        updateLoyaltyReward({
          rewardId: editReward.Id,
          serviceId: editRewardServiceId,
          pointsRequired: Number(editRewardPoints),
          isActive: editRewardActive
        })
      ).unwrap();
      setEditRewardModalOpen(false);
      setEditReward(null);
    } catch (err) {
      console.error("Failed to update reward", err);
    }
  };

  const deleteReward = async (rewardId) => {
    try {
      await dispatch(deleteLoyaltyReward(rewardId)).unwrap();
    } catch (err) {
      console.error("Failed to delete reward", err);
    }
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
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent"></div>
    </div>
  );

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-black text-app-text tracking-tight">Shop Profile</h1>
           <p className="text-app-muted font-medium">Manage your business information and policies</p>
        </div>
        
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-app-surface text-app-accent border-2 border-app-accent px-6 py-2.5 rounded-[25px] font-bold hover:bg-app-surface-2 transition-all active:scale-95 shadow-sm"
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
              className="bg-app-surface text-app-muted px-6 py-2.5 rounded-[25px] font-bold hover:bg-app-surface-2 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-app-accent text-white px-8 py-2.5 rounded-[25px] font-bold hover:bg-app-accent-dark transition-all active:scale-95 shadow-lg disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-app-surface-2 text-red-600 p-4 mb-6 rounded-[12px] flex items-center shadow-sm border border-red-200">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {updateSuccess && (
        <div className="bg-app-surface-2 text-app-accent p-4 mb-6 rounded-[12px] flex items-center justify-between shadow-sm animate-fade-in-down border border-app-border">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="font-bold uppercase tracking-tight text-sm">Settings updated successfully!</span>
          </div>
          <button onClick={() => dispatch(resetUpdateSuccess())} className="text-app-accent hover:text-app-accent-dark transition-colors">
            ✕
          </button>
        </div>
      )}

      <div className="space-y-10">
        {/* Helper function for rendering fields */}
        {(() => {
          const renderFormField = ({ label, value, name, type = "text", placeholder, onBlur }) => {
            if (!isEditing) {
              return (
                <div className="py-2">
                  <label className="block text-[10px] font-black text-app-muted uppercase tracking-widest mb-1">{label}</label>
                  <div className="text-app-text font-bold text-lg min-h-[28px] break-words">
                    {type === "checkbox" 
                      ? (value ? <span className="text-app-accent flex items-center gap-1">Enabled <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></span> : <span className="text-app-muted flex items-center gap-1">Disabled</span>) 
                      : (value || <span className="text-app-muted italic font-medium">Not specified</span>)}
                  </div>
                </div>
              );
            }
            return (
              <div>
                <label className="block text-sm font-bold text-app-text mb-2">{label}</label>
                  {type === "checkbox" ? (
                  <div className="flex items-center h-12 px-4 bg-app-surface border border-app-border rounded-[12px] hover:bg-app-surface-2 transition-all cursor-pointer">
                    <input
                      type="checkbox"
                      name={name}
                      checked={value}
                      onChange={handleChange}
                      className="w-5 h-5 text-app-accent rounded-lg focus:ring-app-accent cursor-pointer"
                    />
                    <span className="ml-3 font-semibold text-app-text">Enable this option</span>
                  </div>
                ) : (
                  <input
                    type={type}
                    name={name}
                    value={value || ""}
                    onChange={handleChange}
                    onBlur={onBlur}
                    className={`w-full px-4 py-3 bg-app-surface border border-app-border rounded-[12px] focus:bg-app-surface focus:border-app-accent focus:ring-4 focus:ring-app-accent/10 transition-all font-bold text-app-text placeholder-app-muted ${name === 'slug' ? 'opacity-60 cursor-not-allowed bg-app-surface-2' : ''}`}
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
              <div className="bg-app-surface rounded-[12px] shadow-sm border border-app-border overflow-hidden">
                <div className="relative h-60 bg-app-bg group">
                  {formData.coverImageUrl ? (
                    <OptimizedImage src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-app-muted bg-gradient-to-r from-app-surface to-app-bg">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="font-bold text-app-text">No Cover Image</p>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openPhotoModal("cover")}
                      className="bg-app-surface/90 backdrop-blur px-4 py-2 rounded-[12px] text-sm font-bold text-app-text border-0 shadow-lg hover:bg-app-surface flex items-center gap-2 transition-all active:scale-95"
                    >
                      Change Cover
                    </button>
                    {uploading.cover && (
                      <div className="bg-app-surface/80 backdrop-blur p-2 rounded-[12px]">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-app-accent border-t-transparent"></div>
                      </div>
                    )}
                  </div>

                  <div className="absolute -bottom-12 left-10">
                    <div className="relative group/logo">
                      <button
                        type="button"
                        onClick={() => openPhotoModal("logo")}
                        className="w-32 h-32 rounded-[12px] border-4 border-app-border bg-app-surface shadow-xl overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.02]"
                        aria-label="Change logo"
                      >
                        {formData.logoUrl ? (
                          <OptimizedImage src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-app-bg text-app-muted">
                             <span className="text-4xl mb-1">🏪</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest">Logo</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-app-text text-xs font-bold bg-black/50 px-3 py-1 rounded-full border border-app-border backdrop-blur-sm">Update Logo</span>
                        </div>
                      </button>
                      
                      {uploading.logo && (
                         <div className="absolute -right-2 top-0 bg-app-surface shadow-md rounded-full p-2 animate-bounce">
                           <div className="animate-spin rounded-full h-4 w-4 border-2 border-app-accent border-t-transparent"></div>
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Loyalty Program */}
                  <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border text-app-text">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
                      <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.314 0-6 2.686-6 6 0 2.386 1.388 4.447 3.402 5.429L12 22l2.598-2.571C16.612 18.447 18 16.386 18 14c0-3.314-2.686-6-6-6zm0 0V4m0 0a2 2 0 11-4 0m4 0a2 2 0 104 0" /></svg>
                      </div>
                          <h2 className="text-xl font-bold text-app-text">Loyalty Program</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      {renderFormField({
                        label: "Enable Loyalty Program",
                        name: "loyaltyEnabled",
                        value: formData.loyaltyEnabled,
                        type: "checkbox"
                      })}
                      {renderFormField({
                        label: "Allow Loyalty Redemption",
                        name: "loyaltyAllowRedemption",
                        value: formData.loyaltyAllowRedemption,
                        type: "checkbox"
                      })}
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg font-bold text-app-text mb-2">Redeem Rewards</h3>
                      <p className="text-sm text-app-muted mb-4">
                        Configure which services can be redeemed with loyalty points.
                      </p>

                      {rewardsError && (
                        <div className="mb-4 p-3 bg-app-surface-2 border border-app-border rounded-[12px] text-sm text-red-600 font-semibold">
                          {rewardsError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-app-text mb-2">Service</label>
                          <select
                            value={newRewardServiceId}
                            onChange={(e) => setNewRewardServiceId(e.target.value)}
                            className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-[12px] focus:bg-app-surface focus:border-app-accent font-bold text-app-text"
                          >
                            <option value="">Select a service</option>
                            {services.map(service => (
                              <option key={service.Id} value={service.Id}>{service.Name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-app-text mb-2">Points Required</label>
                          <input
                            type="number"
                            min="1"
                            value={newRewardPoints}
                            onChange={(e) => setNewRewardPoints(e.target.value)}
                              className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-[12px] focus:bg-app-surface focus:border-app-accent font-bold text-app-text"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddReward}
                        disabled={rewardsLoading}
                        className="bg-app-accent hover:bg-app-accent-dark text-white font-bold px-6 py-3 rounded-[25px] disabled:opacity-50"
                      >
                        {rewardsLoading ? "Saving..." : "Add Reward"}
                      </button>

                      <div className="mt-6 space-y-3">
                        {rewardsLoading && rewards.length === 0 && (
                          <div className="bg-app-surface p-4 rounded-[12px] text-app-muted font-semibold">Loading rewards...</div>
                        )}
                        {!rewardsLoading && rewards.length === 0 && (
                          <div className="bg-app-surface p-4 rounded-[12px] text-app-muted font-semibold">No rewards configured yet.</div>
                        )}
                        {rewards.map(reward => (
                          <div key={reward.Id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-app-surface border border-app-border rounded-[12px] p-4">
                            <div>
                              <p className="font-bold text-app-text">{reward.ServiceName}</p>
                              <p className="text-xs text-app-muted">{reward.PointsRequired} points</p>
                              <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${reward.IsActive ? "bg-app-accent/10 text-app-accent" : "bg-app-surface-2 text-app-muted"}`}>
                                {reward.IsActive ? "ACTIVE" : "INACTIVE"}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditReward(reward)}
                                className="px-4 py-2 rounded-[12px] bg-app-surface-2 text-app-text font-bold hover:bg-app-surface"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteReward(reward.Id)}
                                className="px-4 py-2 rounded-[12px] bg-app-surface-2 text-app-text font-bold hover:bg-app-surface"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                <div className="pt-16 pb-6 px-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-app-text tracking-tight">{formData.name || "Your Company"}</h2>
                    <p className="text-app-muted font-medium">/{formData.slug}</p>
                    {formData.slug && (
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-app-muted truncate max-w-[220px]">
                          {`${window.location.origin}/book/${formData.slug}`}
                        </p>
                        <ShareButton
                          title={`Book at ${formData.name || "our shop"}`}
                          text={`Book an appointment at ${formData.name || "our shop"} — no account needed:`}
                          url={`${window.location.origin}/book/${formData.slug}`}
                        />
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="bg-app-surface-2 text-red-600 px-4 py-2 rounded-[12px] text-sm font-bold flex items-center gap-2 animate-shake border border-red-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Basic Info */}
              <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border">
                 <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
                   <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-app-text">Basic Information</h2>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {renderFormField({ label: "Company Name", name: "name", value: formData.name })}
                  {renderFormField({ label: "URL Slug (Immutable)", name: "slug", value: formData.slug })}
                  {renderFormField({ label: "Tax Number", name: "taxNumber", value: formData.taxNumber })}
                  {renderFormField({ label: "Registration Number", name: "registrationNumber", value: formData.registrationNumber })}
                </div>
              </div>

              {/* Contact */}
                <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border">
                 <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
                   <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-app-text">Contact Details</h2>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {renderFormField({ label: "Phone Number", name: "phone", value: formData.phone, type: "tel" })}
                  {renderFormField({ label: "WhatsApp", name: "whatsappNumber", value: formData.whatsappNumber, type: "tel" })}
                  {renderFormField({ label: "Email Address", name: "email", value: formData.email, type: "email" })}
                  {renderFormField({ label: "Website", name: "websiteUrl", value: formData.websiteUrl, type: "url", placeholder: "https://" })}
                </div>
              </div>

              {/* Location */}
                <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border">
                 <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
                   <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-app-text">Location Settings</h2>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-8 mb-8">
                  {renderFormField({ label: "City", name: "city", value: formData.city })}
                  {renderFormField({ label: "Area / District", name: "area", value: formData.area })}
                  {renderFormField({ label: "Street Name", name: "street", value: formData.street })}
                  {renderFormField({ label: "Building", name: "building", value: formData.building })}
                  {renderFormField({ label: "Floor / Office", name: "floor", value: formData.floor })}
                </div>
                <div className="pt-4 border-t border-app-border">
                  {renderFormField({
                    label: "Google Maps Shared Link",
                    name: "googleMapLink",
                    value: formData.googleMapLink,
                    type: "url"
                  })}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFormField({ label: "Latitude", name: "latitude", value: formData.latitude, type: "number", placeholder: "e.g. 33.893791" })}
                    {renderFormField({ label: "Longitude", name: "longitude", value: formData.longitude, type: "number", placeholder: "e.g. 35.501776" })}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[25px] bg-app-surface-2 text-app-text font-bold text-sm hover:bg-app-surface transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm7.5-2.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
                      </svg>
                      Use Current Location
                    </button>
                    <span className="text-xs text-app-muted">Used to help customers find you nearby.</span>
                  </div>
                </div>
              </div>

              {/* Payment Integration */}
              {/* Payment Methods */}
                <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border">
                 <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
                   <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-app-text">Payment Methods</h2>
                 </div>
                
                <div className="space-y-8">
                  {/* Whish Section */}
                  <div className="bg-app-surface p-6 rounded-[12px] border border-app-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
                           Whish Money
                           <span className="text-xs font-bold px-2 py-0.5 rounded bg-app-surface-2 text-app-text uppercase tracking-wide">Manual</span>
                        </h3>
                        <p className="text-sm text-app-muted mt-1 max-w-xl">
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
                       <div className={`mt-4 pt-4 border-t border-app-border transition-all ${!formData.isWhishPaymentEnabled ? 'opacity-50 grayscale' : ''}`}>
                         {renderFormField({ 
                            label: "Whish Phone Number for Receiving Payments", 
                            name: "whishPhoneNumber", 
                            value: formData.whishPhoneNumber,
                            placeholder: "e.g. +961 70 123456",
                            type: "tel"
                          })}
                          {!formData.isWhishPaymentEnabled && isEditing && (
                            <p className="text-xs text-red-600 font-bold mt-2">Currently Disabled - Enable to accept payments</p>
                          )}
                       </div>
                    )}
                  </div>

                  {/* Credit Card Section */}
                  <div className="bg-app-surface p-6 rounded-[12px] border border-app-border">
                     <div className="flex items-center justify-between">
                       <div>
                         <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
                            Credit Card
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-app-surface-2 text-app-text uppercase tracking-wide">Automatic</span>
                         </h3>
                         <p className="text-sm text-app-muted mt-1">
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

                  {/* Deposits Section */}
                  <div className="bg-app-surface p-6 rounded-[12px] border border-app-border">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-app-text flex items-center gap-2">
                        Booking Deposits
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-app-surface-2 text-app-text uppercase tracking-wide">Stripe</span>
                      </h3>
                      <p className="text-sm text-app-muted mt-1 max-w-xl">
                        Require customers to pay a deposit online before their booking is confirmed. Connect Stripe under Settings → Billing, then choose when a deposit is required below — any rule that matches will trigger it.
                      </p>
                    </div>

                    <div className="max-w-xs mb-6">
                      {renderFormField({
                        label: "Deposit Amount ($)",
                        name: "depositAmount",
                        value: formData.depositAmount,
                        type: "number",
                        placeholder: "e.g. 10"
                      })}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4 p-4 bg-app-bg rounded-[12px]">
                        <div>
                          <p className="font-bold text-app-text text-sm">Require for all bookings</p>
                          <p className="text-xs text-app-muted">Every appointment or queue join needs the deposit paid first.</p>
                        </div>
                        <div className="flex-shrink-0">
                          {renderFormField({ label: "Enable", name: "depositRequireAll", value: formData.depositRequireAll, type: "checkbox" })}
                        </div>
                      </div>

                      <div className="p-4 bg-app-bg rounded-[12px]">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-app-text text-sm">Require after repeated no-shows</p>
                            <p className="text-xs text-app-muted">Once a customer's no-show count reaches this number.</p>
                          </div>
                          <div className="flex-shrink-0">
                            {renderFormField({ label: "Enable", name: "depositRequireAfterNoShows", value: formData.depositRequireAfterNoShows, type: "checkbox" })}
                          </div>
                        </div>
                        {(formData.depositRequireAfterNoShows || isEditing) && (
                          <div className="mt-3 max-w-xs">
                            {renderFormField({
                              label: "No-show count threshold",
                              name: "depositNoShowThreshold",
                              value: formData.depositNoShowThreshold,
                              type: "number",
                              placeholder: "e.g. 3"
                            })}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-app-bg rounded-[12px]">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-bold text-app-text text-sm">Require for new customers</p>
                            <p className="text-xs text-app-muted">For customers with fewer than this many completed visits at your shop.</p>
                          </div>
                          <div className="flex-shrink-0">
                            {renderFormField({ label: "Enable", name: "depositRequireForNewCustomers", value: formData.depositRequireForNewCustomers, type: "checkbox" })}
                          </div>
                        </div>
                        {(formData.depositRequireForNewCustomers || isEditing) && (
                          <div className="mt-3 max-w-xs">
                            {renderFormField({
                              label: "Prior-visit threshold",
                              name: "depositNewCustomerVisitThreshold",
                              value: formData.depositNewCustomerVisitThreshold,
                              type: "number",
                              placeholder: "e.g. 1"
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policies */}
                <div className="bg-app-surface p-8 rounded-[12px] shadow-sm border border-app-border text-app-text">
                <div className="flex items-center gap-3 mb-8 pb-4 border-b border-app-border">
                   <div className="w-10 h-10 bg-app-surface-2 rounded-[12px] flex items-center justify-center text-app-text">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                   </div>
                   <h2 className="text-xl font-bold text-app-text">Booking Policies</h2>
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
                    className="bg-app-surface-2 text-app-text px-8 py-3 rounded-[25px] font-bold hover:bg-app-surface transition-all active:scale-95"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-app-accent text-white px-12 py-3 rounded-[25px] font-bold hover:bg-app-accent-dark transition-all active:scale-95 shadow-lg disabled:opacity-50"
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
          <div className="bg-app-surface rounded-[12px] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-app-text">Update Image</h3>
            <p className="text-sm text-app-muted mt-1">Choose a new image to upload.</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerFilePicker(photoTarget);
                  setIsPhotoModalOpen(false);
                }}
                className="flex-1 bg-app-accent hover:bg-app-accent-dark text-white py-2 rounded-[12px] font-bold transition"
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="flex-1 bg-app-surface-2 hover:bg-app-surface text-app-text py-2 rounded-[12px] font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={editRewardModalOpen}
        onClose={() => setEditRewardModalOpen(false)}
        title="Edit Loyalty Reward"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-app-text mb-2">Service</label>
            <select
              value={editRewardServiceId}
              onChange={(e) => setEditRewardServiceId(e.target.value)}
              className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-[12px] focus:bg-app-surface focus:border-app-accent font-bold text-app-text"
            >
              <option value="">Select a service</option>
              {services.map(service => (
                <option key={service.Id} value={service.Id}>{service.Name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-app-text mb-2">Points Required</label>
            <input
              type="number"
              min="1"
              value={editRewardPoints}
              onChange={(e) => setEditRewardPoints(e.target.value)}
              className="w-full px-4 py-3 bg-app-surface border border-app-border rounded-[12px] focus:bg-app-surface focus:border-app-accent font-bold text-app-text"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={editRewardActive}
              onChange={(e) => setEditRewardActive(e.target.checked)}
              className="w-5 h-5 text-app-accent rounded-lg"
            />
            <span className="font-semibold text-app-text">Active</span>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setEditRewardModalOpen(false)}
              className="flex-1 py-3 rounded-[12px] border border-app-border text-sm font-bold text-app-text hover:bg-app-surface-2 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveRewardEdit}
              className="flex-1 py-3 rounded-[12px] bg-app-accent hover:bg-app-accent-dark text-sm font-bold text-white transition shadow-lg"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

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
