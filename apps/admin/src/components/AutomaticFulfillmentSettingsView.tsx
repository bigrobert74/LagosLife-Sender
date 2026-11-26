import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  Power,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Zap,
  Lock,
  ArrowRight,
  Info,
  Clock,
} from 'lucide-react';

export const AutomaticFulfillmentSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    autoFulfillmentEnabled: true,
    emergencyShutdown: false,
    maxSingleTransfer: '100000000000000',
    dailyLimit: '200000000000000',
    dailyDeliveredToday: '0',
    minReserveBalance: '1000000000',
    lowBalanceAlertThreshold: '5000000000',
    maxRetries: 3,
    gradualTransferEnabled: true,
    batchThresholdAmount: '100000000000', // 100B threshold: <= 100B instant 1 transfer, > 100B batched
    transferChunkAmount: '100000000000', // 100B per 70 seconds
    transferCooldownSeconds: 70, // 70s strict cooldown floor
  });

  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [shutdownReason, setShutdownReason] = useState('Safety maintenance pause');

  const fetchSettings = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/fulfillment/settings');
      const data = await res.json();
      if (data?.success) {
        setSettings(data.data);
      }
    } catch (err) {
      console.warn('Backend not responding or offline:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'warning') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/fulfillment/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data?.success) {
        setSettings(data.data);
        showToast('Fulfillment rules and limits updated successfully!', 'success');
      } else {
        showToast(data?.message || 'Failed to update settings', 'error');
      }
    } catch (err: any) {
      showToast('Save error: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyShutdown = async () => {
    setShowShutdownConfirm(false);
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/fulfillment/emergency-shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: shutdownReason }),
      });
      const data = await res.json();
      if (data?.success) {
        setSettings((prev: any) => ({
          ...prev,
          emergencyShutdown: true,
          autoFulfillmentEnabled: false,
        }));
        showToast('EMERGENCY SHUTDOWN ACTIVATED! All automated currency transfers paused.', 'error');
      }
    } catch (err: any) {
      showToast('Shutdown error: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeOperations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/fulfillment/resume', {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.success) {
        setSettings((prev: any) => ({
          ...prev,
          emergencyShutdown: false,
          autoFulfillmentEnabled: true,
        }));
        showToast('Automated currency fulfillment resumed.', 'success');
      }
    } catch (err: any) {
      showToast('Resume error: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-semibold transition animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
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

      {/* Emergency Status Banner */}
      {settings.emergencyShutdown ? (
        <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/40 text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
              <AlertOctagon className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <div className="text-base font-black text-white tracking-wide uppercase font-mono">
                EMERGENCY SHUTDOWN ACTIVE
              </div>
              <p className="text-xs text-rose-300/80 mt-1">
                All automated money delivery from the owner account is currently halted. Newly verified orders are queued for manual delivery review.
              </p>
            </div>
          </div>
          <button
            onClick={handleResumeOperations}
            className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-rose-500/20 shrink-0"
          >
            Resume Operations
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-surface-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-400" />
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Automatic Fulfillment Settings
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE • ZERO INTERVENTION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Control automated game currency delivery parameters, security rate limits and emergency cutoffs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowShutdownConfirm(true)}
            className="px-4 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs uppercase font-mono flex items-center space-x-2 transition"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>EMERGENCY SHUTDOWN</span>
          </button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Automation Master & Limits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Toggle Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Automatic Money Delivery</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  When enabled, verified bank payments automatically trigger <code className="text-primary font-mono">POST /api/send</code> using the owner's encrypted PIN.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.autoFulfillmentEnabled && !settings.emergencyShutdown}
                  disabled={settings.emergencyShutdown}
                  onChange={(e) =>
                    setSettings({ ...settings, autoFulfillmentEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Transfer Limits Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-border space-y-5">
            <div className="border-b border-surface-border pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-accent-blue" />
                <span>Financial & Safety Guardrails</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Max Single Transfer */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Max Single Order Transfer (₦LL)
                </label>
                <input
                  type="text"
                  value={settings.maxSingleTransfer}
                  onChange={(e) =>
                    setSettings({ ...settings, maxSingleTransfer: e.target.value.replace(/\D/g, '') })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Formatted: ₦LL {Number(settings.maxSingleTransfer || 0).toLocaleString()}
                </p>
              </div>

              {/* Daily Volume Limit */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Daily Automated Limit (₦LL)
                </label>
                <input
                  type="text"
                  value={settings.dailyLimit}
                  onChange={(e) =>
                    setSettings({ ...settings, dailyLimit: e.target.value.replace(/\D/g, '') })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Today's delivered volume: ₦LL {Number(settings.dailyDeliveredToday || 0).toLocaleString()}
                </p>
              </div>

              {/* Min Reserve Balance */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Min Owner Reserve Floor (₦LL)
                </label>
                <input
                  type="text"
                  value={settings.minReserveBalance}
                  onChange={(e) =>
                    setSettings({ ...settings, minReserveBalance: e.target.value.replace(/\D/g, '') })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Never transfer below this threshold in owner character account
                </p>
              </div>

              {/* Low Balance Alert Threshold */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Low Balance Alert Level (₦LL)
                </label>
                <input
                  type="text"
                  value={settings.lowBalanceAlertThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lowBalanceAlertThreshold: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Triggers dashboard amber alert when available balance falls below
                </p>
              </div>
            </div>

            {/* Error Retry Logic */}
            <div className="pt-2 border-t border-surface-border">
              <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                Maximum Automatic Retries for Transient API Errors
              </label>
              <div className="flex items-center space-x-3">
                {[1, 2, 3, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setSettings({ ...settings, maxRetries: cnt })}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition border ${
                      settings.maxRetries === cnt
                        ? 'bg-primary text-black border-primary'
                        : 'bg-background border-surface-border text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {cnt} Retries
                  </button>
                ))}
                <span className="text-xs text-slate-400">
                  After max retries, order moves to <strong>MANUAL_REVIEW_REQUIRED</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Gradual Batched Transfer & Cooldown Timer Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-border space-y-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Smart Adaptive Batching & 70s Cooldown Engine</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Orders ≤ 100 Billion are sent in 1 immediate transfer. Orders &gt; 100 Billion are automatically delivered in 100 Billion chunks spaced by a strict 70-second cooldown delay to protect against Lagos Life anti-spam limits.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.gradualTransferEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, gradualTransferEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-surface-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-400"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Batching Activation Threshold */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Batching Threshold (₦LL)
                </label>
                <input
                  type="text"
                  value={settings.batchThresholdAmount || '100000000000'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      batchThresholdAmount: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <div className="flex items-center space-x-2 mt-2">
                  {[
                    { label: '50B', val: '50000000000' },
                    { label: '100B (Default)', val: '100000000000' },
                    { label: '200B', val: '200000000000' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setSettings({ ...settings, batchThresholdAmount: p.val })}
                      className="px-2 py-1 rounded-lg bg-background border border-surface-border text-[10px] font-mono text-slate-300 hover:text-white hover:border-primary transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-emerald-400 font-mono mt-1">
                  Orders ≤ ₦LL {Number(settings.batchThresholdAmount || 100000000000).toLocaleString()} send in 1 instant transfer
                </p>
              </div>

              {/* Transfer Amount Per Time (Chunk Size for orders > threshold) */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Batch Chunk Size per 70s (₦LL)
                </label>
                <input
                  type="text"
                  value={settings.transferChunkAmount || '100000000000'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      transferChunkAmount: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                />
                <div className="flex items-center space-x-2 mt-2">
                  {[
                    { label: '100B per 70s (Default)', val: '100000000000' },
                    { label: '50B', val: '50000000000' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setSettings({ ...settings, transferChunkAmount: p.val })}
                      className="px-2 py-1 rounded-lg bg-background border border-surface-border text-[10px] font-mono text-slate-300 hover:text-white hover:border-primary transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Amount delivered per 70-second cycle (100B max per Lagos Life transfer)
                </p>
              </div>

              {/* Cooldown Timer In Seconds */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                  Transfer Delay Timer (Cooldown in Seconds)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min={70}
                    max={600}
                    value={Math.max(70, Number(settings.transferCooldownSeconds || 70))}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        transferCooldownSeconds: Math.max(70, Number(e.target.value) || 70),
                      })
                    }
                    className="w-24 px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-300">Seconds Delay</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[
                    { label: '70s (Strict Floor)', val: 70 },
                    { label: '75s (Recommended)', val: 75 },
                    { label: '90s (Safe)', val: 90 },
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setSettings({ ...settings, transferCooldownSeconds: t.val })}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-mono transition ${
                        settings.transferCooldownSeconds === t.val
                          ? 'bg-primary text-black border-primary font-bold'
                          : 'bg-background border-surface-border text-slate-300 hover:text-white hover:border-primary'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-amber-400 font-mono mt-1">
                  Lagos Life enforces a <strong>70-second cooldown floor</strong> between consecutive transfers.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-extrabold flex items-center space-x-2 transition shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Info: Architecture Overview */}
        <div className="bg-surface p-6 rounded-3xl border border-surface-border space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
            <Info className="w-4 h-4 text-primary" />
            <span>Operational Safety Rules</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <strong className="text-white block font-mono text-[11px] mb-1">
                1. Independent Payment Verification
              </strong>
              <span>Customer bank transfer proof uploads NEVER trigger auto-delivery. Only an admin clicking APPROVE PAYMENT initiates fulfillment.</span>
            </div>

            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <strong className="text-white block font-mono text-[11px] mb-1">
                2. Live Balance Verification
              </strong>
              <span>The system verifies live cash balance on the game server before sending. If balance is insufficient, delivery halts safely.</span>
            </div>

            <div className="p-3 rounded-xl bg-background border border-surface-border">
              <strong className="text-white block font-mono text-[11px] mb-1">
                3. Idempotent Delivery Lock
              </strong>
              <span>Each order has a unique transaction lock. Money can never be sent twice for the same verified order.</span>
            </div>
          </div>
        </div>
      </form>

      {/* Emergency Shutdown Confirmation Modal */}
      {showShutdownConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-rose-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-scaleUp">
            <div className="flex items-center space-x-3 text-rose-400 mb-4">
              <AlertOctagon className="w-8 h-8" />
              <h3 className="text-lg font-black text-white uppercase font-mono">
                Confirm Emergency Shutdown
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This action will <strong>immediately pause all automated money deliveries</strong>. No game cash transfers will leave the owner account until operations are manually resumed.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Reason for Shutdown
              </label>
              <input
                type="text"
                value={shutdownReason}
                onChange={(e) => setShutdownReason(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-background border border-surface-border text-white text-xs font-mono focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowShutdownConfirm(false)}
                className="px-4 py-2 rounded-xl border border-surface-border text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmergencyShutdown}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs uppercase transition shadow-lg shadow-rose-500/30"
              >
                Execute Emergency Halt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
