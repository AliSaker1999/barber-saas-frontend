import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchMyQueuePosition, leaveQueue, fetchQueueStats, joinQueue } from "../../features/queue/queueSlice";
import { getSocket } from "../../services/socket";

export default function QueueStatus() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tenantId = useAppSelector(s => s.booking.tenantId);
  const myPosition = useAppSelector(s => s.queue.myPosition);
  const stats = useAppSelector(s => s.queue.stats);
  const loading = useAppSelector(s => s.queue.loading);

  useEffect(() => {
    if (!tenantId) return;

    dispatch(fetchMyQueuePosition(tenantId));

    const socket = getSocket();
    if (socket) {
      // Listen for queue updates to refresh position or stats
      socket.on("queue:update", () => {
        dispatch(fetchMyQueuePosition(tenantId));
        // If not joined, refresh stats to see queue lengths update
        dispatch(fetchQueueStats(tenantId));
      });
    }

    return () => {
      if (socket) socket.off("queue:update");
    };
  }, [dispatch, tenantId]);

  // Fetch stats if not in queue and we know definitely (myPosition loaded)
  useEffect(() => {
      // If myPosition is loaded (not null) and inQueue is false
      if (tenantId && myPosition && myPosition.inQueue === false) { 
          dispatch(fetchQueueStats(tenantId));
      }
      // Or if myPosition is null, we might be loading, but good to fetch stats anyway if we end up not being in queue
      // For now, allow fetch if tenant exists
      if (tenantId) {
         dispatch(fetchQueueStats(tenantId));
      }
  }, [dispatch, tenantId, myPosition?.inQueue]);


  const handleJoin = async (barberId) => {
      try {
          await dispatch(joinQueue({ tenantId, barberId })).unwrap();
          // After joining, fetch status (will update myPosition)
          dispatch(fetchMyQueuePosition(tenantId));
      } catch (err) {
          alert("Failed to join queue: " + err);
      }
  };

  const handleLeaveQueue = async () => {
    if (window.confirm("Are you sure you want to leave the queue?")) {
      try {
        await dispatch(leaveQueue(tenantId)).unwrap();
      } catch (err) {
        alert("Failed to leave queue. Please try again.");
      }
    }
  };

  if (!tenantId) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-lg">No active queue context</p>
        <button
          onClick={() => navigate("/customer")}
          className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Back to Barbershops
        </button>
      </div>
    );
  }

  // Case: User is IN Queue
  if (myPosition?.inQueue) {
      const { position, barberName } = myPosition;
      const peopleAhead = position > 0 ? position - 1 : 0;
      
      return (
        <div className="max-w-md mx-auto p-4">
          {/* Queue Position Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 text-center text-white mb-8">
                <div className="mb-4">
                    <p className="text-blue-200 text-sm uppercase tracking-wider font-semibold">Barber</p>
                    <h2 className="text-2xl font-bold">{barberName}</h2>
                </div>

                {position === 0 ? (
                    <div className="mb-6 animate-pulse">
                        <div className="text-4xl font-black mb-2">NOW SERVING</div>
                        <p className="text-blue-100 text-lg">It's your turn!</p>
                    </div>
                ) : (
                    <div className="mb-6">
                        <div className="text-6xl font-black mb-2">{position}</div>
                        <p className="text-blue-100 text-lg">Your Number</p>
                        <p className="text-sm text-blue-200 mt-2">({peopleAhead} people ahead of you)</p>
                    </div>
                )}

                <div className="bg-white bg-opacity-20 rounded-2xl p-6 backdrop-blur-sm mb-6">
                  <p className="text-sm text-blue-100 mb-2">Estimated Wait Time</p>
                  <p className="text-3xl font-bold">
                    {position > 0 ? `${position * 20} min` : "0 min"}
                  </p>
                </div>
            </div>

            <button
              onClick={handleLeaveQueue}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold py-3 px-6 rounded-lg transition-all duration-200 border-2 border-red-200"
            >
              Leave Queue
            </button>
            
            <div className="mt-6 text-center bg-gray-50 p-4 rounded-lg">
                 <p className="text-gray-600 font-medium">Need to talk to {barberName}?</p>
                 <button className="mt-2 text-indigo-600 font-bold hover:underline">Start Chat (Coming Soon)</button>
            </div>
        </div>
      );
  }

  // Case: User NOT in Queue - Select Logic
  return (
    <div className="max-w-lg mx-auto p-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Join the Queue</h1>
        <p className="text-gray-600 mb-8 text-center">Select a barber to see their wait time.</p>
        
        {loading && stats.length === 0 && <p className="text-center">Loading live stats...</p>}
        
        <div className="space-y-4">
            {stats.map(barber => (
                <div key={barber.barberId} className="bg-white rounded-xl shadow p-6 flex items-center justify-between border hover:border-blue-500 transition-all cursor-pointer group">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{barber.barberName}</h3>
                        <p className="text-gray-500 text-sm mt-1">
                            <span className="font-semibold text-gray-900">{barber.queueLength}</span> people waiting
                        </p>
                        <p className="text-blue-600 text-sm font-semibold mt-1">~ {barber.estimatedWaitMinutes} min wait</p>
                    </div>
                    <button
                        onClick={() => handleJoin(barber.barberId)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 shadow-md transform hover:scale-105 transition-all"
                    >
                        Join
                    </button>
                </div>
            ))}
            
            {stats.length === 0 && !loading && (
                <p className="text-center text-gray-500 bg-gray-50 p-8 rounded-xl">No barbers currently available for walk-ins.</p>
            )}
        </div>
        
         <button
          onClick={() => navigate("/customer")}
          className="mt-8 w-full text-center text-gray-400 hover:text-gray-600 text-sm"
        >
          Cancel and return to list
        </button>
    </div>
  );
}
