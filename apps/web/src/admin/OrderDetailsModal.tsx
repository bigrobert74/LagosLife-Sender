import React from 'react';
import {
  X,
  User,
  Package,
  CreditCard,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onVerifyPayment?: (orderNumber: string) => void;
  onStartDelivery?: (orderNumber: string) => void;
  onCompleteDelivery?: (orderNumber: string) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onVerifyPayment,
  onStartDelivery,
  onCompleteDelivery,
}) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl bg-surface border border-surface-border p-4 sm:p-6 sm:p-8 shadow-2xl text-left overflow-y-auto max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
          <FileText className="w-4 h-4" />
          <span>ORDER DOSSIER & AUDIT RECORD</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div className="flex items-center space-x-3">
            <h3 className="text-2xl font-black text-white font-mono">
              #{order.orderNumber}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase font-mono ${
                order.status === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : order.status === 'PAYMENT_UNDER_REVIEW'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : order.status === 'WAITING_FOR_DELIVERY' || order.status === 'DELIVERY_PROCESSING'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <span className="text-xs text-slate-400">Created: {new Date(order.createdAt).toLocaleString()}</span>
        </div>

        {/* Section Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Customer & Character */}
          <div className="p-4 rounded-2xl bg-background border border-surface-border space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-2">
              <User className="w-4 h-4 text-primary" />
              <span>Customer Character</span>
            </div>
            <div>
              <span className="text-slate-400">Lagos Life Handle:</span>
              <div className="text-base font-extrabold text-white font-mono">
                @{order.gameUsername}
              </div>
            </div>
            <div>
              <span className="text-slate-400">Contact:</span>
              <div className="text-slate-200">{order.customerEmail || 'No email provided'} • {order.customerPhone || 'No phone'}</div>
            </div>
          </div>

          {/* Purchased Virtual Currency */}
          <div className="p-4 rounded-2xl bg-background border border-surface-border space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 font-bold uppercase tracking-wider text-[11px] mb-2">
              <Package className="w-4 h-4 text-accent-gold" />
              <span>Currency Package</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-slate-400">In-Game Cash:</span>
              <span className="text-lg font-black text-primary font-mono">{order.formattedGameAmount}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-surface-border">
              <span className="text-slate-400">Payable NGN Amount:</span>
              <span className="text-xl font-black text-white font-mono">₦{order.totalNairaAmount?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Reconciliation Box */}
        <div className="mt-4 p-5 rounded-2xl bg-surface-hover/80 border border-surface-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-slate-300 font-bold uppercase tracking-wider text-xs">
              <CreditCard className="w-4 h-4 text-accent-blue" />
              <span>Bank Transfer Reconciliation</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Manual Direct Bank Transfer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-background p-3.5 rounded-xl border border-surface-border mb-3">
            <div>
              <span className="text-slate-400">Recipient Bank:</span>
              <div className="font-bold text-slate-200">{order.bankNameSnapshot}</div>
              <div className="font-mono text-primary">{order.accountNumberSnapshot}</div>
            </div>
            <div>
              <span className="text-slate-400">Sender Account Name:</span>
              <div className="font-bold text-white font-mono uppercase">
                {order.submittedPayment?.senderAccountName || 'NOT YET SUBMITTED'}
              </div>
              <div className="text-slate-400">{order.submittedPayment?.senderBankName || 'N/A'}</div>
            </div>
            <div>
              <span className="text-slate-400">Bank Reference:</span>
              <div className="font-mono text-slate-200 truncate">
                {order.submittedPayment?.transactionReference || 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Submitted: {order.submittedPayment?.submittedAt ? new Date(order.submittedPayment.submittedAt).toLocaleTimeString() : 'Pending'}
              </div>
            </div>
          </div>

          {/* Action Row for Payment Verification */}
          {order.status === 'PAYMENT_UNDER_REVIEW' && onVerifyPayment && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onVerifyPayment(order.orderNumber)}
                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md shadow-primary/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>APPROVE PAYMENT (BANK CREDIT VERIFIED)</span>
              </button>
            </div>
          )}
        </div>

        {/* In-Game Delivery Record Box */}
        {order.deliveryRecord && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold uppercase tracking-wider mb-2">
              <Truck className="w-4 h-4" />
              <span>In-Game Delivery Fulfillment Record</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-400">Game Transfer Reference:</span>
                <div className="font-mono font-bold text-white">{order.deliveryRecord.inGameTransactionRef}</div>
              </div>
              <div>
                <span className="text-slate-400">Delivered At:</span>
                <div>{new Date(order.deliveryRecord.deliveredAt).toLocaleString()}</div>
              </div>
            </div>
            {order.deliveryRecord.adminNotes && (
              <div className="mt-2 text-[11px] text-emerald-300 border-t border-emerald-500/20 pt-1.5">
                <strong>Admin Notes:</strong> {order.deliveryRecord.adminNotes}
              </div>
            )}
          </div>
        )}

        {/* Fulfillment action button if waiting for delivery */}
        {(order.status === 'WAITING_FOR_DELIVERY' || order.status === 'DELIVERY_PROCESSING') && onCompleteDelivery && (
          <div className="mt-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <div className="text-xs text-blue-300 font-bold mb-3">
              This order has been verified and is ready for manual in-game cash transfer from the owner account.
            </div>
            <button
              onClick={() => onCompleteDelivery(order.orderNumber)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-500/20"
            >
              <Truck className="w-4 h-4" />
              <span>EXECUTE & CONFIRM IN-GAME CASH TRANSFER</span>
            </button>
          </div>
        )}

        {/* Chronological Timeline */}
        <div className="mt-6 pt-5 border-t border-surface-border">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Audit Chronology</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-3 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-mono text-slate-300">Order #{order.orderNumber} initialized</span>
              <span className="text-[10px] text-slate-500 ml-auto">{new Date(order.createdAt).toLocaleTimeString()}</span>
            </div>
            {order.submittedPayment && (
              <div className="flex items-center space-x-3 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-mono text-slate-300">Customer submitted transfer details ({order.submittedPayment.senderAccountName})</span>
                <span className="text-[10px] text-slate-500 ml-auto">{new Date(order.submittedPayment.submittedAt).toLocaleTimeString()}</span>
              </div>
            )}
            {order.deliveryRecord && (
              <div className="flex items-center space-x-3 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-mono text-slate-300">In-game cash delivery fulfilled ({order.deliveryRecord.inGameTransactionRef})</span>
                <span className="text-[10px] text-slate-500 ml-auto">{new Date(order.deliveryRecord.deliveredAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
