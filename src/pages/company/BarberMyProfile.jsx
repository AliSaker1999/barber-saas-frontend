import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBarberProfile, updateBarberProfile, toggleAvailability, fetchBarbers } from '../../features/barbers/barbersSlice';
import {
  fetchMyScheduleRequests,
  requestTimeOff,
  requestSwap,
  respondToSwap,
  cancelScheduleRequest
} from '../../features/scheduleRequests/scheduleRequestsSlice';
import { uploadImage } from "../../services/media";
import LoadingState from "../../components/LoadingState";
import ErrorState from "../../components/ErrorState";
import OptimizedImage from "../../components/OptimizedImage";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";
import { formatDateOnly } from "../../utils/time";

const STATUS_LABELS = {
  PENDING: "Awaiting shop approval",
  PENDING_PARTNER: "Awaiting colleague's response",
  PENDING_ADMIN: "Awaiting shop approval",
  APPROVED: "Approved",
  DECLINED: "Declined",
  CANCELLED: "Cancelled"
};

const STATUS_COLORS = {
  PENDING: "bg-amber-100 text-amber-700",
  PENDING_PARTNER: "bg-amber-100 text-amber-700",
  PENDING_ADMIN: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600"
};

export default function BarberMyProfile() {
  const dispatch = useDispatch();
  const { selectedProfile, loading, items: allBarbers } = useSelector(state => state.barbers);
  const { mine: myRequests, mineLoading: requestsLoading, actionLoading: scheduleActionLoading, actionError: scheduleActionError } = useSelector(state => state.scheduleRequests);

  const [timeOffForm, setTimeOffForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [swapForm, setSwapForm] = useState({ startDate: "", endDate: "", reason: "", partnerBarberId: "", partnerStartDate: "", partnerEndDate: "" });
  const [scheduleSuccess, setScheduleSuccess] = useState("");
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
    dispatch(fetchBarbers());
    dispatch(fetchMyScheduleRequests());
  }, [dispatch]);

  const handleRequestTimeOff = async (e) => {
    e.preventDefault();
    setScheduleSuccess("");
    try {
      await dispatch(requestTimeOff(timeOffForm)).unwrap();
      setTimeOffForm({ startDate: "", endDate: "", reason: "" });
      setScheduleSuccess("Time-off request submitted.");
      dispatch(fetchMyScheduleRequests());
    } catch {
      // actionError in the slice already surfaces this
    }
  };

  const handleRequestSwap = async (e) => {
    e.preventDefault();
    setScheduleSuccess("");
    try {
      await dispatch(requestSwap(swapForm)).unwrap();
      setSwapForm({ startDate: "", endDate: "", reason: "", partnerBarberId: "", partnerStartDate: "", partnerEndDate: "" });
      setScheduleSuccess("Swap proposal sent.");
      dispatch(fetchMyScheduleRequests());
    } catch {
      // actionError in the slice already surfaces this
    }
  };

  const handleRespondToSwap = async (id, accept) => {
    await dispatch(respondToSwap({ id, accept }));
    dispatch(fetchMyScheduleRequests());
  };

  const handleCancelRequest = async (id) => {
    await dispatch(cancelScheduleRequest(id));
  };

  const otherBarbers = (allBarbers || []).filter(b => b.Id !== selectedProfile?.Id);
  const incomingSwaps = myRequests.filter(r => r.RequestType === "SWAP" && r.PartnerBarberId === selectedProfile?.Id && r.Status === "PENDING_PARTNER");
  const myOwnRequests = myRequests.filter(r => r.RequestingBarberId === selectedProfile?.Id);

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
      const message = getFriendlyErrorMessage(err, "Unable to update profile right now.");
      setError(message);
    }
  };

  if (loading && !selectedProfile) return <LoadingState label="Loading your profile..." blocks={2} />;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-app-text">My Barber Profile</h1>
        <p className="text-app-muted">This information will be visible to customers when they book with you.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-app-surface rounded-[12px] shadow-sm border border-app-border overflow-hidden">
        {/* Cover Image Placeholder */}
        <div className="h-48 bg-app-bg relative group">
          {formData.coverImage ? (
            <OptimizedImage src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-app-muted bg-gradient-to-r from-app-surface to-app-bg">
               No Cover Image
            </div>
          )}
          <div className="absolute top-4 right-4">
             <button
               type="button"
               onClick={() => openPhotoModal("cover")}
               className="bg-app-surface/90 backdrop-blur px-3 py-1 rounded-[12px] text-xs border-0 shadow-sm hover:bg-app-surface"
             >
               Change Cover
             </button>
             {uploading.cover && <p className="text-[10px] text-app-accent font-bold mt-1">Uploading...</p>}
          </div>
          
          {/* Profile Image */}
          <button
            type="button"
            onClick={() => openPhotoModal("profile")}
            className="absolute -bottom-12 left-8 w-24 h-24 rounded-full border-4 border-app-border bg-app-surface shadow-md overflow-hidden group"
            aria-label="Change profile photo"
          >
             {formData.profileImage ? (
               <OptimizedImage src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-3xl bg-app-bg">👤</div>
             )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-app-text text-xs font-bold">Change</span>
            </div>
          </button>
          <div className="absolute -bottom-16 left-36">
            {uploading.profile && <p className="text-[10px] text-app-accent font-bold mt-1">Uploading...</p>}
          </div>
        </div>

        <div className="pt-16 p-8 space-y-6">
          {success && (
            <div className="bg-green-50 text-green-700 p-4 font-bold rounded-[12px] flex items-center justify-center animate-bounce">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Profile updated successfully!
            </div>
          )}

          {error && <ErrorState message={error} onRetry={() => setError(null)} retryLabel="Dismiss" />}

          {uploadError && <ErrorState message={uploadError} onRetry={() => setUploadError(null)} retryLabel="Dismiss" />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Availability Settings */}
            <div className="md:col-span-2 bg-app-surface border border-app-border rounded-[12px] p-6">
               <h3 className="text-lg font-bold text-app-text mb-4">Availability Settings</h3>
               <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex items-center justify-between bg-surface-sunken border border-line-subtle p-4 rounded-[12px] w-full">
                      <div>
                          <p className="font-bold text-content-primary">Queue Walk-Ins</p>
                          <p className="text-xs text-content-muted">Allow customers to join your queue now</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={selectedProfile?.IsAvailable ?? false}
                          onChange={(e) => selectedProfile?.Id && dispatch(toggleAvailability({ barberId: selectedProfile.Id, isAvailable: e.target.checked }))}
                        />
                        <div className="w-11 h-6 shrink-0 rounded-full bg-line-strong transition-colors peer peer-checked:bg-brand-gold peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-sunken after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:border after:border-line-strong after:shadow-sm after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                      </label>
                  </div>

                  <div className="flex items-center justify-between bg-surface-sunken border border-line-subtle p-4 rounded-[12px] w-full">
                      <div>
                          <p className="font-bold text-content-primary">Online Booking</p>
                          <p className="text-xs text-content-muted">Accept future appointment requests</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={selectedProfile?.IsAcceptingAppointments ?? false}
                          onChange={(e) => selectedProfile?.Id && dispatch(toggleAvailability({ barberId: selectedProfile.Id, isAcceptingAppointments: e.target.checked }))}
                        />
                        <div className="w-11 h-6 shrink-0 rounded-full bg-line-strong transition-colors peer peer-checked:bg-brand-gold peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-sunken after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:border after:border-line-strong after:shadow-sm after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                      </label>
                  </div>

                  <div className="flex items-center justify-between bg-surface-sunken border border-line-subtle p-4 rounded-[12px] w-full">
                      <div>
                          <p className="font-bold text-content-primary">Auto-Accept</p>
                          <p className="text-xs text-content-muted">Skip the "Pending" review phase</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={selectedProfile?.AutoAcceptAppointments ?? true}
                          onChange={(e) => selectedProfile?.Id && dispatch(toggleAvailability({ barberId: selectedProfile.Id, autoAcceptAppointments: e.target.checked }))}
                        />
                        <div className="w-11 h-6 shrink-0 rounded-full bg-line-strong transition-colors peer peer-checked:bg-brand-gold peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-sunken after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:border after:border-line-strong after:shadow-sm after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                      </label>
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Display Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="How customers see your name"
                className="w-full border border-app-border bg-app-surface rounded-[12px] px-4 py-2 focus:ring-2 focus:ring-app-accent outline-none text-app-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Gender / Specialty</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full border border-app-border bg-app-surface rounded-[12px] px-4 py-2 focus:ring-2 focus:ring-app-accent outline-none text-app-text"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unisex">Unisex</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-text mb-1">Years of Experience</label>
              <input
                type="number"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                placeholder="e.g. 5"
                className="w-full border border-app-border bg-app-surface rounded-[12px] px-4 py-2 focus:ring-2 focus:ring-app-accent outline-none text-app-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              placeholder="Tell customers about your style and experience..."
              className="w-full border border-app-border bg-app-surface rounded-[12px] px-4 py-2 focus:ring-2 focus:ring-app-accent outline-none text-app-text"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-app-border">
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
              className="bg-app-accent text-white px-8 py-2 rounded-[25px] font-bold hover:bg-app-accent-dark transition-colors shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>

      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-app-surface rounded-[12px] shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-app-text">Update Photo</h3>
            <p className="text-sm text-app-muted mt-1">Choose a new photo to upload.</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerFilePicker(photoTarget);
                  setIsPhotoModalOpen(false);
                }}
                className="flex-1 bg-app-accent hover:bg-app-accent-dark text-white py-2 rounded-[25px] font-bold transition"
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="flex-1 bg-app-surface hover:bg-app-surface-2 text-app-text py-2 rounded-[25px] font-bold transition"
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
        <div className="bg-app-surface p-6 rounded-[12px] border border-app-border shadow-sm text-center">
          <p className="text-app-muted text-sm font-medium">Rating</p>
          <p className="text-3xl font-bold mt-1 text-app-accent">★ {selectedProfile?.AverageRating || "N/A"}</p>
        </div>
        <div className="bg-app-surface p-6 rounded-[12px] border border-app-border shadow-sm text-center">
          <p className="text-app-muted text-sm font-medium">Reviews</p>
          <p className="text-3xl font-bold mt-1 text-app-text">{selectedProfile?.ReviewsCount || 0}</p>
        </div>
        <div className="bg-app-surface p-6 rounded-[12px] border border-app-border shadow-sm text-center">
          <p className="text-app-muted text-sm font-medium">No-Shows</p>
          <p className="text-3xl font-bold mt-1 text-red-500">{selectedProfile?.NoShowCount || 0}</p>
        </div>
      </div>

      {/* Time Off & Swaps */}
      <div className="mt-8 bg-app-surface rounded-[12px] border border-app-border p-6 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-app-text">Time Off &amp; Swaps</h2>
          <p className="text-sm text-app-muted">Request a day off, or propose trading shifts with a colleague. Both need shop approval.</p>
        </div>

        {scheduleSuccess && (
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-[12px] text-sm font-bold">{scheduleSuccess}</div>
        )}
        {scheduleActionError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-[12px] text-sm font-bold">{scheduleActionError}</div>
        )}

        {incomingSwaps.length > 0 && (
          <div>
            <h3 className="text-sm font-black text-app-text uppercase tracking-widest mb-3">Incoming Swap Requests</h3>
            <div className="space-y-2">
              {incomingSwaps.map(r => (
                <div key={r.Id} className="bg-app-surface-2 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-app-text">{r.RequestingBarberName}</p>
                    <p className="text-xs text-app-muted">
                      They'll cover {formatDateOnly(r.PartnerStartDate)}–{formatDateOnly(r.PartnerEndDate)} for you, if you cover {formatDateOnly(r.StartDate)}–{formatDateOnly(r.EndDate)} for them.
                    </p>
                    {r.Reason && <p className="text-xs text-app-muted mt-0.5">"{r.Reason}"</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleRespondToSwap(r.Id, true)} className="px-4 py-2 rounded-xl bg-app-accent text-white font-bold text-sm">Accept</button>
                    <button onClick={() => handleRespondToSwap(r.Id, false)} className="px-4 py-2 rounded-xl bg-app-surface text-app-muted font-bold text-sm border border-app-border">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleRequestTimeOff} className="bg-app-surface-2 rounded-[12px] p-5 space-y-3">
            <h3 className="text-sm font-black text-app-text uppercase tracking-widest">Request Time Off</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-app-muted mb-1">Start date</label>
                <input type="date" required value={timeOffForm.startDate}
                  onChange={e => setTimeOffForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-app-muted mb-1">End date</label>
                <input type="date" required value={timeOffForm.endDate}
                  onChange={e => setTimeOffForm(f => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-app-muted mb-1">Reason (optional)</label>
              <input type="text" value={timeOffForm.reason}
                onChange={e => setTimeOffForm(f => ({ ...f, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
            </div>
            <button type="submit" disabled={scheduleActionLoading} className="w-full bg-app-accent text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
              {scheduleActionLoading ? "Submitting..." : "Submit Request"}
            </button>
          </form>

          <form onSubmit={handleRequestSwap} className="bg-app-surface-2 rounded-[12px] p-5 space-y-3">
            <h3 className="text-sm font-black text-app-text uppercase tracking-widest">Propose a Swap</h3>
            <div>
              <label className="block text-xs font-bold text-app-muted mb-1">Swap with</label>
              <select required value={swapForm.partnerBarberId}
                onChange={e => setSwapForm(f => ({ ...f, partnerBarberId: e.target.value }))}
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm">
                <option value="">Select a colleague...</option>
                {otherBarbers.map(b => <option key={b.Id} value={b.Id}>{b.FullName}</option>)}
              </select>
            </div>
            <p className="text-xs text-app-muted">You give up:</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" required value={swapForm.startDate}
                onChange={e => setSwapForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
              <input type="date" required value={swapForm.endDate}
                onChange={e => setSwapForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
            </div>
            <p className="text-xs text-app-muted">In exchange, you'll cover:</p>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" required value={swapForm.partnerStartDate}
                onChange={e => setSwapForm(f => ({ ...f, partnerStartDate: e.target.value }))}
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
              <input type="date" required value={swapForm.partnerEndDate}
                onChange={e => setSwapForm(f => ({ ...f, partnerEndDate: e.target.value }))}
                className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
            </div>
            <input type="text" placeholder="Reason (optional)" value={swapForm.reason}
              onChange={e => setSwapForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full px-3 py-2 border border-app-border rounded-lg bg-app-surface text-app-text text-sm" />
            <button type="submit" disabled={scheduleActionLoading} className="w-full bg-app-accent text-white font-bold py-2.5 rounded-xl disabled:opacity-60">
              {scheduleActionLoading ? "Submitting..." : "Propose Swap"}
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-sm font-black text-app-text uppercase tracking-widest mb-3">My Requests</h3>
          {requestsLoading && <LoadingState label="Loading requests..." blocks={2} />}
          {!requestsLoading && myOwnRequests.length === 0 && (
            <p className="text-sm text-app-muted">No requests yet.</p>
          )}
          <div className="space-y-2">
            {myOwnRequests.map(r => (
              <div key={r.Id} className="bg-app-surface-2 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-app-text">
                      {r.RequestType === "SWAP" ? `Swap with ${r.PartnerBarberName}` : "Time Off"}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[r.Status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[r.Status] || r.Status}
                    </span>
                  </div>
                  <p className="text-xs text-app-muted">
                    {formatDateOnly(r.StartDate)}–{formatDateOnly(r.EndDate)}
                    {r.RequestType === "SWAP" && ` (in exchange for ${formatDateOnly(r.PartnerStartDate)}–${formatDateOnly(r.PartnerEndDate)})`}
                  </p>
                  {r.DeclineReason && <p className="text-xs text-red-600 mt-0.5">Declined: {r.DeclineReason}</p>}
                </div>
                {["PENDING", "PENDING_PARTNER", "PENDING_ADMIN"].includes(r.Status) && (
                  <button onClick={() => handleCancelRequest(r.Id)} className="flex-shrink-0 text-xs font-bold text-app-muted hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
