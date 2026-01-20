import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchMyQueuePosition, leaveQueue } from "../../features/queue/queueSlice";
import { getSocket } from "../../services/socket";

export default function QueueStatus() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tenantId = useAppSelector(s => s.booking.tenantId);
  const position = useAppSelector(s => s.queue.myPosition);
  const loading = useAppSelector(s => s.queue.loading);

  useEffect(() => {
    if (!tenantId) return;

    dispatch(fetchMyQueuePosition(tenantId));

    const socket = getSocket();
    if (socket) {
      socket.on("queue:update", () => {
        dispatch(fetchMyQueuePosition(tenantId));
      });
    }

    return () => {
      if (socket) socket.off("queue:update");
    };
  }, [dispatch, tenantId]);

  const handleLeaveQueue = async () => {
    if (window.confirm("Are you sure you want to leave the queue?")) {
      try {
        await dispatch(leaveQueue(tenantId)).unwrap();
        navigate("/customer");
      } catch (err) {
        alert("Failed to leave queue. Please try again.");
      }
    }
  };

  if (!tenantId) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-lg">No active queue</p>
        <button
          onClick={() => navigate("/customer")}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Back to Barbershops
        </button>
      </div>
    );
  }

  if (position === null && !loading) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-lg">You are not currently in a queue</p>
        <button
          onClick={() => navigate("/customer")}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Back to Barbershops
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Updating your position...</p>
          </div>
        </div>
      )}

      {/* Queue Position Card */}
      {!loading && position !== null && (
        <>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 text-center text-white mb-8">
            {/* Position Badge */}
            <div className="mb-6">
              <div className="text-6xl font-black mb-2">{position}</div>
              <p className="text-blue-100 text-lg">Your Position in Line</p>
            </div>

            {/* Status */}
            <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm mb-6">
              <p className="text-sm text-blue-100 mb-2">Estimated Wait Time</p>
              <p className="text-3xl font-bold">
                {position > 1 ? `${(position - 1) * 15}-${(position - 1) * 20} min` : "You're next!"}
              </p>
            </div>

            {/* Info */}
            <p className="text-blue-100 text-sm">
              {position === 1 
                ? "🎉 You're next! Get ready!" 
                : `There are ${position - 1} ${position - 1 === 1 ? 'person' : 'people'} ahead of you`}
            </p>
          </div>

          {/* Progress Visualization */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Queue Progress</h3>
            <div className="space-y-3">
              {[...Array(Math.min(3, position))].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    i === position - 1
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    {i === position - 1 ? "📍" : i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {i === position - 1 ? "Your Position" : `Position ${i + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {i === 0 ? "In Progress" : "Waiting"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <p className="text-xs text-green-600 font-semibold mb-1">Status</p>
              <p className="text-lg font-bold text-green-700">Active</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-green-600">Live</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <p className="text-xs text-blue-600 font-semibold mb-1">Check-in</p>
              <p className="text-lg font-bold text-blue-700">Ready</p>
              <p className="text-xs text-blue-600 mt-2">Get ready soon</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleLeaveQueue}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold py-3 px-6 rounded-lg transition-all duration-200 border-2 border-red-200"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Leave Queue
            </button>
            <button
              onClick={() => navigate("/customer")}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 font-semibold py-3 px-6 rounded-lg transition-all duration-200 border-2 border-gray-200"
            >
              Back to Barbershops
            </button>
          </div>
        </>
      )}
    </div>
  );
}
