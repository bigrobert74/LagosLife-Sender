import React, { useState, useEffect } from 'react';
import {
  Truck,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Zap,
  XCircle,
  Activity,
  Coins,
  RefreshCw,
  User,
  ArrowRight,
} from 'lucide-react';

interface FulfillmentQueueViewProps {
  onManualDelivery?: (orderNumber: string) => void;
}

export const FulfillmentQueueView: React.FC<FulfillmentQueueViewProps> = ({ onManualDelivery }) => {
  const [queueData, setQueueData] = useState<any>({
    summary: {
      totalJobs: 0,
      queuedCount: 0,
      processingCount: 0,
      succeededCount: 0,
      failedCount: 0,
      avgDeliverySeconds: 2.4,
    },
    jobs: [],
  });

  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'transactions'>('queue');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [twoStepOrder, setTwoStepOrder] = useState<string | null>(null);
  const [twoStepCode, setTwoStepCode] = useState<string>('');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchQueue = async () => {
    try {
      const [queueRes, txRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/admin/fulfillment/queue').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/fulfillment/transactions').then((r) => r.json()),
      ]);

      if (queueRes?.success) setQueueData(queueRes.data);
      if (txRes?.success) setTransactions(txRes.data);
    } catch (err) {
      console.warn('Backend not responding or offline:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQueue();
    setIsRefreshing(false);
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRetry = async (orderNumber: string, code?: string) => {
    setActionLoading(orderNumber);
    try {
      const res = await fetch(`http://localhost:3000/api/v1/admin/fulfillment/retry/${orderNumber}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(code ? { twoStepCode: code.trim() } : {}),
      });
      const data = await res.json();
      if (data?.success && data.data?.ok) {
        showToast(`Fulfillment succeeded! TX ID: ${data.data.txId}`, 'success');
        setTwoStepOrder(null);
        setTwoStepCode('');
      } else {
        showToast(data?.data?.error || 'Retry attempt failed', 'error');
      }
    } catch (err: any) {
      showToast('Retry error: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
      fetchQueue();
    }
  };

  const handleCancel = async (orderNumber: string) => {
    if (!window.confirm(`Cancel automated fulfillment for order #${orderNumber}?`)) return;
    try {
      await fetch(`http://localhost:3000/api/v1/admin/fulfillment/cancel/${orderNumber}`, {
        method: 'POST',
      });
      showToast(`Fulfillment job #${orderNumber} cancelled.`, 'success');
      fetchQueue();
    } catch (err: any) {
      showToast('Error cancelling job: ' + err.message, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>DELIVERED (AUTO)</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center space-x-1 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>TRANSFERRING IN-GAME</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>QUEUED</span>
          </span>
        );
      case 'MANUAL_REVIEW_REQUIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>MANUAL REVIEW REQ.</span>
          </span>
        );
      case 'PARTIALLY_DELIVERED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>PARTIALLY DELIVERED</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-700 text-slate-400">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-semibold transition animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-surface-border">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Fulfillment Pipeline
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30 flex items-center space-x-1.5">
              <Zap className="w-3 h-3 text-primary" />
              <span>LIVE INTEGRATION QUEUE</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Automated money delivery from connected character vault following payment approval.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl border border-surface-border bg-surface-card hover:border-primary/50 text-xs font-bold text-slate-200 flex items-center space-x-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-surface p-4 rounded-2xl border border-surface-border">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Total Automated Jobs</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">
            {queueData?.summary?.totalJobs || 0}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-surface-border">
          <div className="text-[11px] font-mono text-amber-400 uppercase">Active / Queued</div>
          <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
            {queueData?.summary?.queuedCount || 0}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-surface-border">
          <div className="text-[11px] font-mono text-blue-400 uppercase">Processing Live</div>
          <div className="text-2xl font-black text-blue-400 mt-1 font-mono">
            {queueData?.summary?.processingCount || 0}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-surface-border">
          <div className="text-[11px] font-mono text-emerald-400 uppercase">Delivered Successfully</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {queueData?.summary?.succeededCount || 0}
          </div>
        </div>

        <div className="bg-surface p-4 rounded-2xl border border-surface-border">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Avg Delivery Latency</div>
          <div className="text-2xl font-black text-primary mt-1 font-mono">
            {queueData?.summary?.avgDeliverySeconds || 2.4}s
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-surface-border pb-2 text-xs font-mono font-bold">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'queue'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          Fulfillment Queue ({queueData?.jobs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'transactions'
              ? 'bg-primary text-black'
              : 'text-slate-400 hover:text-white hover:bg-surface'
          }`}
        >
          Authorized Game Transactions ({transactions.length})
        </button>
      </div>

      {/* Queue Table */}
      {activeTab === 'queue' && (
        <div className="bg-surface rounded-3xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-surface-card/40">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer / Character</th>
                  <th className="py-3 px-4">Target Character ID</th>
                  <th className="py-3 px-4 text-right">Amount (₦LL)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">TX ID / Error Reason</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-xs">
                {queueData?.jobs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 font-mono">
                      No automated fulfillment jobs in queue. Approving a verified bank payment will auto-spawn delivery.
                    </td>
                  </tr>
                ) : (
                  queueData.jobs.map((job: any) => (
                    <tr key={job.id} className="hover:bg-surface-card/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        #{job.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-200">{job.gameUsername}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{job.customerName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <code>{job.targetPlayerId || 'Searching...'}</code>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="font-bold text-primary">₦LL {job.formattedAmount}</div>
                        {(job.totalBatches > 1 || job.chunkAmount || job.status === 'PROCESSING') && (
                          <div className="mt-1">
                            <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{ width: `${job.progressPercent || (job.status === 'SUCCEEDED' ? 100 : 0)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {job.completedBatches || (job.status === 'SUCCEEDED' ? job.totalBatches : 0)}/{job.totalBatches || 1} batches
                              {job.formattedChunkAmount ? ` • ₦LL ${job.formattedChunkAmount} per ${job.transferCooldownSeconds || 70}s` : ` (${job.transferCooldownSeconds || 70}s cooldown)`}
                            </div>
                            {job.status === 'PROCESSING' && job.nextBatchAt && (
                              <div className="text-[10px] font-mono text-amber-400 font-bold mt-0.5 animate-pulse">
                                ⏱️ Next transfer in: {Math.max(0, Math.ceil((new Date(job.nextBatchAt).getTime() - now) / 1000))}s
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex">{getStatusBadge(job.status)}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {job.txId ? (
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <span>TX: {job.txId}</span>
                          </span>
                        ) : job.lastError ? (
                          <span className="text-rose-400 font-medium truncate block max-w-xs" title={job.lastError}>
                            {job.lastError}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {(job.status === 'FAILED' || job.status === 'MANUAL_REVIEW_REQUIRED' || job.status === 'PARTIALLY_DELIVERED') && (
                          <>
                            {twoStepOrder === job.orderNumber ? (
                              <div className="inline-flex items-center space-x-1.5 mr-1">
                                <input
                                  type="text"
                                  value={twoStepCode}
                                  onChange={(e) => setTwoStepCode(e.target.value)}
                                  placeholder="2-Step Code"
                                  className="w-24 px-2 py-1 rounded-lg bg-background border border-primary text-white text-[10px] font-mono focus:outline-none"
                                />
                                <button
                                  onClick={() => handleRetry(job.orderNumber, twoStepCode)}
                                  disabled={actionLoading === job.orderNumber || !twoStepCode.trim()}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-[10px] transition disabled:opacity-50"
                                >
                                  Send
                                </button>
                                <button
                                  onClick={() => {
                                    setTwoStepOrder(null);
                                    setTwoStepCode('');
                                  }}
                                  className="px-1.5 py-1 rounded-lg border border-surface-border text-slate-400 hover:text-white text-[10px]"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <>
                                {/two-step|two_step|2fa|code/i.test(job.lastError || '') && (
                                  <button
                                    onClick={() => {
                                      setTwoStepOrder(job.orderNumber);
                                      setTwoStepCode('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold font-mono text-[10px] transition"
                                  >
                                    2-Step Code
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRetry(job.orderNumber)}
                                  disabled={actionLoading === job.orderNumber}
                                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-black font-bold font-mono text-[10px] transition disabled:opacity-50"
                                >
                                  {actionLoading === job.orderNumber ? 'Retrying...' : 'Retry Now'}
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {job.status !== 'SUCCEEDED' && job.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(job.orderNumber)}
                            className="px-2.5 py-1 rounded-lg border border-surface-border hover:border-rose-500/40 text-slate-400 hover:text-rose-400 font-bold font-mono text-[10px] transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Authorized Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-surface rounded-3xl border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-surface-card/40">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Related Order</th>
                  <th className="py-3 px-4">Recipient Character</th>
                  <th className="py-3 px-4 text-right">Amount Sent</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-mono">
                      No game transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-card/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {tx.txId}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-white">
                        #{tx.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-200">{tx.targetUsername}</span>
                        <code className="text-[10px] text-slate-400 block font-mono">({tx.targetPlayerId})</code>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                        ₦LL {Number(tx.amount).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        ₦LL {Number(tx.remainingBalance).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
