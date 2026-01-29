import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyProfile, updateMyProfile, resetProfileStatus } from "../../features/auth/customerProfileSlice";
import { uploadImage } from "../../services/media";
import api from "../../services/api";

export default function CustomerProfile() {
  const dispatch = useDispatch();
  const { profile, loading, updateSuccess, error } = useSelector((state) => state.customerProfile);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    profileImage: "",
    gender: "",
    birthdate: "",
    allowSMS: true,
    allowWhatsApp: true,
    allowEmail: true,
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [prevProfileId, setPrevProfileId] = useState(null);

  if (profile && profile.Id !== prevProfileId) {
    setFormData({
      fullName: profile.FullName || "",
      phoneNumber: profile.PhoneNumber || "",
      profileImage: profile.ProfileImage || "",
      gender: profile.Gender || "",
      birthdate: profile.Birthdate ? profile.Birthdate.split("T")[0] : "",
      allowSMS: profile.AllowSMS ?? true,
      allowWhatsApp: profile.AllowWhatsApp ?? true,
      allowEmail: profile.AllowEmail ?? true,
    });
    setPrevProfileId(profile.Id);
  }

  useEffect(() => {
    dispatch(fetchMyProfile());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      setTimeout(() => dispatch(resetProfileStatus()), 5000);
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
    dispatch(updateMyProfile(formData));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    try {
      setPasswordLoading(true);
      await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to change password. Please check your current password.";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploadError(null);
      setUploading(true);
      const { url } = await uploadImage(file, "customer");
      setFormData(prev => ({ ...prev, profileImage: url }));

      // Immediate update for customer profile photo
      dispatch(updateMyProfile({ profileImage: url }));
    } catch {
      setUploadError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const triggerFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (loading && !profile) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-12 text-white">
          <h1 className="text-3xl font-bold decoration-blue-200 decoration-2">My Profile</h1>
          <p className="text-blue-100 mt-2 opacity-90">Manage your personal information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-shake">
              <p className="text-red-700 text-sm font-medium">
                {typeof error === 'string' ? error : (error?.message || "An error occurred")}
              </p>
            </div>
          )}

          {updateSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl animate-fade-in-down flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <p className="text-green-700 text-sm font-bold uppercase tracking-tight">Profile updated successfully!</p>
              </div>
              <button 
                onClick={() => dispatch(resetProfileStatus())}
                className="text-green-500 hover:text-green-700"
              >
                ✕
              </button>
            </div>
          )}

          {uploadError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-shake">
              <p className="text-red-700 text-sm font-medium">{uploadError}</p>
            </div>
          )}

          {/* Personal Info */}
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Account Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="relative w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center group"
                    aria-label="Change profile photo"
                  >
                    {formData.profileImage ? (
                      <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Change</span>
                    </div>
                  </button>
                  <div className="text-sm text-gray-500">
                    Click the photo to update.
                    {uploading && <p className="text-xs text-blue-600 font-bold mt-1">Uploading...</p>}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleUpload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                  placeholder="+1 234 567 890"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Birthdate</label>
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                />
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
              <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Notification Preferences</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-blue-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-4h2v4zm0-6h-2V7h2v3z"/></svg>
                  </div>
                  <div>
                    <span className="font-bold text-gray-800 block">Allow SMS Notifications</span>
                    <span className="text-xs text-gray-500">Get appointment reminders via text</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="allowSMS"
                  checked={formData.allowSMS}
                  onChange={handleChange}
                  className="w-6 h-6 rounded-lg border-2 border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-blue-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.216 3.075.149.198 2.095 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div>
                    <span className="font-bold text-gray-800 block">Allow WhatsApp Updates</span>
                    <span className="text-xs text-gray-500">Enable real-time chat updates</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="allowWhatsApp"
                  checked={formData.allowWhatsApp}
                  onChange={handleChange}
                  className="w-6 h-6 rounded-lg border-2 border-gray-300 text-emerald-500 focus:ring-emerald-500 transition-all cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-blue-100 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                  <div>
                    <span className="font-bold text-gray-800 block">Allow Email Marketing</span>
                    <span className="text-xs text-gray-500">Subscribe to deals and offers</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="allowEmail"
                  checked={formData.allowEmail}
                  onChange={handleChange}
                  className="w-6 h-6 rounded-lg border-2 border-gray-300 text-red-500 focus:ring-red-500 transition-all cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* Security / Password */}
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-2">
              <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Security</h2>
            </div>
            
            <div className="space-y-6 max-w-lg">
              {passwordSuccess && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
                  <p className="text-green-700 text-sm font-bold">Password changed successfully!</p>
                </div>
              )}
              {passwordError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
                  <p className="text-red-700 text-sm font-medium">{passwordError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePasswordSubmit}
                disabled={passwordLoading || !passwordData.newPassword}
                className="bg-gray-800 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Saving Changes..." : "Save My Profile"}
            </button>
          </div>
        </form>

        {isPhotoModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900">Update Profile Photo</h3>
              <p className="text-sm text-gray-500 mt-1">Choose a new photo to upload.</p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerFilePicker();
                    setIsPhotoModalOpen(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold transition"
                >
                  Upload Photo
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
      </div>
    </div>
  );
}
