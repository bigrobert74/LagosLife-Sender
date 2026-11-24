import React from 'react';
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

        {/* Awaiting Delivery */}
        <div
          onClick={() => onNavigate('delivery')}
          className="p-5 rounded-3xl bg-surface hover:bg-surface-hover border border-surface-border cursor-pointer transition"
        >
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Waiting for In-Game Delivery</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {kpi.waitingDelivery || 0}
          </div>
          <p className="mt-2 text-[10px] text-blue-300 font-medium">Click to open fulfillment workspace $\rightarrow$</p>
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
            onClick={() => onNavigate('delivery')}
            className="p-3 rounded-2xl bg-background/80 hover:bg-primary hover:text-black border border-surface-border text-left transition group"
          >
            <Truck className="w-4 h-4 text-blue-400 group-hover:text-black mb-1" />
            <div className="font-bold text-xs text-white group-hover:text-black">Process Deliveries</div>
            <div className="text-[10px] text-slate-400 group-hover:text-black/80">{kpi.waitingDelivery || 0} orders</div>
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
            Weekly Cleared: ₦236,000
          </span>
        </div>

        {/* Simplified High-Performance CSS Bar Chart */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 h-44 items-end pt-4 border-b border-surface-border px-2">
          {(analytics?.revenueTrend || []).map((item: any, idx: number) => {
            const heightPercent = Math.min(100, Math.max(15, (item.revenue / 60000) * 100));
            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] font-mono text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition">
                  ₦{(item.revenue / 1000).toFixed(0)}k
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full max-w-[42px] bg-gradient-to-t from-primary/80 to-primary rounded-t-xl group-hover:brightness-110 transition cursor-pointer relative"
                />
                <span className="text-[11px] font-mono text-slate-400 mt-2">{item.day}</span>
              </div>
            );
          })}
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
