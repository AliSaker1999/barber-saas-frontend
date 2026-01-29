import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBarberProfile, updateBarberProfile, toggleAvailability } from '../../features/barbers/barbersSlice';
import { uploadImage } from "../../services/media";

export default function BarberMyProfile() {
  const dispatch = useDispatch();
  const { selectedProfile, loading } = useSelector(state => state.barbers);
  const [formData, setFormData] = useState({
    displayName: '',
    gender: '',
    bio: '',
    yearsOfExperience: '',
    profileImage: '',
    coverImage: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [prevProfile, setPrevProfile] = useState(null);
  const [uploading, setUploading] = useState({ profile: false, cover: false });
  const [uploadError, setUploadError] = useState(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState("profile");
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    dispatch(fetchBarberProfile('me'));
  }, [dispatch]);

  // Sync profile data to form state during render to avoid cascading renders from useEffect
  if (selectedProfile && selectedProfile !== prevProfile) {
    setPrevProfile(selectedProfile);
    setFormData({
      displayName: selectedProfile.DisplayName || selectedProfile.FullName || '',
      gender: selectedProfile.Gender || '',
      bio: selectedProfile.Bio || '',
      yearsOfExperience: selectedProfile.YearsOfExperience || '',
      profileImage: selectedProfile.ProfileImage || '',
      coverImage: selectedProfile.CoverImage || ''
    });
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = async (file, kind) => {
    if (!file) return;
    try {
      setUploadError(null);
      setUploading(prev => ({ ...prev, [kind]: true }));
      const { url } = await uploadImage(file, "barber");
      
      const field = kind === "profile" ? "profileImage" : "coverImage";
      setFormData(prev => ({
        ...prev,
        [field]: url
      }));

      // Immediate update for barber images
      dispatch(updateBarberProfile({ 
        barberId: 'me', 
        data: { [field]: url } 
      }));
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
    const ref = kind === "cover" ? coverInputRef : profileInputRef;
    if (ref.current) {
      ref.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    try {
      await dispatch(updateBarberProfile({ 
        barberId: 'me', 
        data: {
          ...formData,
          yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null
        } 
      })).unwrap();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = typeof err === 'string' ? err : (err?.message || "Failed to update profile");
      setError(message);
    }
  };

  if (loading && !selectedProfile) return <div className="p-8 text-center">Loading your profile...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Barber Profile</h1>
        <p className="text-gray-600">This information will be visible to customers when they book with you.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover Image Placeholder */}
        <div className="h-48 bg-gray-100 relative group">
          {formData.coverImage ? (
            <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-r from-gray-100 to-gray-200">
               No Cover Image
            </div>
          )}
          <div className="absolute top-4 right-4">
             <button
               type="button"
               onClick={() => openPhotoModal("cover")}
               className="bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-xs border-0 shadow-sm hover:bg-white"
             >
               Change Cover
             </button>
             {uploading.cover && <p className="text-[10px] text-blue-600 font-bold mt-1">Uploading...</p>}
          </div>
          
          {/* Profile Image */}
          <button
            type="button"
            onClick={() => openPhotoModal("profile")}
            className="absolute -bottom-12 left-8 w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden group"
            aria-label="Change profile photo"
          >
             {formData.profileImage ? (
               <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-3xl bg-gray-50">👤</div>
             )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Change</span>
            </div>
          </button>
          <div className="absolute -bottom-16 left-36">
            {uploading.profile && <p className="text-[10px] text-blue-600 font-bold mt-1">Uploading...</p>}
          </div>
        </div>

        <div className="pt-16 p-8 space-y-6">
          {success && (
            <div className="bg-green-50 text-green-700 p-4 font-bold rounded-xl flex items-center justify-center animate-bounce">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 p-4 font-bold rounded-xl flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Failed to update profile: {error}
            </div>
          )}

          {uploadError && (
            <div className="bg-red-50 text-red-700 p-4 font-bold rounded-xl flex items-center justify-center animate-pulse">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {uploadError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Availability Settings */}
            <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-xl p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-4">Availability Settings</h3>
               <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm w-full">
                      <div>
                          <p className="font-bold text-gray-900">Queue Walk-Ins</p>
                          <p className="text-xs text-gray-500">Allow customers to join your queue now</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={selectedProfile?.IsAvailable ?? false}
                          onChange={(e) => selectedProfile?.Id && dispatch(toggleAvailability({ barberId: selectedProfile.Id, isAvailable: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>

                  <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm w-full">
                      <div>
                          <p className="font-bold text-gray-900">Online Booking</p>
                          <p className="text-xs text-gray-500">Accept future appointment requests</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={selectedProfile?.IsAcceptingAppointments ?? false}
                          onChange={(e) => selectedProfile?.Id && dispatch(toggleAvailability({ barberId: selectedProfile.Id, isAcceptingAppointments: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      </label>
                  </div>

                  <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm w-full">
                      <div>
                          <p className="font-bold text-gray-900">Auto-Accept</p>
                          <p className="text-xs text-gray-500">Skip the "Pending" review phase</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={selectedProfile?.AutoAcceptAppointments ?? true}
                          onChange={(e) => selectedProfile?.Id && dispatch(toggleAvailability({ barberId: selectedProfile.Id, autoAcceptAppointments: e.target.checked }))}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="How customers see your name"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender / Specialty</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                placeholder="e.g. 5"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              placeholder="Tell customers about your style and experience..."
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            {success && (
              <span className="text-green-600 font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Profile updated successfully!
              </span>
            )}
            <div className="flex-1"></div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900">Update Photo</h3>
            <p className="text-sm text-gray-500 mt-1">Choose a new photo to upload.</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerFilePicker(photoTarget);
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

      <input
        ref={profileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          handleUpload(e.target.files?.[0], "profile");
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

      {/* Stats Preview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-gray-500 text-sm font-medium">Rating</p>
            <p className="text-3xl font-bold mt-1 text-yellow-500">★ {selectedProfile?.AverageRating || "N/A"}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-gray-500 text-sm font-medium">Reviews</p>
            <p className="text-3xl font-bold mt-1 text-gray-900">{selectedProfile?.ReviewsCount || 0}</p>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
            <p className="text-gray-500 text-sm font-medium">No-Shows</p>
            <p className="text-3xl font-bold mt-1 text-red-500">{selectedProfile?.NoShowCount || 0}</p>
         </div>
      </div>
    </div>
  );
}
