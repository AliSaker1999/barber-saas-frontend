import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenantDashboard } from "../../features/reports/reportsSlice";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";

export default function AdminReports() {
  const dispatch = useAppDispatch();
  const { tenantDashboard, loading, error } = useAppSelector(s => s.reports);

  useEffect(() => {
    dispatch(fetchTenantDashboard());
  }, [dispatch]);

  if (loading) return <LoadingState label="Loading shop intelligence..." blocks={3} />;
  if (error) {
    return (
      <ErrorState
        message={getFriendlyErrorMessage(error, "Unable to load analytics right now.")}
        onRetry={() => dispatch(fetchTenantDashboard())}
      />
    );
  }
  if (!tenantDashboard) {
    return <EmptyState title="No analytics data yet" description="Report data will appear after activity starts." />;
  }

  const { summary, barbers, services, dailyRevenue, topCustomers } = tenantDashboard;

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.Revenue), 1);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-app-text tracking-tight">Analytics & Intelligence</h1>
        <p className="text-app-muted font-medium text-lg">In-depth performance tracking for your shop</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`$${summary.TotalRevenue.toLocaleString()}`} 
          color="blue" 
          subtext="Appointments + Queues"
        />
        <StatCard 
          title="Completed" 
          value={summary.CompletedApptCount + summary.CompletedQueueCount} 
          color="green" 
          subtext={`Appt: ${summary.CompletedApptCount} | Queue: ${summary.CompletedQueueCount}`}
        />
        <StatCard 
          title="No-Shows" 
          value={summary.NoShowApptCount + summary.NoShowQueueCount} 
          color="red" 
          subtext={`Appt: ${summary.NoShowApptCount} | Queue: ${summary.NoShowQueueCount}`}
        />
        <StatCard 
          title="Cancellations" 
          value={summary.CancelledApptCount + summary.CancelledQueueCount} 
          color="orange" 
          subtext={`Appt: ${summary.CancelledApptCount} | Queue: ${summary.CancelledQueueCount}`}
        />
      </div>

      {/* Revenue Chart (CSS Implementation) */}
      <div className="bg-app-surface p-8 rounded-[25px] border border-app-border shadow-sm">
        <h3 className="text-xl font-black text-app-text mb-6 flex items-center gap-2">
          <span className="w-2 h-6 bg-app-accent rounded-full"></span>
          Revenue Trend (Last 30 Days)
        </h3>
        <div className="h-48 flex items-end gap-1 px-4">
          {dailyRevenue.map((d, i) => (
            <div key={i} className="flex-1 group relative">
              <div 
                className="bg-app-accent/10 group-hover:bg-app-accent transition-all rounded-t-sm" 
                style={{ height: `${(d.Revenue / maxRevenue) * 100}%` }}
              ></div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-app-accent-dark text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                {new Date(d.Date).toLocaleDateString()}: ${d.Revenue.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-black text-app-muted uppercase tracking-widest px-4">
           <span>{new Date(dailyRevenue[0]?.Date).toLocaleDateString()}</span>
           <span>Today</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Barber Performance */}
          <div className="bg-app-surface border border-app-border rounded-[25px] p-8 shadow-sm">
            <h3 className="text-xl font-black text-app-text mb-6 uppercase tracking-tight">Barber Performance</h3>
           <div className="space-y-6">
              {barbers.map((b, i) => {
                const maxBarberRev = Math.max(...barbers.map(bar => bar.Revenue), 1);
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                    <span className="text-app-text">{b.BarberName}</span>
                    <span className="text-app-accent">${b.Revenue.toLocaleString()}</span>
                    </div>
                  <div className="w-full bg-app-surface-2 h-2 rounded-full overflow-hidden">
                    <div className="bg-app-accent h-full transition-all" style={{ width: `${(b.Revenue / maxBarberRev) * 100}%` }}></div>
                    </div>
                  <div className="flex justify-between text-[10px] font-black text-app-muted uppercase">
                       <span>{b.CompletedCount} Completed</span>
                       <span>{b.TotalAppointments} Total</span>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Service Popularity */}
          <div className="bg-app-surface border border-app-border rounded-[25px] p-8 shadow-sm">
            <h3 className="text-xl font-black text-app-text mb-6 uppercase tracking-tight">Top Services</h3>
            <div className="space-y-4">
              {services.slice(0, 6).map((s, i) => (
               <div key={i} className="flex items-center justify-between p-4 bg-app-surface-2 rounded-[12px]">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-app-surface rounded-[12px] flex items-center justify-center font-black text-app-muted text-xs border border-app-border">{i + 1}</div>
                   <div>
                    <div className="font-bold text-app-text">{s.ServiceName}</div>
                    <div className="text-[10px] text-app-muted font-black uppercase tracking-widest">{s.UsageCount} Times Used</div>
                   </div>
                 </div>
                 <div className="text-sm font-black text-app-accent">+${s.Revenue.toLocaleString()}</div>
               </div>
              ))}
            </div>
          </div>

      </div>

      {/* Top Customers */}
      <div className="bg-app-surface border border-app-border rounded-[25px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-app-surface-2 flex justify-between items-center">
          <h3 className="text-xl font-black text-app-text uppercase tracking-tight">Most Loyal Customers</h3>
          <span className="text-xs font-black text-app-accent uppercase bg-app-accent/10 px-3 py-1 rounded-full">VIP Tracker</span>
        </div>
        <div className="overflow-x-auto">
         <table className="w-full text-left">
           <thead className="bg-app-surface-2">
             <tr>
               <th className="px-8 py-4 text-[10px] font-black text-app-muted uppercase tracking-widest">Customer</th>
               <th className="px-8 py-4 text-[10px] font-black text-app-muted uppercase tracking-widest text-center">Visits</th>
               <th className="px-8 py-4 text-[10px] font-black text-app-muted uppercase tracking-widest text-right">Total Life-Time Value</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-app-border">
             {topCustomers.map((c, i) => (
              <tr key={i} className="hover:bg-app-surface-2 transition-colors">
                <td className="px-8 py-6">
                  <div className="font-bold text-app-text">{c.FullName}</div>
                  <div className="text-xs text-app-muted font-medium">{c.Email}</div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="px-4 py-1.5 bg-app-surface-2 rounded-[12px] font-black text-app-text text-xs">{c.VisitCount}</span>
                </td>
                <td className="px-8 py-6 text-right font-black text-app-accent text-lg">
                  ${c.TotalSpend.toLocaleString()}
                </td>
              </tr>
             ))}
           </tbody>
         </table>
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, color, subtext }) {
  const colors = {
    blue: "bg-app-accent",
    green: "bg-app-accent",
    red: "bg-app-accent",
    orange: "bg-app-accent"
  };

  return (
    <div className={`p-8 rounded-3xl text-white shadow-xl ${colors[color]}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{title}</div>
      <div className="text-3xl font-black mb-1">{value}</div>
      {subtext && <div className="text-[10px] font-bold opacity-75 uppercase tracking-tight">{subtext}</div>}
    </div>
  );
}
