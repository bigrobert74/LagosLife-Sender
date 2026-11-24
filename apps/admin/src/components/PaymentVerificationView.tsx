import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  ShieldCheck,
  AlertCircle,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface PaymentVerificationViewProps {
  orders: any[];
  onVerifyPayment: (orderNumber: string, data: { confirmedAmount: number; bankStatementReference: string; adminNotes?: string }) => void;
  onRejectPayment: (orderNumber: string, data: { rejectionReason: string; adminNotes: string }) => void;
  onViewOrder: (order: any) => void;
}

export const PaymentVerificationView: React.FC<PaymentVerificationViewProps> = ({
  orders,
  onVerifyPayment,
  onRejectPayment,
  onViewOrder,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [confirmedAmount, setConfirmedAmount] = useState<number>(1000);
  const [bankRef, setBankRef] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('NO_FUNDS_RECEIVED');
  const [confirmedStatementChecked, setConfirmedStatementChecked] = useState<boolean>(false);

  // Filter orders that have submitted payments
  const pendingOrders = orders.filter(
    (o) => o.status === 'PAYMENT_UNDER_REVIEW' || o.status === 'PENDING_PAYMENT',
  );

  const handleOpenApprove = (order: any) => {
    setSelectedOrder(order);
    setConfirmedAmount(order.totalNairaAmount);
    setBankRef(`STMT-${new Date().toISOString().slice(5, 10).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`);
    setAdminNotes(`Verified credit in official mobile bank statement under ${order.submittedPayment?.senderAccountName || order.gameUsername}`);
    setConfirmedStatementChecked(false);
    setActionType('APPROVE');
  };

  const handleOpenReject = (order: any) => {
    setSelectedOrder(order);
    setRejectionReason('NO_FUNDS_RECEIVED');
    setAdminNotes('Account statement checked. No incoming credit matching amount or sender found.');
    setActionType('REJECT');
  };

  const executeApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmedStatementChecked) {
      alert('You must confirm that you independently verified the bank credit in the business banking application.');
      return;
    }
    if (!selectedOrder) return;

    onVerifyPayment(selectedOrder.orderNumber, {
      confirmedAmount,
      bankStatementReference: bankRef,
      adminNotes,
    });
    setActionType(null);
    setSelectedOrder(null);
  };

  const executeRejection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    onRejectPayment(selectedOrder.orderNumber, {
      rejectionReason,
      adminNotes,
    });
    setActionType(null);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Instruction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-surface-border">
        <div>
          <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>PAYMENT RECONCILIATION CENTRE</span>
          </div>
          <h2 className="text-2xl font-black text-white">Manual Bank Payment Verification</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            There is no automated payment gateway. Review incoming commercial bank transfers independently against your official mobile banking app or online statement before approving orders.
          </p>
        </div>

        <div className="px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-mono flex items-center space-x-2 shrink-0">
          <Clock className="w-4 h-4 text-accent-gold" />
          <span>{pendingOrders.length} Submissions Awaiting Review</span>
        </div>
      </div>

      {/* Verification Queue Table */}
      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
          <h3 className="font-bold text-white text-sm">Customer Payment Submissions</h3>
          <span className="text-xs text-slate-400 font-mono">Showing {pendingOrders.length} pending records</span>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2 opacity-80" />
            <p className="font-bold text-white">All Clear!</p>
            <p className="mt-1">All customer payments have been reconciled and verified.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Order #</th>
                  <th className="py-3.5 px-4 font-bold">Lagos Life Handle</th>
                  <th className="py-3.5 px-4 font-bold">Expected Amount</th>
                  <th className="py-3.5 px-4 font-bold">Sender Account Name</th>
                  <th className="py-3.5 px-4 font-bold">Customer Bank Ref</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                  <th className="py-3.5 px-4 font-bold text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-sans">
                {pendingOrders.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-surface-hover/60 transition">
                    <td className="py-4 px-4 font-mono font-bold text-white">
                      #{order.orderNumber}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-200 font-mono">@{order.gameUsername}</div>
                      <div className="text-[11px] text-slate-400">{order.formattedGameAmount}</div>
                    </td>
                    <td className="py-4 px-4 font-mono font-extrabold text-primary text-sm">
                      ₦{order.totalNairaAmount.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-white uppercase font-mono">
                        {order.submittedPayment?.senderAccountName || 'NOT SUBMITTED'}
                      </div>
                      <div className="text-[10px] text-slate-400">{order.submittedPayment?.senderBankName || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-300 truncate max-w-xs">
                      {order.submittedPayment?.transactionReference || 'N/A'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onViewOrder(order)}
                          className="p-2 rounded-xl bg-surface-border/60 hover:bg-surface-border text-slate-300 hover:text-white transition"
                          title="View Dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenReject(order)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-bold text-xs transition"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleOpenApprove(order)}
                          className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider transition shadow-md shadow-primary/20 flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVE PAYMENT CONFIRMATION MODAL */}
      {actionType === 'APPROVE' && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface border-2 border-primary/50 p-4 sm:p-8 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setActionType(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>CONFIRM BANK CREDIT & APPROVE ORDER</span>
            </div>
            <h3 className="text-xl font-black text-white">
              Approve Payment for #{selectedOrder.orderNumber}
            </h3>

            <div className="mt-4 p-4 rounded-2xl bg-background border border-surface-border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer Character:</span>
                <span className="font-bold text-white font-mono">@{selectedOrder.gameUsername}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cash Ordered:</span>
                <span className="font-extrabold text-primary font-mono">{selectedOrder.formattedGameAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sender Account Name:</span>
                <span className="font-bold text-emerald-400 font-mono uppercase">
                  {selectedOrder.submittedPayment?.senderAccountName || 'Manual Match'}
                </span>
              </div>
              <div className="flex justify-between border-t border-surface-border pt-2">
                <span className="text-slate-400">Expected Naira Amount:</span>
                <span className="font-black text-white font-mono">₦{selectedOrder.totalNairaAmount.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={executeApproval} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Confirmed Bank Amount (₦)
                </label>
                <input
                  type="number"
                  required
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Bank Statement Reference / Session ID
                </label>
                <input
                  type="text"
                  required
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Verification Audit Notes
                </label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Strict Independent Verification Checkbox */}
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="bank-check-guard"
                  checked={confirmedStatementChecked}
                  onChange={(e) => setConfirmedStatementChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <label htmlFor="bank-check-guard" className="text-xs text-slate-200 cursor-pointer select-none">
                  <strong className="text-primary font-bold">I independently checked the actual bank credit:</strong>{' '}
                  I confirm that funds have cleared in our physical commercial bank statement/app. Approving will immediately mark this order as approved and send the cash to the customer.
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="w-1/3 py-3 rounded-xl border border-surface-border bg-surface text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold uppercase tracking-wider flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-md shadow-primary/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>APPROVE PAYMENT & DELIVER CASH</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT PAYMENT MODAL */}
      {actionType === 'REJECT' && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-red-500/40 p-4 sm:p-8 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setActionType(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>REJECT PAYMENT SUBMISSION</span>
            </div>
            <h3 className="text-xl font-black text-white">
              Reject Order #{selectedOrder.orderNumber}
            </h3>

            <form onSubmit={executeRejection} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Rejection Reason Code
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm focus:outline-none focus:border-red-400"
                >
                  <option value="NO_FUNDS_RECEIVED">No matching funds received on bank statement</option>
                  <option value="AMOUNT_MISMATCH">Transferred amount is less than order total</option>
                  <option value="UNREADABLE_RECEIPT">Uploaded screenshot is invalid or illegible</option>
                  <option value="SENDER_MISMATCH">Sender name does not match transaction statement</option>
                  <option value="DUPLICATE_REFERENCE">Transaction reference was already used for another order</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Explanatory Notes (Shared with Customer)
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionType(null)}
                  className="w-1/3 py-3 rounded-xl border border-surface-border bg-surface text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold uppercase tracking-wider transition active:scale-95 shadow-md shadow-red-500/20"
                >
                  CONFIRM REJECTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
