import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchQueue, moveNext, markQueueNoShow, updateQueueServicesThunk } from "../../features/queue/queueSlice";
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

  const queues = useMemo(() => {
     const map = {};
     items.forEach(item => {
         if (!map[item.barberId]) {
             map[item.barberId] = {
                 barberName: item.barberName,
                 barberId: item.barberId,
                 items: []
             };
         }
         map[item.barberId].items.push(item);
     });
     return Object.values(map);
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
      {queues.map(group => (
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
    </div>
  );
}

