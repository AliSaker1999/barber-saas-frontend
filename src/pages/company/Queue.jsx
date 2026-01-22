import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchQueue, moveNext, markQueueNoShow } from "../../features/queue/queueSlice";
import { fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { getSocket } from "../../services/socket";
import CustomerModal from "../../components/CustomerModal";

export default function Queue() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.queue);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenCustomer = (customerId) => {
    dispatch(fetchCustomerDetails({ customerId }));
    setIsModalOpen(true);
  };

  useEffect(() => {
    dispatch(fetchQueue());

    const socket = getSocket();
    if (socket) {
      socket.on("queue:update", () => {
        dispatch(fetchQueue());
      });
    }

    return () => socket?.off("queue:update");
  }, [dispatch]);

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

  const handleNext = async (barberId) => {
      try {
          await dispatch(moveNext(barberId)).unwrap();
      } catch (err) {
          alert("Action failed: " + err);
      }
  };

  const handleNoShow = async (queueId) => {
    if (!window.confirm("Mark this customer as No Show?")) return;
    try {
        await dispatch(markQueueNoShow(queueId)).unwrap();
    } catch (err) {
        alert("Action failed: " + err);
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
                                       <p className="text-xs text-gray-500">Joined {formatJoinedTime(item.joinedAt)}</p>
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
    </div>
  );
}

