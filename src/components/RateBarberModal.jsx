import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { rateBarber } from '../features/barbers/barbersSlice';
import Modal from './Modal';

export default function RateBarberModal({ barberId, appointmentId, queueId, isOpen, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(rateBarber({ barberId, appointmentId, queueId, rating, comment })).unwrap();
      setComment("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Service">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">How was your experience?</label>
          <div className="flex space-x-2 justify-center py-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className={`text-3xl focus:outline-none transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="text-center text-sm font-medium text-gray-600">
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very Good"}
            {rating === 5 && "Excellent"}
          </div>
        </div>
        <div>
           <label className="block text-sm font-medium mb-1 text-gray-700">Comment (Optional)</label>
           <textarea
             className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
             rows="3"
             placeholder="Tell us about your cut..."
             value={comment}
             onChange={e => setComment(e.target.value)}
           />
        </div>
        <div className="flex justify-end pt-2">
           <button
             type="button"
             onClick={onClose}
             className="mr-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
           >
             Cancel
           </button>
           <button
             type="submit"
             disabled={submitting}
             className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium shadow-sm"
           >
             {submitting ? "Submitting..." : "Submit Review"}
           </button>
        </div>
      </form>
    </Modal>
  );
}
