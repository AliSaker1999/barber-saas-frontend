import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBarberProfile } from '../features/barbers/barbersSlice';
import Modal from './Modal';
import OptimizedImage from './OptimizedImage';
import BarberGallery from './BarberGallery';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';

export default function BarberProfileModal({ barberId, isOpen, onClose }) {
  const dispatch = useDispatch();
  const { selectedProfile, loading } = useSelector(state => state.barbers);

  useEffect(() => {
    if (isOpen && barberId) {
      dispatch(fetchBarberProfile(barberId));
    }
  }, [isOpen, barberId, dispatch]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Barber Profile">
       {loading || !selectedProfile ? (
         <div className="p-8 text-center text-gray-500">Loading profile...</div>
       ) : (
         <div className="p-4 space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {selectedProfile.ProfileImage ? (
                  <OptimizedImage src={selectedProfile.ProfileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                   <span className="flex items-center justify-center h-full text-3xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold">{selectedProfile.DisplayName || selectedProfile.FullName}</h3>
                <p className="text-sm text-gray-500">{selectedProfile.Gender ? selectedProfile.Gender : ''} {selectedProfile.YearsOfExperience ? ` • ${selectedProfile.YearsOfExperience} Years Exp.` : ''}</p>
                
                <div className="flex items-center mt-1">
                   <span className="text-yellow-500">★</span>
                   <span className="ml-1 font-bold">{selectedProfile.AverageRating ? selectedProfile.AverageRating.toFixed(1) : "N/A"}</span>
                   <span className="ml-1 text-gray-500 text-sm">({selectedProfile.ReviewsCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <FavoriteButton type="BARBER" targetId={barberId} size="sm" />
                  <ShareButton
                    title={selectedProfile.DisplayName || selectedProfile.FullName}
                    text={`Check out ${selectedProfile.DisplayName || selectedProfile.FullName} on Ajmal!`}
                    url={`${window.location.origin}/customer?barber=${barberId}`}
                  />
                </div>
              </div>
            </div>

            {selectedProfile.Bio && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-100">
                {selectedProfile.Bio}
              </div>
            )}

            {/* Gallery */}
            <div>
              <h4 className="font-semibold mb-2 text-sm uppercase text-gray-400 tracking-wider">Portfolio</h4>
              <BarberGallery barberId={barberId} />
            </div>

            <div>
              <h4 className="font-semibold mb-2 text-sm uppercase text-gray-400 tracking-wider">Recent Reviews</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {selectedProfile.reviews?.map(review => (
                  <div key={review.Id} className="border-b last:border-0 pb-3 last:pb-0">
                     <div className="flex justify-between items-center mb-1">
                       <span className="font-bold text-sm">{review.CustomerName}</span>
                       <span className="text-yellow-500 text-xs">{"★".repeat(review.Rating)}</span>
                     </div>
                     <p className="text-sm text-gray-600">{review.Comment}</p>
                     <p className="text-xs text-gray-400 mt-1">{new Date(review.CreatedAt).toLocaleDateString()}</p>
                  </div>
                ))}
                {(!selectedProfile.reviews || selectedProfile.reviews.length === 0) && (
                  <p className="text-gray-400 italic text-sm">No reviews yet.</p>
                )}
              </div>
            </div>
         </div>
       )}
    </Modal>
  );
}
