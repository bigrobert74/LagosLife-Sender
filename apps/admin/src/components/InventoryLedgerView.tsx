import React, { useState } from 'react';
import {
  Coins,
  History,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

interface InventoryLedgerViewProps {
  inventory: {
    recordedAvailableBalance: string;
    reservedBalance: string;
    lifetimeDeliveredBalance: string;
    freeBalance: string;
    threshold: string;
    isLowStock: boolean;
    ownerAccount: any;
  };
  ledger: any[];
  onAdjustBalance: (data: { type: 'INCREASE' | 'DECREASE'; amount: string; reason: string }) => void;
  onReconcile: (data: { currentPhysicalGameBalance: string; notes?: string }) => void;
}

export const InventoryLedgerView: React.FC<InventoryLedgerViewProps> = ({
  inventory,
  ledger,
  onAdjustBalance,
  onReconcile,
}) => {
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [adjustType, setAdjustType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [billionsToAdjust, setBillionsToAdjust] = useState<number>(500);
  const [adjustReason, setAdjustReason] = useState<string>('Owner deposited cash into game character');
  const [physicalBalanceBillions, setPhysicalBalanceBillions] = useState<number>(5000);
  const [reconcileNotes, setReconcileNotes] = useState<string>('Periodic physical character audit in Lagos Life phone banking app');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleSyncLive = async () => {
    setIsSyncing(true);
    try {
      await fetch('http://localhost:3000/api/v1/admin/owner-account/sync-balance', {
        method: 'POST',
      });
    } catch (e) {
      console.warn('Could not sync live balance:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cashUnits = `${billionsToAdjust}000000000`;
    onAdjustBalance({
      type: adjustType,
      amount: cashUnits,
      reason: adjustReason,
    });
    setShowAdjustModal(false);
  };

  const handleReconcileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const physicalCashUnits = `${physicalBalanceBillions}000000000`;
    onReconcile({
      currentPhysicalGameBalance: physicalCashUnits,
      notes: reconcileNotes,
    });
    setShowReconcileModal(false);
  };

  const formatBillions = (raw: string) => {
    const val = Number(raw) / 1000000000;
    if (val >= 1000) return `${(val / 1000).toFixed(2)} Trillion`;
    return `${val.toFixed(1)} Billion`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-surface border border-surface-border">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Recorded Available</span>
            <Coins className="w-4 h-4 text-accent-gold" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatBillions(inventory.recordedAvailableBalance)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Total verified balance in owner account</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface border border-surface-border">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Reserved for Orders</span>
            <RotateCcw className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {formatBillions(inventory.reservedBalance)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Committed to approved orders awaiting delivery</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface border border-surface-border">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Free Uncommitted</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary font-mono">
            {formatBillions(inventory.freeBalance)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Immediately available for new customer orders</p>
        </div>

        <div className="p-5 rounded-3xl bg-surface border border-surface-border">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">Lifetime Delivered</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatBillions(inventory.lifetimeDeliveredBalance)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Cumulative cash successfully sent to players</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 rounded-2xl bg-surface border border-surface-border">
        <div>
          <h3 className="font-bold text-white text-sm">Owner Inventory Control</h3>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Character: <strong className="text-white font-mono">@{inventory.ownerAccount?.gameUsername}</strong></span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px]">
              {inventory.ownerAccount?.status || 'ACTIVE_ONLINE'}
            </span>
            {inventory.ownerAccount?.characterStats && (
              <>
                <span>•</span>
                <span className="text-slate-300">
                  {inventory.ownerAccount.characterStats.rank} (Lv {inventory.ownerAccount.characterStats.level})
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSyncLive}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
            title="Poll live balance directly from Lagos Life game server"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Live Balance'}</span>
          </button>

          <button
            onClick={() => setShowReconcileModal(true)}
            className="px-4 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-hover text-slate-200 text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Reconcile Physical Game Balance</span>
          </button>

          <button
            onClick={() => setShowAdjustModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-extrabold uppercase tracking-wider flex items-center space-x-1.5 transition shadow-md shadow-primary/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Adjust Inventory Balance</span>
          </button>
        </div>
      </div>

      {/* Auditable Transaction Ledger Table */}
      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <History className="w-4 h-4 text-primary" />
            <span>Auditable Double-Entry Currency Ledger</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Total {ledger.length} ledger entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
              <tr>
                <th className="py-3.5 px-4 font-bold">Timestamp</th>
                <th className="py-3.5 px-4 font-bold">Transaction Type</th>
                <th className="py-3.5 px-4 font-bold">Amount</th>
                <th className="py-3.5 px-4 font-bold">Balance After</th>
                <th className="py-3.5 px-4 font-bold">Related Order</th>
                <th className="py-3.5 px-4 font-bold">Admin</th>
                <th className="py-3.5 px-4 font-bold">Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-sans">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-hover/60 transition">
                  <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                        entry.type === 'ORDER_DELIVERED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : entry.type === 'ORDER_RESERVED'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          : entry.type === 'MANUAL_DEPOSIT' || entry.type === 'OPENING_BALANCE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {entry.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {entry.formattedAmount || `${(Number(entry.amount) / 1000000000).toFixed(1)}B`}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-primary font-bold">
                    {formatBillions(entry.balanceAfter)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {entry.relatedOrderId ? `#${entry.relatedOrderId}` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {entry.adminUsername}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-[11px] max-w-sm">
                    {entry.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST BALANCE MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-surface-border p-4 sm:p-8 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowAdjustModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-black text-white">Manual Balance Adjustment</h3>
            <p className="text-xs text-slate-400 mt-1">Record a manual deposit or withdrawal from the owner character account.</p>

            <form onSubmit={handleAdjustSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('INCREASE')}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition ${
                      adjustType === 'INCREASE'
                        ? 'bg-primary text-black font-extrabold'
                        : 'bg-background border border-surface-border text-slate-400'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Deposit / Increase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DECREASE')}
                    className={`py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition ${
                      adjustType === 'DECREASE'
                        ? 'bg-red-500 text-white font-extrabold'
                        : 'bg-background border border-surface-border text-slate-400'
                    }`}
                  >
                    <MinusCircle className="w-4 h-4" />
                    <span>Correction / Decrease</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Amount in Billions
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10000"
                  value={billionsToAdjust}
                  onChange={(e) => setBillionsToAdjust(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Audit Reason (Mandatory)
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-surface-border bg-surface text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold uppercase tracking-wider transition active:scale-95 shadow-md shadow-primary/20"
                >
                  SAVE ADJUSTMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE PHYSICAL GAME BALANCE MODAL */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-surface-border p-4 sm:p-8 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowReconcileModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white"
            >
              <XCircle className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>PHYSICAL IN-GAME AUDIT</span>
            </div>
            <h3 className="text-xl font-black text-white">Reconcile In-Game Account</h3>
            <p className="text-xs text-slate-400 mt-1">
              Open Lagos Life on your fulfillment phone, check the banking app on connected character <strong>@{inventory?.ownerAccount?.gameUsername || 'connected account'}</strong>, and enter the exact displayed balance.
            </p>

            <form onSubmit={handleReconcileSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Exact Physical Balance Displayed (in Billions)
                </label>
                <input
                  type="number"
                  required
                  value={physicalBalanceBillions}
                  onChange={(e) => setPhysicalBalanceBillions(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Reconciliation Notes
                </label>
                <input
                  type="text"
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReconcileModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-surface-border bg-surface text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold uppercase tracking-wider transition active:scale-95 shadow-md shadow-primary/20"
                >
                  CONFIRM AUDIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
