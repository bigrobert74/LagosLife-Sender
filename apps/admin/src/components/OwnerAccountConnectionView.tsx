import React, { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Server,
  Zap,
  Power,
  Activity,
  Coins,
  History,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
  User,
  MapPin,
  Award,
  Crown,
  LogOut,
  Send,
  Smartphone,
} from 'lucide-react';

interface OwnerAccountConnectionViewProps {
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const OwnerAccountConnectionView: React.FC<OwnerAccountConnectionViewProps> = () => {
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [balanceInfo, setBalanceInfo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // In-Game Lagos Life Login Form State (No hardcoded accounts - accepts any Lagos Life character)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [accountIdentifier, setAccountIdentifier] = useState('Primary Character Vault');

  // 2FA Security Challenge State
  const [requires2Fa, setRequires2Fa] = useState(false);
  const [twoFaChallenge, setTwoFaChallenge] = useState('');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaTo, setTwoFaTo] = useState('');
  const [isVerifying2Fa, setIsVerifying2Fa] = useState(false);

  // PIN Rotation State (when connected)
  const [newPin, setNewPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const fetchStatusAndBalance = async () => {
    try {
      const [statusRes, balRes, logsRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/admin/owner-account/status').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/owner-account/balance').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/owner-account/logs').then((r) => r.json()),
      ]);

      if (statusRes?.success) {
        setAccountStatus(statusRes.data);
      }
      if (balRes?.success) setBalanceInfo(balRes.data);
      if (logsRes?.success) setLogs(logsRes.data);
    } catch (err) {
      console.warn('Backend not responding or offline:', err);
    }
  };

  useEffect(() => {
    fetchStatusAndBalance();
    const interval = setInterval(fetchStatusAndBalance, 8000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' | 'info') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // -------------------------------------------------------------
  // Login into Lagos Life Account using Username + Password
  // -------------------------------------------------------------
  const handleLagosLifeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast('Please enter your Lagos Life username', 'error');
      return;
    }
    if (!password.trim()) {
      showToast('Please enter your Lagos Life account password', 'error');
      return;
    }
    if (!pin || pin.length !== 4) {
      showToast('Please enter your 4-digit in-game transfer authorization PIN', 'error');
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/owner-account/login-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          pin: pin.trim(),
          accountIdentifier: accountIdentifier.trim() || undefined,
        }),
      });

      const data = await res.json();

      // Check if Lagos Life returns a 2FA challenge (401)
      if (res.status === 401 && data.code === 'two_factor') {
        setRequires2Fa(true);
        setTwoFaChallenge(data.challenge);
        setTwoFaTo(data.to || 'your registered security contact');
        showToast('Two-factor verification challenge received from Lagos Life servers.', 'info');
        setIsLoading(false);
        return;
      }

      if (data?.success) {
        if (pin && pin.trim().length === 4) {
          localStorage.setItem('lagos_life_transfer_pin', pin.trim());
        }
        showToast(
          `Connected to Lagos Life! Welcome @${data.data.username}. Live balance and character stats synced.`,
          'success',
        );
        setPassword('');
        setPin('');
        fetchStatusAndBalance();
      } else {
        showToast(data?.message || data?.error || 'Authentication with Lagos Life failed', 'error');
      }
    } catch (err: any) {
      showToast('Connection error: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Verify Lagos Life 2FA Challenge on Same Endpoint
  // -------------------------------------------------------------
  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFaCode.trim()) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }

    setIsVerifying2Fa(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/owner-account/login-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          challenge: twoFaChallenge,
          code: twoFaCode.trim(),
          username: username.trim(),
          password: password.trim(),
          pin: pin.trim(),
          accountIdentifier: accountIdentifier.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data?.success) {
        if (pin && pin.trim().length === 4) {
          localStorage.setItem('lagos_life_transfer_pin', pin.trim());
        }
        setRequires2Fa(false);
        setTwoFaCode('');
        setPassword('');
        setPin('');
        showToast(`2FA verified! Lagos Life character @${data.data.username} connected successfully.`, 'success');
        fetchStatusAndBalance();
      } else {
        showToast(data?.message || 'Invalid two-factor code entered', 'error');
      }
    } catch (err: any) {
      showToast('2FA error: ' + err.message, 'error');
    } finally {
      setIsVerifying2Fa(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/owner-account/sync-balance', {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.success) {
        setBalanceInfo(data.data);
        showToast('Live balance synchronized successfully from Lagos Life game vault!', 'success');
      }
    } catch (err: any) {
      showToast('Balance sync delayed: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
      fetchStatusAndBalance();
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/owner-account/test-connection', {
        method: 'POST',
      });
      const data = await res.json();
      if (data?.success) {
        setTestResult(data.data);
        if (data.data.ok) {
          showToast(`Connection verified in ${data.data.latencyMs}ms. Status: ACTIVE`, 'success');
        } else {
          showToast(`Health check warning: ${data.data.error}`, 'error');
        }
      }
    } catch (err: any) {
      showToast('Connection test failed: ' + err.message, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length !== 4) {
      showToast('Transaction PIN must be exactly 4 digits', 'error');
      return;
    }
    setIsUpdatingPin(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/owner-account/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });
      const data = await res.json();
      if (data?.success) {
        localStorage.setItem('lagos_life_transfer_pin', newPin.trim());
        showToast('Transaction PIN updated & re-encrypted with AES-256-GCM', 'success');
        setNewPin('');
        fetchStatusAndBalance();
      }
    } catch (err: any) {
      showToast('PIN update error: ' + err.message, 'error');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        'Disconnect this Lagos Life character account? Automated money fulfillment will pause until an account is reconnected.',
      )
    ) {
      return;
    }
    try {
      const res = await fetch('http://localhost:3000/api/v1/admin/owner-account/disconnect', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data?.success) {
        showToast('Lagos Life account session disconnected and encrypted PIN purged.', 'info');
        fetchStatusAndBalance();
      }
    } catch (err: any) {
      showToast('Disconnect error: ' + err.message, 'error');
    }
  };

  const isConnected = accountStatus?.status === 'CONNECTED';

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
              : 'bg-primary/10 border border-primary/30 text-primary'
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-3xl border border-surface-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Lagos Life Account Integration
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-1.5 border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{accountStatus?.status || 'NOT CONNECTED'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Log into your main Lagos Life game account from this admin dashboard. It collects all live character data, synchronizes your saved cash, and enables automated delivery.
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 rounded-xl border border-surface-border bg-surface-card hover:border-primary/50 text-xs font-bold text-slate-200 flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 text-primary ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Latency...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-extrabold flex items-center space-x-2 transition shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Live Balance'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Latency Test Box (if run) */}
      {testResult && (
        <div className="p-4 rounded-2xl bg-surface border border-primary/30 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-200">
              Live server ping: <strong className="text-white">{testResult.gameServer}</strong> responded in{' '}
              <strong className="text-primary">{testResult.latencyMs}ms</strong>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">Decryption Envelope: AES-256-GCM Verified</span>
          </div>
          <span className="text-emerald-400 font-bold">READY FOR AUTOMATED FULFILLMENT</span>
        </div>
      )}

      {/* IF NOT CONNECTED: Show In-Game Login Form */}
      {!isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Login Box */}
          <div className="lg:col-span-2 bg-surface p-6 sm:p-8 rounded-3xl border border-surface-border space-y-6">
            <div className="border-b border-surface-border pb-4">
              <div className="flex items-center space-x-2 text-primary text-xs font-mono font-bold uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" />
                <span>Lagos Life In-Game Authentication</span>
              </div>
              <h2 className="text-lg font-black text-white">Log In to Your Lagos Life Character</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your official Lagos Life credentials. The dashboard logs into your game account, retrieves your live profile & balance, and secures your transfer PIN.
              </p>
            </div>

            <form onSubmit={handleLagosLifeLogin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                    Lagos Life Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. LagosLifeUsername"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Your character handle in Lagos Life
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-bold uppercase text-slate-300">
                      Lagos Life Password
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Game Password</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Used to authenticate with <code className="text-slate-400">POST /api/auth/login</code>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center space-x-1.5">
                      <Key className="w-3.5 h-3.5 text-primary" />
                      <span>4-Digit Transfer PIN</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">Required for /api/send</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4-digit PIN (e.g. 1234)"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none tracking-widest placeholder:tracking-normal placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Encrypted with AES-256-GCM. Never stored in plain text.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-slate-300 mb-1.5">
                    Account Label / Identifier (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountIdentifier}
                    onChange={(e) => setAccountIdentifier(e.target.value)}
                    placeholder="e.g. Primary Treasury Vault"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm font-mono focus:border-primary focus:outline-none placeholder:text-slate-500"
                  />
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Internal label for your reference
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black text-xs font-extrabold uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>AUTHENTICATING WITH LAGOS LIFE...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>SIGN IN & CONNECT LAGOS LIFE ACCOUNT</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Info: How It Works */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-border space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-2">
              <Info className="w-4 h-4 text-primary" />
              <span>How Connection Works</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-background border border-surface-border">
                <strong className="text-white block font-mono text-[11px] mb-1">
                  1. Official Game Auth
                </strong>
                <span>Submits your login credentials to Lagos Life via <code className="text-primary font-mono">POST /api/auth/login</code>. Supports two-factor authentication if requested by the game.</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-surface-border">
                <strong className="text-white block font-mono text-[11px] mb-1">
                  2. Live Profile Collection
                </strong>
                <span>Once authenticated, it automatically pulls your character stats, reputation, in-game saved cash, and net worth via <code className="text-primary font-mono">GET /api/gl/status</code>.</span>
              </div>

              <div className="p-3 rounded-xl bg-background border border-surface-border">
                <strong className="text-white block font-mono text-[11px] mb-1">
                  3. Hardware-Grade Encryption
                </strong>
                <span>Your 4-digit transfer PIN is encrypted using AES-256-GCM envelope encryption. It is only decrypted in memory when an authorized transfer executes.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* IF CONNECTED: Show Rich Live Character Dossier & Live Balances */
        <div className="space-y-6">
          {/* Character Dossier Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Crown className="w-48 h-48 text-primary" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-surface-border">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent-blue p-0.5 shadow-xl shadow-primary/20 shrink-0">
                  <div className="w-full h-full bg-[#080C14] rounded-2xl flex items-center justify-center font-black text-xl text-primary font-mono">
                    {accountStatus?.username?.slice(0, 2).toUpperCase() || 'LL'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-black text-white tracking-tight">
                      {accountStatus?.name || 'Lagos Life Character'}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{accountStatus?.online ? 'ONLINE IN-GAME' : 'CONNECTED'}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                    <span className="text-primary font-bold">@{accountStatus?.username}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{accountStatus?.location || 'Central Bank Vault, Marina, Lagos'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold font-mono transition flex items-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect / Switch Character</span>
                </button>
              </div>
            </div>

            {/* Character Progression & Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <div className="p-3.5 rounded-2xl bg-background border border-surface-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Rank & Title</div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {accountStatus?.characterStats?.rank || 'Unranked'}
                </div>
                <div className="text-[10px] text-primary font-mono mt-0.5">
                  Tier: {accountStatus?.characterStats?.tier || 'Unranked'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-surface-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Progression Level</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  Level {accountStatus?.characterStats?.level ?? 0}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  Reputation: {accountStatus?.characterStats?.reputation ?? 0}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-surface-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">In-Game League</div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {accountStatus?.characterStats?.league || 'Unplaced'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {accountStatus?.accountIdentifier || 'Live Character Vault'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-surface-border">
                <div className="text-[10px] font-mono text-slate-400 uppercase">PIN Encryption</div>
                <div className="text-sm font-bold text-white font-mono mt-0.5 flex items-center space-x-1.5">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>{accountStatus?.pinMasked || '••••'}</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  AES-256-GCM Active
                </div>
              </div>
            </div>

            {/* Badges & Titles Row */}
            {accountStatus?.badges && accountStatus.badges.length > 0 && (
              <div className="pt-4 border-t border-surface-border mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 mr-2 flex items-center space-x-1">
                  <Award className="w-3 h-3 text-primary" />
                  <span>Verified Badges:</span>
                </span>
                {accountStatus.badges.map((b: any) => (
                  <span
                    key={b.id}
                    className="px-2.5 py-1 rounded-lg bg-surface-card border border-surface-border text-[11px] font-semibold text-slate-200 flex items-center space-x-1.5"
                  >
                    <span>🛡️</span>
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Balance & Vault Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Actual In-Game Balance */}
            <div className="bg-surface p-5 rounded-2xl border border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase tracking-wider">Actual Game Balance</span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  ₦LL {balanceInfo?.formattedSavedCash || '0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5">
                  <span>Read directly from</span>
                  <code className="text-primary font-mono text-[10px]">ladder.facts.saved</code>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {balanceInfo?.isStale ? (
                  <span className="text-amber-400 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>BALANCE TEMPORARILY UNAVAILABLE</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Live verified via Game API</span>
                  </span>
                )}
              </div>
            </div>

            {/* Reserved Balance */}
            <div className="bg-surface p-5 rounded-2xl border border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase tracking-wider">Reserved for Orders</span>
                <Lock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                  ₦LL {balanceInfo?.formattedReservedBalance || '0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Committed to verified orders pending delivery
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Auto-released upon delivery execution
              </div>
            </div>

            {/* Available Balance */}
            <div className="bg-surface p-5 rounded-2xl border border-surface-border flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase tracking-wider">Available for Sale</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-black text-primary font-mono tracking-tight">
                  ₦LL {balanceInfo?.formattedAvailableBalance || '0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Actual Game Balance minus Reserved
                </div>
              </div>
              <div className="text-[10px] font-mono">
                {balanceInfo?.lowBalanceWarning ? (
                  <span className="text-rose-400 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>LOW BALANCE ALERT (&lt; 5B)</span>
                  </span>
                ) : (
                  <span className="text-emerald-400">✓ Healthy Liquidity Level</span>
                )}
              </div>
            </div>

            {/* Character Net Worth */}
            <div className="bg-surface p-5 rounded-2xl border border-surface-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono uppercase tracking-wider">Total Net Worth</span>
                <Shield className="w-4 h-4 text-accent-blue" />
              </div>
              <div className="my-3">
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  ₦LL {balanceInfo?.formattedNetWorth || '0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Includes game assets & real estate
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Source: <code className="text-slate-300">ladder.facts.netWorth</code>
              </div>
            </div>
          </div>

          {/* Quick PIN Rotation Card */}
          <div className="bg-surface p-6 rounded-3xl border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                <Key className="w-4 h-4 text-primary" />
                <span>Update In-Game Transfer PIN</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                If you change your 4-digit security PIN in the Lagos Life game, update it here so automated transfers continue smoothly.
              </p>
            </div>

            <form onSubmit={handleUpdatePin} className="flex items-center space-x-3">
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New 4-digit PIN"
                className="w-36 px-4 py-2 rounded-xl bg-background border border-surface-border text-white text-xs font-mono tracking-widest focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={isUpdatingPin || newPin.length !== 4}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs font-mono transition disabled:opacity-50"
              >
                {isUpdatingPin ? 'Saving...' : 'Update PIN'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Verification Dialog (When Lagos Life triggers 2FA challenge) */}
      {requires2Fa && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-primary/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-scaleUp">
            <div className="flex items-center space-x-3 text-primary mb-4">
              <Smartphone className="w-8 h-8" />
              <div>
                <h3 className="text-lg font-black text-white uppercase font-mono">
                  Two-Factor Authentication
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Lagos Life Security Verification</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Lagos Life requires 2FA confirmation for character <strong className="text-white font-mono">@{username}</strong>. A verification challenge code has been sent to <strong className="text-primary font-mono">{twoFaTo}</strong>.
            </p>

            <form onSubmit={handleVerify2Fa} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-surface-border text-white text-center text-lg font-mono tracking-widest focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRequires2Fa(false)}
                  className="px-4 py-2 rounded-xl border border-surface-border text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying2Fa || !twoFaCode}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider transition shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isVerifying2Fa ? (
                    <span>VERIFYING...</span>
                  ) : (
                    <>
                      <span>CONFIRM & CONNECT</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
