import React, { useState } from 'react';
import {
  Package,
  Search,
  Filter,
  Eye,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  XCircle,
} from 'lucide-react';

interface OrdersManagementViewProps {
  orders: any[];
  onViewOrder: (order: any) => void;
  onCancelOrder: (orderNumber: string, reason: string) => void;
}

export const OrdersManagementView: React.FC<OrdersManagementViewProps> = ({
  orders,
  onViewOrder,
  onCancelOrder,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.orderNumber.toLowerCase().includes(q) ||
      o.gameUsername.toLowerCase().includes(q) ||
      o.submittedPayment?.senderAccountName?.toLowerCase().includes(q) ||
      o.submittedPayment?.transactionReference?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'PAYMENT_UNDER_REVIEW':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse';
      case 'WAITING_FOR_DELIVERY':
      case 'DELIVERY_PROCESSING':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
      case 'PAYMENT_REJECTED':
      case 'DELIVERY_FAILED':
        return 'bg-red-500/20 text-red-400 border border-red-500/40';
      case 'PENDING_PAYMENT':
        return 'bg-slate-700/60 text-slate-300 border border-slate-600';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-surface-border">
        <div>
          <h2 className="text-2xl font-black text-white">All Customer Orders</h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete transaction ledger of Lagos Life money purchases, payment reviews, and fulfillments.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-background border border-surface-border text-primary font-bold">
            Total Orders: {orders.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-surface-border flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search order #, handle, sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-primary font-mono"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-primary font-mono"
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            <option value="PAYMENT_UNDER_REVIEW">Payment Under Review</option>
            <option value="WAITING_FOR_DELIVERY">Waiting for Delivery</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING_PAYMENT">Pending Payment</option>
            <option value="PAYMENT_REJECTED">Payment Rejected</option>
            <option value="DELIVERY_FAILED">Delivery Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            No orders match the current search and status filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Order #</th>
                  <th className="py-3.5 px-4 font-bold">Lagos Life Handle</th>
                  <th className="py-3.5 px-4 font-bold">Cash Pack</th>
                  <th className="py-3.5 px-4 font-bold">Amount (NGN)</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold">Date Created</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-sans">
                {filteredOrders.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-surface-hover/60 transition">
                    <td className="py-4 px-4 font-mono font-bold text-white">
                      #{order.orderNumber}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-200">
                      @{order.gameUsername}
                    </td>
                    <td className="py-4 px-4 font-mono text-primary font-bold">
                      {order.formattedGameAmount}
                    </td>
                    <td className="py-4 px-4 font-mono text-white font-extrabold text-sm">
                      ₦{order.totalNairaAmount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono ${getStatusBadge(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="px-3 py-1.5 rounded-xl bg-surface-border/70 hover:bg-primary hover:text-black text-slate-200 font-bold text-xs transition inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
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
