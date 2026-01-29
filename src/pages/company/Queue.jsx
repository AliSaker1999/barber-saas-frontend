import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchQueue, moveNext, markQueueNoShow, updateQueueServicesThunk, notifyCustomer, verifyQueuePaymentThunk, approveQueueItemThunk, declineQueueItemThunk } from "../../features/queue/queueSlice";
import { openChatWindow } from "../../features/chat/chatSlice";
import { fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { fetchBarbersForTenant } from "../../features/booking/bookingSlice";
import { getSocket } from "../../services/socket";
import CustomerModal from "../../components/CustomerModal";
import Modal from "../../components/Modal";

export default function Queue() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.queue);
  const barbers = useAppSelector(state => state.booking.barbers);
  const tenantId = useAppSelector(state => state.auth.user?.tenantId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isNextModalOpen, setIsNextModalOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [actionTargetId, setActionTargetId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const handleOpenCustomer = (customerId) => {
    dispatch(fetchCustomerDetails({ customerId }));
    setIsModalOpen(true);
  };

  const handleEditServices = (item) => {
    setEditingItem(item);
    setSelectedServiceIds(item.services?.map(s => s.id) || []);
    setIsEditingServices(true);
    setActionError(null);
  };

  const confirmEditServices = async () => {
    try {
        if (!editingItem) return;
        setActionError(null);
        await dispatch(updateQueueServicesThunk({ 
            queueId: editingItem.id, 
            serviceIds: selectedServiceIds 
        })).unwrap();
        setIsEditingServices(false);
        setEditingItem(null);
        dispatch(fetchQueue());
    } catch (err) {
        setActionError(err);
    }
  };

  useEffect(() => {
    dispatch(fetchQueue());
    if (tenantId) {
        dispatch(fetchBarbersForTenant({ tenantId }));
    }

    const socket = getSocket();
    if (socket && tenantId) {
      socket.emit("join-tenant", tenantId);
      socket.on("queue:update", () => {
        dispatch(fetchQueue());
      });
    }

    return () => {
        if (socket) {
            socket.off("queue:update");
        }
    };
  }, [dispatch, tenantId]);

  const { activeQueues, awaitingPaymentItems, pendingApprovalItems } = useMemo(() => {
     const map = {};
     const awaiting = [];
     const pending = [];

     items.forEach(item => {
         if (item.statusId === 6) {
             awaiting.push(item);
             return;
         }
         if (item.statusId === 7) {
             pending.push(item);
             return;
         }

         if (!map[item.barberId]) {
             map[item.barberId] = {
                 barberName: item.barberName,
                 barberId: item.barberId,
                 items: []
             };
         }
         map[item.barberId].items.push(item);
     });
     return { 
       activeQueues: Object.values(map),
       awaitingPaymentItems: awaiting,
       pendingApprovalItems: pending
     };
  }, [items]);

  const handleNext = (barberId) => {
      setActionTargetId(barberId);
      setIsNextModalOpen(true);
      setActionError(null);
  };

  const confirmNext = async () => {
    try {
        await dispatch(moveNext(actionTargetId)).unwrap();
        dispatch(fetchQueue());
        setIsNextModalOpen(false);
    } catch (err) {
        setActionError(err);
    }
  };

  const handleApprove = (queueId) => {
      setActionTargetId(queueId);
      setIsApproveModalOpen(true);
      setActionError(null);
  };

  const confirmApprove = async () => {
      try {
          await dispatch(approveQueueItemThunk(actionTargetId)).unwrap();
          dispatch(fetchQueue());
          setIsApproveModalOpen(false);
      } catch (err) {
          setActionError(err);
      }
  };

  const handleDecline = (queueId) => {
      setActionTargetId(queueId);
      setIsDeclineModalOpen(true);
      setActionError(null);
  };

  const confirmDecline = async () => {
      try {
          await dispatch(declineQueueItemThunk(actionTargetId)).unwrap();
          dispatch(fetchQueue());
          setIsDeclineModalOpen(false);
      } catch (err) {
          setActionError(err);
      }
  };

  const handleNoShow = (queueId) => {
      setActionTargetId(queueId);
      setIsNoShowModalOpen(true);
      setActionError(null);
  };

  const confirmNoShow = async () => {
    try {
        await dispatch(markQueueNoShow(actionTargetId)).unwrap();
        dispatch(fetchQueue());
        setIsNoShowModalOpen(false);
    } catch (err) {
        setActionError(err);
    }
  };

  const handleNotify = (queueId) => {
      setActionTargetId(queueId);
      setIsNotifyModalOpen(true);
      setActionError(null);
  };

  const confirmNotify = async () => {
    try {
        await dispatch(notifyCustomer(actionTargetId)).unwrap();
        setIsNotifyModalOpen(false);
    } catch (err) {
        setActionError(err);
    }
  };

  const handleVerifyPayment = (queueId) => {
      setActionTargetId(queueId);
      setIsVerifyModalOpen(true);
      setActionError(null);
  };

  const confirmVerifyPayment = async () => {
      try {
          await dispatch(verifyQueuePaymentThunk(actionTargetId)).unwrap();
          dispatch(fetchQueue()); // Refresh to move item to active queue
          setIsVerifyModalOpen(false);
      } catch (err) {
          setActionError(err);
      }
  };

  const formatJoinedTime = (dateStr) => {
      const d = new Date(dateStr);
      // Fixed: Adjusting for 2 hour offset as requested
      d.setHours(d.getHours() - 2);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🚀 Queue Management</h1>
        <p className="text-gray-600">Manage customer flow</p>
      </div>

      {loading && items.length === 0 && (
         <div className="text-center py-10">
            <p>Loading queue data...</p>
         </div>
      )}
      
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg font-semibold">Queue is empty</p>
            <p className="text-gray-400 mt-2">No customers waiting.</p>
        </div>
      )}

      <div className="space-y-12">
      
      {/* ⏳ Pending Approval Section */}
      {pendingApprovalItems.length > 0 && (
          <div className="bg-yellow-50 rounded-3xl p-6 border-2 border-yellow-200 shadow-xl mb-12">
               <div className="flex items-center gap-3 mb-6">
                   <div className="bg-yellow-500 text-white p-2 rounded-lg">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-yellow-900">Queue Approvals Required</h2>
               </div>
               
               <div className="space-y-3">
                   {pendingApprovalItems.map((item) => (
                       <div key={item.id} className="p-4 rounded-xl flex items-center justify-between bg-white border border-yellow-100 shadow-sm">
                           <div className="flex items-center gap-4">
                               <div className="text-xl font-black w-12 text-center text-yellow-500">
                                   ⏳
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                       <button 
                                         onClick={() => handleOpenCustomer(item.customerId)}
                                         className="font-bold text-lg text-gray-800 hover:text-blue-600 transition-colors"
                                       >
                                         {item.customerName} 
                                       </button>
                                       <span className="text-sm text-gray-400 font-medium">wants to join {item.barberName}'s queue</span>
                                   </div>
                                   <div className="flex gap-1 mt-1">
                                      {item.services?.map(s => (
                                        <span key={s.id} className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded border border-yellow-100 uppercase font-black">
                                          {s.name}
                                        </span>
                                      ))}
                                   </div>
                               </div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                                <button 
                                   onClick={() => handleApprove(item.id)}
                                   className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold transition shadow-md flex items-center gap-2"
                                >
                                    Approve
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button 
                                   onClick={() => handleDecline(item.id)}
                                   className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold transition border border-red-100"
                                >
                                    Decline
                                </button>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {/* ⚠️ Awaiting Payment Section */}
      {awaitingPaymentItems.length > 0 && (
          <div className="bg-amber-50 rounded-3xl p-6 border-2 border-amber-200 shadow-xl mb-12">
               <div className="flex items-center gap-3 mb-6">
                   <div className="bg-amber-500 text-white p-2 rounded-lg">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <h2 className="text-2xl font-bold text-amber-900">Payment Verification Required</h2>
               </div>
               
               <div className="space-y-3">
                   {awaitingPaymentItems.map((item) => (
                       <div key={item.id} className="p-4 rounded-xl flex items-center justify-between bg-white border border-amber-100 shadow-sm">
                           <div className="flex items-center gap-4">
                               <div className="text-xl font-black w-12 text-center text-amber-400">
                                   ⏳
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                       <button 
                                         onClick={() => handleOpenCustomer(item.customerId)}
                                         className="font-bold text-lg text-gray-800 hover:text-blue-600 transition-colors"
                                       >
                                         {item.customerName} 
                                       </button>
                                       <span className="text-sm text-gray-400">waiting for {item.barberName}</span>
                                   </div>
                                   
                                   <div className="flex flex-col mt-1">
                                       <p className="text-xs text-gray-500">Joined {formatJoinedTime(item.joinedAt)}</p>
                                       {item.paymentReference && (
                                           <p className="text-xs font-bold text-green-600 mt-1">Ref: {item.paymentReference}</p>
                                       )}
                                   </div>
                               </div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                                <button 
                                   onClick={() => handleVerifyPayment(item.id)}
                                   className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold transition shadow-md flex items-center gap-2"
                                >
                                    Verify Payment
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button 
                                   onClick={() => handleNoShow(item.id)}
                                   className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                                   title="Remove"
                                >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {activeQueues.map(group => (
          <div key={group.barberId} className="bg-gray-50 rounded-3xl p-6 border border-gray-200">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h2 className="text-2xl font-bold text-indigo-900">{group.barberName}'s Queue</h2>
                   
                   <button 
                        onClick={() => handleNext(group.barberId)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold transition shadow-lg flex items-center gap-2"
                    >
                        Call Next Customer
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
               </div>
               
               <div className="space-y-3">
                   {group.items.map((item, index) => {
                       const isServing = item.status === "IN_PROGRESS" || item.status === "In Progress" || item.position === 0;
                       
                       return (
                           <div key={item.id} className={`p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${
                               isServing 
                               ? "bg-white border-l-8 border-indigo-600 shadow-md scale-[1.01]" 
                               : "bg-white border border-gray-100 opacity-90"
                           }`}>
                               <div className="flex items-center gap-4">
                                   <div className={`text-xl font-black w-12 text-center ${isServing ? "text-indigo-600" : "text-gray-400"}`}>
                                       {isServing ? "NOW" : `#${index}`} 
                                   </div>
                                   <div>
                                       <button 
                                         onClick={() => handleOpenCustomer(item.customerId)}
                                         className="font-bold text-lg text-gray-800 hover:text-blue-600 transition-colors pointer-events-auto text-left block"
                                       >
                                         {item.customerName}
                                       </button>
                                       <div className="flex flex-wrap gap-1 mt-1">
                                          {item.services?.map(s => (
                                            <span key={s.id} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 uppercase font-bold">
                                              {s.name}
                                            </span>
                                          ))}
                                          <button 
                                            onClick={() => handleEditServices(item)}
                                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold ml-1 uppercase hover:underline"
                                          >
                                            Edit
                                          </button>
                                       </div>
                                       <p className="text-xs text-gray-500 mt-1">
                                          Joined {formatJoinedTime(item.joinedAt)} • {item.totalDuration} min
                                       </p>
                                   </div>
                               </div>
                               
                               <div className="flex items-center gap-3">
                                   <button
                                       onClick={() => dispatch(openChatWindow({
                                           barberId: item.barberId,
                                           customerId: item.customerId,
                                           peerName: item.customerName
                                       }))}
                                       className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
                                       title="Internal Chat"
                                   >
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                   </button>
                                   {!isServing && (
                                     <>
                                        {item.customerPhone && (
                                           <a
                                             href={`https://wa.me/${item.customerPhone.replace(/\D/g, '')}`}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="w-8 h-8 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                                             title="Chat on WhatsApp"
                                           >
                                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                           </a>
                                        )}
                                        <button
                                          onClick={() => handleNotify(item.id)} 
                                          className="w-8 h-8 flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors border border-amber-200"
                                          title="Notify (10 min warning)"
                                        >
                                          🔔
                                        </button>
                                     </>
                                   )}

                                   {isServing ? (
                                       <>
                                           <button 
                                               onClick={() => handleNoShow(item.id)}
                                               className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl font-bold text-xs uppercase transition-all border border-red-100"
                                           >
                                               No Show
                                           </button>
                                           <span className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide shadow-md">
                                               In Chair
                                           </span>
                                       </>
                                   ) : (
                                       index === 0 && (
                                           <button 
                                               onClick={() => handleNoShow(item.id)}
                                               className="text-gray-400 hover:text-red-500 font-bold text-xs uppercase transition-colors"
                                           >
                                               No Show
                                           </button>
                                       )
                                   )}
                               </div>
                           </div>
                       );
                   })}
               </div>
          </div>
      ))}
      </div>

     <CustomerModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          dispatch(clearSelectedCustomer());
        }} 
      />

      {/* Edit Services Modal */}
      <Modal
        isOpen={isEditingServices}
        onClose={() => setIsEditingServices(false)}
        title={`Edit Services for ${editingItem?.customerName}`}
      >
        <div className="p-4">
            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
                {barbers.find(b => b.barberId === editingItem?.barberId)?.services?.map(service => (
                    <div 
                        key={service.id} 
                        onClick={() => {
                            setSelectedServiceIds(prev => 
                                prev.includes(service.id) 
                                    ? prev.filter(id => id !== service.id) 
                                    : [...prev, service.id]
                            );
                        }}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex justify-between items-center ${
                            selectedServiceIds.includes(service.id) 
                                ? "border-indigo-600 bg-indigo-50" 
                                : "border-gray-100 hover:border-indigo-200"
                        }`}
                    >
                        <div>
                            <p className={`font-bold ${selectedServiceIds.includes(service.id) ? "text-indigo-900" : "text-gray-800"}`}>
                                {service.name}
                            </p>
                            <p className="text-xs text-gray-500">{service.durationMinutes} min • ${service.price}</p>
                        </div>
                        {selectedServiceIds.includes(service.id) && (
                           <div className="bg-indigo-600 rounded-full p-1 text-white">
                               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                           </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center border-t pt-4">
                <p className="font-bold text-gray-700">
                    Total: {barbers.find(b => b.barberId === editingItem?.barberId)?.services
                                ?.filter(s => selectedServiceIds.includes(s.id))
                                .reduce((acc, s) => acc + s.durationMinutes, 0) || 0} min
                </p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsEditingServices(false)}
                        className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmEditServices}
                        disabled={selectedServiceIds.length === 0}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      </Modal>

      {/* No Show Confirmation Modal */}
      <Modal
        isOpen={isNoShowModalOpen}
        onClose={() => setIsNoShowModalOpen(false)}
        title="Confirm No Show"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Mark as No Show?</h3>
            <p className="text-gray-500 mb-6">This will remove the customer from the queue and increment their no-show count.</p>
            
            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsNoShowModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={confirmNoShow}
                    className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition shadow-lg shadow-amber-200"
                >
                    Confirm
                </button>
            </div>
        </div>
      </Modal>

      {/* Call Next Confirmation Modal */}
      <Modal
        isOpen={isNextModalOpen}
        onClose={() => setIsNextModalOpen(false)}
        title="Call Next Customer"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ready for Next?</h3>
            <p className="text-gray-500 mb-6">This will complete the current session and notify the next customer in line.</p>

            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsNextModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Stay
                </button>
                <button 
                    onClick={confirmNext}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-200"
                >
                    Call Now
                </button>
            </div>
        </div>
      </Modal>

      {/* Notify Confirmation Modal */}
      <Modal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        title="Notify Customer"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔔</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Send 10-Min Warning?</h3>
            <p className="text-gray-500 mb-6">This will send a notification (and WhatsApp message if available) telling the customer to arrive in 10 minutes.</p>

            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsNotifyModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={confirmNotify}
                    className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-lg"
                >
                    Send Notification
                </button>
            </div>
        </div>
      </Modal>

      {/* Verify Payment Confirmation Modal */}
      <Modal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        title="Verify Payment"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Payment Verification?</h3>
            <p className="text-gray-500 mb-6">This will accept the payment and move the customer into the active queue.</p>
            
            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={confirmVerifyPayment}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-lg"
                >
                    Confirm & Move
                </button>
            </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Approve Queue Request"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Approve this request?</h3>
            <p className="text-gray-500 mb-6 font-medium">This will move the customer to the active queue (waiting status).</p>
            
            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsApproveModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    No, stay
                </button>
                <button 
                    onClick={confirmApprove}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition shadow-lg"
                >
                    Yes, Approve
                </button>
            </div>
        </div>
      </Modal>

      {/* Decline Modal */}
      <Modal
        isOpen={isDeclineModalOpen}
        onClose={() => setIsDeclineModalOpen(false)}
        title="Decline Queue Request"
      >
        <div className="p-6 text-center">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Decline this request?</h3>
            <p className="text-gray-500 mb-6 font-medium">Are you sure you want to decline this queue join request? The customer will be notified.</p>
            
            {actionError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold">
                    {actionError}
                </div>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={() => setIsDeclineModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
                >
                    Cancel
                </button>
                <button 
                    onClick={confirmDecline}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-lg"
                >
                    Yes, Decline
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
}

