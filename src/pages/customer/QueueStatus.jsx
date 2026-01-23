import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchMyQueuePosition, leaveQueue, fetchQueueStats, joinQueue, findMyActiveQueue, updateQueueServicesThunk } from "../../features/queue/queueSlice";
import { selectTenant, fetchBarbersForTenant, selectBarber } from "../../features/booking/bookingSlice";
import { getSocket } from "../../services/socket";
import BarberProfileModal from "../../components/BarberProfileModal";
import PhoneVerificationModal from "../../components/PhoneVerificationModal";
import RateBarberModal from "../../components/RateBarberModal";
import Modal from "../../components/Modal";

export default function QueueStatus() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tenantId = useAppSelector(s => s.booking.tenantId);
  const myPosition = useAppSelector(s => s.queue.myPosition);
  const user = useAppSelector(s => s.auth.user);
  const stats = useAppSelector(s => s.queue.stats);
  const loading = useAppSelector(s => s.queue.loading);
  const barbers = useAppSelector(s => s.booking.barbers);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [activeQueueData, setActiveQueueData] = useState(null);

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [lastFinishedQueue, setLastFinishedQueue] = useState(null);

  const [selectedBarberForJoin, setSelectedBarberForJoin] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [serviceError, setServiceError] = useState("");

  const openProfile = (id) => {
      setViewProfileId(id);
      setProfileModalOpen(true);
  };

  const [localWaitTime, setLocalWaitTime] = useState(0);
  const [prevWaitTime, setPrevWaitTime] = useState(undefined);
  const lastPositionRef = useRef(null);

  // Detect when served (status 2 -> gone)
  useEffect(() => {
    if (lastPositionRef.current && !myPosition) {
        // If we WERE in progress and now we are not in queue, we were likely served
        if (lastPositionRef.current.statusId === 2) {
            setLastFinishedQueue(lastPositionRef.current);
            setRatingModalOpen(true);
        }
    }
    lastPositionRef.current = myPosition;
  }, [myPosition]);

  // Synchronize local timer with server wait time updates during the render phase to avoid cascading effect renders
  if (myPosition?.waitTime !== undefined && myPosition.waitTime !== prevWaitTime) {
    setLocalWaitTime(myPosition.waitTime);
    setPrevWaitTime(myPosition.waitTime);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalWaitTime(prev => (prev > 0 ? prev - 1 : 0));
    }, 60000); // Decrement every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    dispatch(fetchMyQueuePosition(tenantId));
    dispatch(fetchBarbersForTenant({ tenantId }));

    const socket = getSocket();
    if (socket) {
      socket.emit("join-tenant", tenantId);
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
  }, [dispatch, tenantId, myPosition?.inQueue, myPosition]);


  const handleJoinClick = (barberId) => {
    if (!user?.isPhoneVerified) {
        setVerificationModalOpen(true);
        return;
    }
    setSelectedBarberForJoin(barberId);
    setSelectedServiceIds([]);
    setIsEditMode(false);
    setServiceError("");
    setServiceModalOpen(true);
  };

  const handleEditServices = () => {
    if (!myPosition) return;
    setSelectedBarberForJoin(myPosition.barberId);
    setSelectedServiceIds(myPosition.services?.map(s => s.id) || []);
    setIsEditMode(true);
    setServiceError("");
    setServiceModalOpen(true);
  };

  const confirmJoin = async () => {
      try {
          setServiceError("");
          if (!selectedBarberForJoin) return;
          if (selectedServiceIds.length === 0) {
            setServiceError("Please select at least one service.");
            return;
          }

          if (isEditMode) {
              await dispatch(updateQueueServicesThunk({ 
                  queueId: myPosition.queueId, 
                  serviceIds: selectedServiceIds 
              })).unwrap();
          } else {
              await dispatch(joinQueue({ 
                  tenantId, 
                  barberId: selectedBarberForJoin, 
                  serviceIds: selectedServiceIds 
              })).unwrap();
          }
          
          dispatch(fetchMyQueuePosition(tenantId));
          setServiceModalOpen(false);
      } catch (err) {
          const errMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);

          if (errMsg.includes("Phone verification required")) {
              setServiceModalOpen(false);
              setVerificationModalOpen(true);
              return;
           }

          // If already in queue (possibly at another tenant)
          if (errMsg.includes("already in a queue")) {
              setServiceModalOpen(false);
              try {
                  const active = await dispatch(findMyActiveQueue()).unwrap();
                  if (active) {
                      setActiveQueueData(active);
                      setConflictModalOpen(true);
                  }
              } catch {
                  // Fallback to error tag if findActive fails
                  setServiceError(errMsg);
                  setServiceModalOpen(true);
              }
          } else {
              setServiceError(errMsg);
              setServiceModalOpen(true);
          }
      }
  };

  const goToActiveQueue = () => {
      if (activeQueueData) {
          dispatch(selectTenant(activeQueueData.tenantId));
          setConflictModalOpen(false);
          // If already on /customer/queue, useEffect will trigger position fetch
          // If not, navigate will move the user
          navigate("/customer/queue");
      }
  };

  const handleLeaveQueue = () => {
    setServiceError("");
    setLeaveModalOpen(true);
  };

  const confirmLeave = async () => {
    try {
      setServiceError("");
      await dispatch(leaveQueue(tenantId)).unwrap();
      setLeaveModalOpen(false);
    } catch {
      setServiceError("Failed to leave queue. Please try again.");
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${m} ${ampm}`;
  };

  const handleScheduleRedirect = (barberId) => {
    dispatch(selectBarber(barberId));
    navigate("/customer/services");
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

  const renderQueueContent = () => {
    // Case: User is IN Queue
    if (myPosition?.inQueue) {
      const { position, barberName, barberId, services, totalDuration } = myPosition;
      const peopleAhead = position > 0 ? position - 1 : 0;
      
      return (
        <div className="max-w-md mx-auto p-4 pb-20">
          {/* Queue Position Card */}
            <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl shadow-2xl p-8 text-center text-white mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 -mr-16 -mt-16 rounded-full"></div>
                
                <div className="mb-4 relative">
                    <p className="text-blue-200 text-xs uppercase tracking-widest font-bold mb-1">Your Barber</p>
                    <h2 onClick={() => openProfile(barberId)} className="text-2xl font-black cursor-pointer hover:text-blue-200 transition-colors drop-shadow-md">{barberName}</h2>
                </div>

                {position === 0 ? (
                    <div className="mb-8 animate-bounce py-4">
                        <div className="text-5xl font-black mb-2 tracking-tighter">NOW SERVING</div>
                        <p className="text-blue-100 text-lg font-medium opacity-90">Please head to the chair!</p>
                    </div>
                ) : (
                    <div className="mb-8 py-4">
                        <div className="text-7xl font-black mb-2 tracking-tighter drop-shadow-lg">{position}</div>
                        <p className="text-blue-100 text-sm uppercase tracking-widest font-bold opacity-80">Queue Number</p>
                        <div className="flex items-center justify-center gap-2 mt-3 bg-black bg-opacity-20 py-1.5 px-4 rounded-full w-max mx-auto border border-white border-opacity-10 backdrop-blur-sm">
                           <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                           <p className="text-xs text-blue-100 font-bold uppercase">{peopleAhead} {peopleAhead === 1 ? 'person' : 'people'} ahead</p>
                        </div>
                    </div>
                )}

                <div className="bg-white bg-opacity-10 rounded-2xl p-6 border border-white border-opacity-10 backdrop-blur-md mb-6">
                  <div className="flex justify-between items-center mb-4 border-b border-white border-opacity-10 pb-4">
                      <div className="text-left">
                         <p className="text-xs text-blue-200 uppercase font-bold mb-1">Wait Estimate</p>
                         <p className="text-2xl font-black">{localWaitTime} min</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-blue-200 uppercase font-bold mb-1">Status</p>
                         <p className="text-sm font-bold bg-white bg-opacity-20 px-3 py-1 rounded-lg uppercase">
                            {position === 0 ? "In Chair" : "Waiting"}
                         </p>
                      </div>
                  </div>

                  <div className="text-left">
                      <p className="text-xs text-blue-200 uppercase font-bold mb-3 flex justify-between items-center">
                        Selected Services ({totalDuration} min)
                        {position !== 0 && (
                           <button 
                            onClick={handleEditServices}
                            className="text-[10px] bg-white text-indigo-900 px-2 py-0.5 rounded uppercase font-black hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {services?.map(s => (
                          <span key={s.id} className="text-[11px] font-bold bg-white bg-opacity-10 py-1 px-3 rounded-full border border-white border-opacity-10">
                            {s.name}
                          </span>
                        ))}
                      </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-blue-200 text-xs font-bold opacity-75 italic">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   Updates automatically
                </div>
            </div>

            <button
              onClick={handleLeaveQueue}
              className="w-full bg-white hover:bg-red-50 text-red-600 font-black py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg border-2 border-red-100 hover:border-red-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Leave Queue
            </button>
            
            <div className="mt-8 text-center bg-gray-50 border-2 border-gray-100 p-6 rounded-3xl relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter">Support</div>
                 <p className="text-gray-500 text-sm font-bold">Need to talk to {barberName}?</p>
                 <button className="mt-2 text-indigo-600 font-black hover:text-indigo-700 transition-colors flex items-center justify-center gap-2 mx-auto">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Start Chat (Coming Soon)
                 </button>
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
              {stats.map(barber => {
                  const isOff = !barber.isWorkingToday || !barber.isWithinHours || !barber.isAcceptingWalkIns;
                  
                  return (
                      <div key={barber.barberId} className={`bg-white rounded-2xl shadow-sm p-6 border transition-all group ${isOff ? 'bg-gray-50/50' : 'hover:border-blue-500 hover:shadow-md'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div onClick={() => openProfile(barber.barberId)} className="cursor-pointer flex-1">
                                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                     {barber.barberName} <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border uppercase tracking-tighter">Profile</span>
                                  </h3>
                                  
                                  {isOff ? (
                                      <div className="mt-2 flex flex-col gap-1">
                                          <div className="flex items-center gap-2 text-rose-600 font-bold text-sm bg-rose-50 w-max px-3 py-1 rounded-lg border border-rose-100">
                                              <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                              </span>
                                              {!barber.isWorkingToday ? "Off Today" : !barber.isWithinHours ? `Off - Starts at ${formatTime(barber.workingStartTime)}` : "Walk-ins Closed"}
                                          </div>
                                          <p className="text-gray-400 text-xs italic ml-1">Appointments might still be available</p>
                                      </div>
                                  ) : (
                                      <div className="mt-2 flex items-center gap-4">
                                          <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                                              <p className="text-xs text-blue-400 uppercase font-black leading-none mb-1">Waiting</p>
                                              <p className="text-blue-700 font-black text-lg leading-none">{barber.queueLength}</p>
                                          </div>
                                          <div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                              <p className="text-xs text-indigo-400 uppercase font-black leading-none mb-1">Wait Time</p>
                                              <p className="text-indigo-700 font-black text-lg leading-none">~{barber.estimatedWaitMinutes}<span className="text-xs ml-0.5">m</span></p>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <div className="flex flex-col gap-2 min-w-[160px]">
                                  {!isOff && (
                                      <button
                                          onClick={() => handleJoinClick(barber.barberId)}
                                          className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transform active:scale-95 transition-all text-sm"
                                      >
                                          Join the Queue
                                      </button>
                                  )}
                                  
                                  {barber.isAcceptingAppointments && (
                                      <button
                                          onClick={() => handleScheduleRedirect(barber.barberId)}
                                          className={`w-full ${isOff ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200'} px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all text-sm flex items-center justify-center gap-2`}
                                      >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                          Book Appointment
                                      </button>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              })}
              
              {stats.length === 0 && !loading && (
                  <div className="text-center text-gray-500 bg-gray-50 p-12 rounded-3xl border-2 border-dashed border-gray-200">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="font-bold">No Barbers Available</p>
                      <p className="text-sm">We couldn't find any barbers available for walk-ins right now.</p>
                  </div>
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
  };

  return (
    <>
      {renderQueueContent()}

      <BarberProfileModal 
          isOpen={profileModalOpen} 
          onClose={() => setProfileModalOpen(false)} 
          barberId={viewProfileId} 
      />

      <PhoneVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        onVerified={() => {
            // Optional: Auto-open service modal if they were clicking join?
            // User can just click again for now.
        }}
      />

      <RateBarberModal
        isOpen={ratingModalOpen}
        onClose={() => {
            setRatingModalOpen(false);
            setLastFinishedQueue(null);
        }}
        barberId={lastFinishedQueue?.barberId}
        queueId={lastFinishedQueue?.queueId}
        onSuccess={() => {
            setRatingModalOpen(false);
            setLastFinishedQueue(null);
        }}
      />

        {/* Service Selection Modal */}
        <Modal
            isOpen={serviceModalOpen}
            onClose={() => setServiceModalOpen(false)}
            title={isEditMode ? "Edit Services" : "Select Services"}
        >
            <div className="p-4">
                {!isEditMode && (
                    <div className="flex gap-2 mb-6 p-1 bg-gray-100/50 rounded-2xl border border-gray-100">
                        <button className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-white shadow-sm text-blue-600 ring-1 ring-black/5">
                            Walk-in Queue
                        </button>
                        <button 
                            onClick={() => {
                                setServiceModalOpen(false);
                                handleScheduleRedirect(selectedBarberForJoin);
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-gray-500 hover:text-indigo-600 hover:bg-white/50 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Book Appointment
                        </button>
                    </div>
                )}

                <p className="text-gray-600 mb-4 px-1 text-sm">
                    {isEditMode ? "Modify your selected services below:" : "Choose the services you'd like to receive today:"}
                </p>

                {serviceError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2 animate-shake">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {serviceError}
                    </div>
                )}

                <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
                    {barbers.find(b => b.barberId === selectedBarberForJoin)?.services?.map(service => (
                        <div 
                            key={service.id} 
                            onClick={() => {
                                setSelectedServiceIds(prev => 
                                    prev.includes(service.id) 
                                        ? prev.filter(id => id !== service.id) 
                                        : [...prev, service.id]
                                );
                            }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${
                                selectedServiceIds.includes(service.id) 
                                    ? "border-blue-600 bg-blue-50" 
                                    : "border-gray-100 hover:border-blue-200"
                            }`}
                        >
                            <div>
                                <h4 className={`font-bold ${selectedServiceIds.includes(service.id) ? "text-blue-900" : "text-gray-900"}`}>
                                    {service.name}
                                </h4>
                                <p className={`text-sm ${selectedServiceIds.includes(service.id) ? "text-blue-700" : "text-gray-500"}`}>
                                    {service.durationMinutes} min • ${service.price}
                                </p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                selectedServiceIds.includes(service.id)
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-300"
                            }`}>
                                {selectedServiceIds.includes(service.id) && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}
                    {(!barbers.find(b => b.barberId === selectedBarberForJoin)?.services?.length) && (
                      <p className="text-center text-gray-500 italic">No services available for this barber.</p>
                    )}
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                    <div>
                        <p className="text-sm text-gray-500">Total Duration</p>
                        <p className="font-bold text-lg">
                           {barbers.find(b => b.barberId === selectedBarberForJoin)?.services
                                ?.filter(s => selectedServiceIds.includes(s.id))
                                .reduce((acc, s) => acc + s.durationMinutes, 0) || 0} min
                        </p>
                    </div>
                    <button
                        onClick={confirmJoin}
                        disabled={selectedServiceIds.length === 0}
                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                    >
                        Confirm Join
                    </button>
                </div>
            </div>
        </Modal>

        {/* Queue Conflict Modal */}
        <Modal 
            isOpen={conflictModalOpen} 
            onClose={() => setConflictModalOpen(false)}
            title="Active Queue Found"
        >
            <div className="text-center p-4">
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">Already in Queue</h3>
                <p className="text-gray-600 mb-6">
                    You are currently in line at <span className="font-bold text-gray-900">"{activeQueueData?.tenantName}"</span> with <span className="font-bold text-indigo-600">{activeQueueData?.barberName}</span>.
                </p>

                <div className="bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Queue Status</p>
                    <p className="text-sm font-medium text-gray-700">
                        {activeQueueData?.statusId === 2 ? "Currently being served" : "Waiting for your turn"}
                    </p>
                </div>
                
                <div className="flex flex-col gap-3">
                    <button
                        onClick={goToActiveQueue}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 shadow-indigo-200"
                    >
                        Go to My Queue
                    </button>
                    <button
                        onClick={() => setConflictModalOpen(false)}
                        className="w-full bg-white text-gray-500 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Stay Here
                    </button>
                </div>
                
                <p className="mt-6 text-xs text-gray-400">
                    Note: You must leave your current queue before you can join a new one.
                </p>
            </div>
        </Modal>

        {/* Leave Queue Confirmation Modal */}
        <Modal
            isOpen={leaveModalOpen}
            onClose={() => setLeaveModalOpen(false)}
            title="Leave Queue?"
        >
            <div className="text-center p-4">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">Are you sure?</h3>
                <p className="text-gray-600 mb-8">
                    By leaving the queue, you'll lose your current position and will have to join at the end of the line if you change your mind later.
                </p>

                {serviceError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                        {serviceError}
                    </div>
                )}
                
                <div className="flex flex-col gap-3">
                    <button
                        onClick={confirmLeave}
                        className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                    >
                        Confirm Leave
                    </button>
                    <button
                        onClick={() => setLeaveModalOpen(false)}
                        className="w-full bg-white text-gray-500 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </Modal>
    </>
  );
}
