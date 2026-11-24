import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Check,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
  onOpenSupport: () => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber,
  onOpenSupport,
}) => {
  const [query, setQuery] = useState<string>(initialOrderNumber || '');
  const [order, setOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hoisted function declaration prevents any temporal dead zone initialization errors
  async function fetchOrderDetails(orderNum: string) {
    const cleanNum = (orderNum || '').trim().toUpperCase();
    if (!cleanNum) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`http://localhost:3000/api/v1/orders/${encodeURIComponent(cleanNum)}`);
      if (res.ok) {
        const json = await res.json();
        setOrder(json?.data || null);
      } else {
        setOrder(null);
        setErrorMessage('Order not found. Please double-check your order number.');
      }
    } catch (err) {
      console.warn('API error during order fetch:', err);
      setErrorMessage('Unable to connect to order server. Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && initialOrderNumber) {
      setQuery(initialOrderNumber);
      fetchOrderDetails(initialOrderNumber);
    }
  }, [isOpen, initialOrderNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrderDetails(query);
  };

  const getStatusExplanation = (status: string) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return 'Awaiting your Nigerian bank transfer to our business account.';
      case 'PAYMENT_UNDER_REVIEW':
        return "We're checking your transfer against our official bank statement.";
      case 'COMPLETED':
      case 'PAYMENT_VERIFIED':
      case 'WAITING_FOR_DELIVERY':
      case 'DELIVERY_PROCESSING':
        return 'Your payment has been approved and your cash delivered in-game.';
      case 'PAYMENT_REJECTED':
        return 'Payment could not be verified on our bank statement. Please contact support.';
      case 'CANCELLED':
        return 'This order has been cancelled.';
      default:
        return 'Your order is being processed.';
    }
  };

  const getTimelineSteps = (status: string) => {
    const isCompleted =
      status === 'COMPLETED' ||
      status === 'DELIVERY_PROCESSING' ||
      status === 'WAITING_FOR_DELIVERY' ||
      status === 'PAYMENT_VERIFIED';
    const isReviewStage = status === 'PAYMENT_UNDER_REVIEW' || isCompleted;

    return [
      {
        label: 'Order Placed',
        active: true,
        completed: true,
      },
      {
        label: 'Payment Verification',
        active: status === 'PAYMENT_UNDER_REVIEW',
        completed: isCompleted,
      },
      {
        label: 'Approved & Delivered',
        active: isCompleted,
        completed: isCompleted,
      },
    ];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <Search className="w-4 h-4" />
          <span>ORDER LOOKUP</span>
        </div>
        <h3 className="text-xl font-bold text-white tracking-tight">Track Your Order</h3>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. LL-477526"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-400 font-mono uppercase"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Track</span>}
          </button>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Order Details & Progress */}
        {order && (
          <div className="mt-6 space-y-5">
            {/* Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400">ORDER NUMBER</span>
                  <div className="font-mono font-bold text-white text-base">#{order.orderNumber}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">STATUS</span>
                  <div className="font-mono font-bold text-emerald-400 text-xs">
                    {order.status.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400">Recipient:</span>
                  <div className="font-mono font-bold text-white mt-0.5">@{order.gameUsername}</div>
                </div>
                <div>
                  <span className="text-slate-400">Cash Amount:</span>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">
                    {order.formattedGameAmount || `${Number(order.totalGameCurrency) / 1000000000} Billion`}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-xs flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-mono font-bold text-white">
                  ₦{order.totalNairaAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status Explanation */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-white">Current Status: </span>
              {getStatusExplanation(order.status)}
            </div>

            {/* Timeline */}
            <div className="space-y-3 pt-2">
              <div className="text-xs uppercase font-semibold text-slate-400">Progress Timeline</div>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {getTimelineSteps(order.status).map((step, idx) => (
                  <div key={idx} className="relative flex items-center space-x-3 text-xs">
                    <div
                      className={`absolute -left-6 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        step.completed
                          ? 'bg-emerald-500 text-slate-950'
                          : step.active
                          ? 'border-2 border-emerald-400 bg-slate-900 text-emerald-400'
                          : 'border border-slate-700 bg-slate-900 text-slate-500'
                      }`}
                    >
                      {step.completed ? <Check className="w-2.5 h-2.5" /> : null}
                    </div>
                    <span
                      className={`font-medium ${
                        step.completed
                          ? 'text-white'
                          : step.active
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Link */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenSupport}
                className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Need help with this order? Contact Support</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
