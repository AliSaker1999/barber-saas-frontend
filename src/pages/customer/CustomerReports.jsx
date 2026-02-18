import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchCustomerDashboard } from "../../features/reports/reportsSlice";
import RateBarberModal from "../../components/RateBarberModal";

export default function CustomerReports() {
  const dispatch = useAppDispatch();
  const { customerDashboard, loading } = useAppSelector(s => s.reports);

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingData, setRatingData] = useState(null);

  useEffect(() => {
    dispatch(fetchCustomerDashboard());
  }, [dispatch]);

  const handleRate = (activity) => {
    setRatingData({
      barberId: activity.BarberId,
      visitId: activity.VisitId,
      type: activity.Type
    });
    setRatingModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Retrieving your grooming history...</div>;
  if (!customerDashboard) return <div className="p-8 text-center text-red-500 font-bold">No data available yet. Start booking!</div>;

  const { stats, shopSpending, servicePrefs, recentActivities } = customerDashboard;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Your Grooming Stats</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">Looking back at your journey with us</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Spent" value={`$${stats.TotalSpent.toLocaleString()}`} color="blue" />
        <StatCard title="Appointments" value={stats.TotalAppointments} color="green" />
        <StatCard title="Reliability" value={`${stats.TotalAppointments > 0 ? Math.round((stats.CompletedCount / stats.TotalAppointments) * 100) : 0}%`} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Spending by Shop */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
           <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight">Favorite Shops</h3>
           <div className="space-y-6">
              {shopSpending.map((shop, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center font-black text-gray-300 dark:text-gray-500 uppercase">{shop.TenantName.charAt(0)}</div>
                      <div>
                         <div className="font-bold text-gray-900 dark:text-white">{shop.TenantName}</div>
                         <div className="text-[10px] text-gray-400 font-black uppercase">{shop.VisitCount} Visits</div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="font-black text-gray-900 dark:text-white">${shop.TotalSpent.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400 font-black uppercase">Last: {new Date(shop.LastVisit).toLocaleDateString()}</div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Service Preferences */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-8 shadow-sm">
           <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight">Service Breakdown</h3>
           <div className="flex flex-wrap gap-3">
              {servicePrefs.map((pref, i) => (
                <div key={i} className="px-5 py-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-center gap-3">
                   <span className="font-black">{pref.Count}x</span>
                   <span className="font-bold">{pref.ServiceName}</span>
                </div>
              ))}
           </div>
           {servicePrefs.length === 0 && <p className="text-gray-400 text-sm font-medium italic">No service data yet.</p>}
        </div>

      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-700">
           <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Recent Activity Feed</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
           {recentActivities.map((activity, i) => (
              <div key={i} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs ${activity.Status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'}`}>
                       {activity.Status.charAt(0)}
                    </div>
                    <div>
                       <div className="font-bold text-gray-900 dark:text-white">
                          {activity.TenantName} 
                          <span className="ml-2 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full border dark:border-gray-600 uppercase tracking-widest">{activity.Type}</span>
                       </div>
                       <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{activity.Services || 'No services listed'}</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-8">
                    <div className="text-right">
                       <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{new Date(activity.Date).toLocaleDateString()}</div>
                       <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(activity.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         activity.Status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                         activity.Status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                         'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                         {activity.Status}
                      </div>
                      {activity.Status === 'COMPLETED' && (
                        activity.IsRated ? (
                           <span className="text-gray-400 font-black text-[10px] uppercase tracking-tighter flex items-center gap-1">
                             <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             Rated
                           </span>
                        ) : (
                          <button 
                            onClick={() => handleRate(activity)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-black text-[10px] uppercase tracking-tighter"
                          >
                            Rate Service
                          </button>
                        )
                      )}
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>

      <RateBarberModal
        isOpen={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        barberId={ratingData?.barberId}
        appointmentId={ratingData?.type === 'Appointment' ? ratingData.visitId : null}
        queueId={ratingData?.type === 'Walk-in' ? ratingData.visitId : null}
        onSuccess={() => {
           dispatch(fetchCustomerDashboard()); // Refresh to hide button
        }}
      />
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    blue: "bg-blue-600 shadow-blue-200 dark:shadow-none",
    green: "bg-emerald-600 shadow-emerald-200 dark:shadow-none",
    red: "bg-rose-600 shadow-rose-200 dark:shadow-none",
    orange: "bg-amber-600 shadow-amber-200 dark:shadow-none"
  };

  return (
    <div className={`p-8 rounded-3xl text-white shadow-xl ${colors[color]}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{title}</div>
      <div className="text-3xl font-black">{value}</div>
    </div>
  );
}
