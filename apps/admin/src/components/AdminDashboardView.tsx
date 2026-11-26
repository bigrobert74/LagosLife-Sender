import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  CreditCard,
  Truck,
  Coins,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Users,
  AlertCircle,
  Eye,
  RotateCw,
  CheckCircle2,
  Activity,
  ArrowRight,
  Timer,
  Sparkles,
} from 'lucide-react';

interface AdminDashboardViewProps {
  overview: any;
  analytics: any;
  alerts: any[];
  orders: any[];
  onNavigate: (view: string) => void;
  onViewOrder: (order: any) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  overview,
  analytics,
  alerts,
  orders,
  onNavigate,
  onViewOrder,
}) => {
  const kpi = overview?.kpiCards || {};
  const recentOrders = orders.slice(0, 6);

  // Live Batch Fulfillment Tracker State
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Poll fulfillment queue every 2.5s for live updates
    const fetchQueue = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/admin/fulfillment/queue');
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.jobs)) {
          const processing = data.data.jobs.filter(
            (j: any) => j.status === 'PROCESSING' || (j.isBatchedOrder && j.status === 'QUEUED'),
          );
          setActiveJobs(processing);
        }
      } catch (err) {
        // silent
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 2500);
    return () => clearInterval(interval);
  }, []);

  // 1-second ticker for precise live cooldown timer countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatBillions = (raw: string | number) => {
    const val = Number(raw || 0) / 1000000000;
    if (val >= 1000) return `${(val / 1000).toFixed(2)} Trillion`;
    return `${val.toFixed(1)} Billion`;
  };

  return (
    <div className="space-y-6">
      {/* Urgent Alert Banner (if any) */}
      {alerts && alerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{alerts[0].message}</strong>
            </span>
          </div>
          <button
            onClick={() => onNavigate('payments')}
            className="px-3 py-1 rounded-lg bg-amber-500 text-black font-extrabold text-[11px] uppercase tracking-wider hover:bg-amber-400 transition"
          >
            Review Now
          </button>
        </div>
      )}

      {/* LIVE BATCH DELIVERY TRACKER (Prominent on Dashboard) */}
      {activeJobs.length > 0 ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-surface via-[#0C1424] to-surface border border-primary/40 shadow-2xl relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-accent-blue" />
          
          {activeJobs.map((job) => {
            const nextSecs = job.nextBatchAt
              ? Math.max(0, Math.ceil((new Date(job.nextBatchAt).getTime() - now) / 1000))
              : 0;

            return (
              <div key={job.id} className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                      <RotateCw className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                          <span>LIVE BATCH DELIVERY IN PROGRESS</span>
                        </span>
                        <span className="text-xs font-mono text-slate-400">Order #{job.orderNumber}</span>
                      </div>
                      <h2 className="text-lg font-black text-white mt-1 flex items-center space-x-2">
                        <span>Transferring to</span>
                        <span className="text-primary font-mono">@{job.gameUsername}</span>
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onNavigate('fulfillment-queue')}
                      className="px-4 py-2 rounded-xl bg-surface-card hover:bg-surface-border text-xs font-bold text-slate-200 border border-surface-border flex items-center space-x-1.5 transition"
                    >
                      <span>Full Pipeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Batch Counter */}
                  <div className="p-4 rounded-2xl bg-surface/70 border border-surface-border">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                      <Package className="w-3.5 h-3.5 text-accent-blue" />
                      <span>Batch Progress</span>
                    </div>
                    <div className="text-xl font-black text-white font-mono">
                      Batch {Math.min(job.totalBatches || 1, (job.completedBatches || 0) + 1)}{' '}
                      <span className="text-slate-400 text-sm font-normal">of {job.totalBatches || 1}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {job.completedBatches || 0} delivered • {Math.max(0, (job.totalBatches || 1) - (job.completedBatches || 0))} remaining
                      {job.chunkAmount ? ` • ₦LL ${formatBillions(job.chunkAmount)} / ${job.transferCooldownSeconds || 70}s` : ''}
                    </p>
                  </div>

                  {/* Amount Delivered */}
                  <div className="p-4 rounded-2xl bg-surface/70 border border-surface-border">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                      <Coins className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Delivered Game Cash</span>
                    </div>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      ₦LL {formatBillions(job.deliveredAmount || '0')}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Target total: ₦LL {formatBillions(job.currencyAmount)} ({job.progressPercent}%)
                    </p>
                  </div>

                  {/* 70s Cooldown Countdown Timer */}
                  <div className="p-4 rounded-2xl bg-surface/70 border border-surface-border">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>70s Cooldown Delay Timer</span>
                    </div>
                    {nextSecs > 0 ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-black text-amber-400 font-mono animate-pulse">
                          {nextSecs}s
                        </span>
                        <span className="text-xs text-slate-300 font-mono">until next transfer</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-sm font-black text-emerald-300 font-mono">
                          DISPATCHING CHUNK IN-GAME...
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Enforcing strict 70s anti-spam server floor
                    </p>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div>
                  <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                    <span className="text-slate-300 font-semibold">Delivery Completion</span>
                    <span className="text-primary font-bold">{job.progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-500 relative"
                      style={{ width: `${Math.max(5, job.progressPercent)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Batch History Mini-Chips */}
                {job.batchHistory && job.batchHistory.length > 0 && (
                  <div className="pt-2 border-t border-surface-border/60">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 mr-2">
                      Delivered Batch Receipts:
                    </span>
                    <div className="inline-flex flex-wrap gap-2 mt-1">
                      {job.batchHistory.map((b: any) => (
                        <span
                          key={b.batchNumber}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Batch #{b.batchNumber}: ₦LL {formatBillions(b.amount)} (TX: {b.txId})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Standby Fulfillment Engine Banner */
        <div className="p-4 rounded-2xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="text-white font-bold">Automated Fulfillment Engine: </span>
              <span className="text-emerald-400 font-mono font-bold">ACTIVE & READY</span>
              <span className="text-slate-400 ml-2">
                (Rule: ≤100B Instant Single Transfer • &gt;100B Sent 100B per 70s Cooldown)
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('fulfillment-settings')}
            className="text-[11px] font-mono text-primary hover:text-white transition flex items-center space-x-1 shrink-0"
          >
            <span>Fulfillment Rules</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Revenue */}
        <div className="p-5 rounded-3xl bg-surface border border-surface-border">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Cleared Revenue</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₦{(kpi.totalSalesRevenue || 0).toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-emerald-400 flex items-center space-x-1">
            <ArrowUpRight className="w-3 h-3" />
            <span>100% Cleared Bank Credits</span>
          </div>
        </div>

        {/* Currency Delivered */}
        <div className="p-5 rounded-3xl bg-surface border border-surface-border">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Game Cash Delivered</span>
            <Coins className="w-4 h-4 text-accent-gold" />
          </div>
          <div className="text-2xl font-black text-accent-gold font-mono">
            {formatBillions(kpi.totalCashDelivered || '0')}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">Delivered from owner character account</p>
        </div>

        {/* Pending Verification Queue */}
        <div
          onClick={() => onNavigate('payments')}
          className="p-5 rounded-3xl bg-surface hover:bg-surface-hover border border-surface-border cursor-pointer transition"
        >
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Payments to Verify</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {kpi.pendingReview || 0}
          </div>
          <p className="mt-2 text-[10px] text-amber-300 font-medium">Click to open bank verification queue $\rightarrow$</p>
        </div>

        {/* Completed Orders */}
        <div
          onClick={() => onNavigate('orders')}
          className="p-5 rounded-3xl bg-surface hover:bg-surface-hover border border-surface-border cursor-pointer transition"
        >
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Completed Orders</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary font-mono">
            {kpi.completed || orders.filter((o: any) => o.status === 'COMPLETED').length || 0}
          </div>
          <p className="mt-2 text-[10px] text-primary/80 font-medium">Click to view all fulfilled orders &rarr;</p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-surface via-surface-hover to-surface border border-surface-border">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>Quick Operational Controls</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('payments')}
            className="p-3 rounded-2xl bg-background/80 hover:bg-primary hover:text-black border border-surface-border text-left transition group"
          >
            <CreditCard className="w-4 h-4 text-amber-400 group-hover:text-black mb-1" />
            <div className="font-bold text-xs text-white group-hover:text-black">Verify Payments</div>
            <div className="text-[10px] text-slate-400 group-hover:text-black/80">{kpi.pendingReview || 0} pending</div>
          </button>

          <button
            onClick={() => onNavigate('orders')}
            className="p-3 rounded-2xl bg-background/80 hover:bg-primary hover:text-black border border-surface-border text-left transition group"
          >
            <Package className="w-4 h-4 text-blue-400 group-hover:text-black mb-1" />
            <div className="font-bold text-xs text-white group-hover:text-black">All Orders</div>
            <div className="text-[10px] text-slate-400 group-hover:text-black/80">{orders.length} total orders</div>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="p-3 rounded-2xl bg-background/80 hover:bg-primary hover:text-black border border-surface-border text-left transition group"
          >
            <Coins className="w-4 h-4 text-accent-gold group-hover:text-black mb-1" />
            <div className="font-bold text-xs text-white group-hover:text-black">Adjust Inventory</div>
            <div className="text-[10px] text-slate-400 group-hover:text-black/80">Audit & reconcile</div>
          </button>

          <button
            onClick={() => onNavigate('banking')}
            className="p-3 rounded-2xl bg-background/80 hover:bg-primary hover:text-black border border-surface-border text-left transition group"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:text-black mb-1" />
            <div className="font-bold text-xs text-white group-hover:text-black">Bank Settings</div>
            <div className="text-[10px] text-slate-400 group-hover:text-black/80">Checkout account</div>
          </button>
        </div>
      </div>

      {/* Revenue Trend Visualizer */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border shadow-xl">
        <div className="flex justify-between items-baseline mb-6">
          <div>
            <h3 className="font-bold text-white text-base">Weekly Sales & Fulfillment Activity</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real verified NGN volume vs In-Game Billions transferred</p>
          </div>
          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
            Weekly Cleared: ₦{(
              analytics?.weeklyCleared ??
              (analytics?.revenueTrend || []).reduce((acc: number, item: any) => acc + (Number(item?.revenue) || 0), 0)
            ).toLocaleString()}
          </span>
        </div>

        {/* Simplified High-Performance CSS Bar Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 h-44 items-end pt-4 border-b border-surface-border px-2">
          {(() => {
            const trend = analytics?.revenueTrend || [];
            const maxRev = Math.max(1, ...trend.map((t: any) => Number(t?.revenue) || 0));
            return trend.map((item: any, idx: number) => {
              const rev = Number(item?.revenue) || 0;
              const heightPercent = rev > 0 ? Math.min(100, Math.max(15, (rev / maxRev) * 100)) : 8;
              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition">
                    ₦{rev >= 1000 ? `${(rev / 1000).toFixed(0)}k` : rev.toLocaleString()}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[42px] rounded-t-xl group-hover:brightness-110 transition cursor-pointer relative ${
                      rev > 0 ? 'bg-gradient-to-t from-primary/80 to-primary' : 'bg-surface-border/50'
                    }`}
                  />
                  <span className="text-[11px] font-mono text-slate-400 mt-2">{item.day}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
          <h3 className="font-bold text-white text-sm">Recent Customer Orders</h3>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-primary hover:underline"
          >
            View All Orders $\rightarrow$
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">No orders recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4 font-bold">Order #</th>
                  <th className="py-3 px-4 font-bold">Customer Handle</th>
                  <th className="py-3 px-4 font-bold">Cash Amount</th>
                  <th className="py-3 px-4 font-bold">NGN Price</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-sans">
                {recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-surface-hover/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-white">#{order.orderNumber}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">@{order.gameUsername}</td>
                    <td className="py-3 px-4 font-mono text-primary font-bold">{order.formattedGameAmount}</td>
                    <td className="py-3 px-4 font-mono text-white font-bold">₦{order.totalNairaAmount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-surface-border text-slate-300">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="p-1.5 rounded-lg bg-surface-border hover:bg-primary hover:text-black transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
