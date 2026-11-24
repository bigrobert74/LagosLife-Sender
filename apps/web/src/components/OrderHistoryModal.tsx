import React, { useState, useEffect } from 'react';
import { X, History, ExternalLink, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export interface SavedCustomerOrder {
  orderNumber: string;
  gameUsername: string;
  formattedAmount: string;
  totalNaira: number;
  status: string;
  createdAt: string;
}

interface OrderHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (orderNumber: string) => void;
}

export const OrderHistoryModal: React.FC<OrderHistoryModalProps> = ({
  isOpen,
  onClose,
  onTrackOrder,
}) => {
  const [orders, setOrders] = useState<SavedCustomerOrder[]>([]);

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem('lagos_life_customer_orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
          }
        }
      } catch (err) {
        console.warn('Could not read order history from localStorage', err);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left max-h-[88vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <History className="w-4 h-4" />
          <span>LOCAL ORDER RECORD</span>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">Your Order History</h3>
        <p className="mt-1 text-xs text-slate-400">
          Orders saved on this device. Click any order to check its live delivery status.
        </p>

        <div className="mt-5 overflow-y-auto pr-1 space-y-3 flex-1">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-slate-400">No Orders Placed Yet</p>
              <p className="mt-1">When you place an order, it will appear here for easy tracking.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.orderNumber}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-white text-sm">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      @{order.gameUsername}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    <span className="text-emerald-400 font-semibold">{order.formattedAmount || 'Lagos Life Cash'}</span> • ₦
                    {Number(order.totalNaira || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onTrackOrder(order.orderNumber);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center space-x-1 transition shrink-0"
                >
                  <span>Track</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
