import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchTenantDashboard } from "../../features/reports/reportsSlice";

export default function AdminReports() {
  const dispatch = useAppDispatch();
  const { tenantDashboard, loading } = useAppSelector(s => s.reports);

  useEffect(() => {
    dispatch(fetchTenantDashboard());
  }, [dispatch]);

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Loading shop intelligence...</div>;
  if (!tenantDashboard) return <div className="p-8 text-center text-red-500 font-bold">No data available.</div>;

  const { summary, barbers, services, dailyRevenue, topCustomers } = tenantDashboard;

  // Fill in the last 30 days to ensure a consistent chart even if some days have no revenue
  const last30Days = [...Array(30)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const chartData = last30Days.map(date => {
    const dStr = date.toLocaleDateString('en-CA');
    const existing = dailyRevenue.find(d => {
      return new Date(d.Date).toLocaleDateString('en-CA') === dStr;
    });
    return {
      Date: date,
      Revenue: existing ? Number(existing.Revenue) : 0
    };
  });

  const maxRevenue = Math.max(...chartData.map(d => d.Revenue), 1);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analytics & Intelligence</h1>
        <p className="text-gray-500 font-medium text-lg">In-depth performance tracking for your shop</p>
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
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
          Revenue Trend (Last 30 Days)
        </h3>
        <div className="h-48 flex items-end gap-1 px-4">
              {chartData.map((d, i) => (
            <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
              <div 
                className="bg-blue-100 group-hover:bg-blue-600 transition-all rounded-t-sm" 
                style={{ height: `${(d.Revenue / maxRevenue) * 100}%` }}
              ></div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-10">
                {new Date(d.Date).toLocaleDateString()}: ${d.Revenue.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
            <span>{chartData[0].Date.toLocaleDateString()}</span>
           <span>Today</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Barber Performance */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
           <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Barber Performance</h3>
           <div className="space-y-6">
              {barbers.map((b, i) => {
                const maxBarberRev = Math.max(...barbers.map(bar => bar.Revenue), 1);
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                       <span className="text-gray-900">{b.BarberName}</span>
                       <span className="text-blue-600">${b.Revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                       <div className="bg-blue-600 h-full transition-all" style={{ width: `${(b.Revenue / maxBarberRev) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase">
                       <span>{b.CompletedCount} Completed</span>
                       <span>{b.TotalAppointments} Total</span>
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Service Popularity */}
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
           <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight">Top Services</h3>
           <div className="space-y-4">
              {services.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-gray-300 text-xs border border-gray-100">{i + 1}</div>
                      <div>
                        <div className="font-bold text-gray-900">{s.ServiceName}</div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.UsageCount} Times Used</div>
                      </div>
                   </div>
                   <div className="text-sm font-black text-green-600">+${s.Revenue.toLocaleString()}</div>
                </div>
              ))}
           </div>
        </div>

      </div>

      {/* Top Customers */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
           <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Most Loyal Customers</h3>
           <span className="text-xs font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">VIP Tracker</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-gray-50/50">
                <tr>
                   <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                   <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Visits</th>
                   <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Total Life-Time Value</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {topCustomers.map((c, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-6">
                       <div className="font-bold text-gray-900">{c.FullName}</div>
                       <div className="text-xs text-gray-500 font-medium">{c.Email}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className="px-4 py-1.5 bg-gray-100 rounded-xl font-black text-gray-700 text-xs">{c.VisitCount}</span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-blue-600 text-lg">
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
    blue: "bg-blue-600 shadow-blue-200",
    green: "bg-emerald-600 shadow-emerald-200",
    red: "bg-rose-600 shadow-rose-200",
    orange: "bg-amber-600 shadow-amber-200"
  };

  return (
    <div className={`p-8 rounded-3xl text-white shadow-xl ${colors[color]}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">{title}</div>
      <div className="text-3xl font-black mb-1">{value}</div>
      {subtext && <div className="text-[10px] font-bold opacity-75 uppercase tracking-tight">{subtext}</div>}
    </div>
  );
}
