import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export interface AdminUserSession {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'PAYMENT_ADMIN' | 'DELIVERY_ADMIN' | 'SUPPORT_AGENT' | 'REPORTS_VIEWER';
  permissions: string[];
  token: string;
  lastLoginAt: string;
}

interface AdminLoginScreenProps {
  onLoginSuccess: (user: AdminUserSession) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const inputUser = usernameOrEmail.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMessage('Please provide both administrator identifier and access key.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Attempt Live Backend REST API Authentication
      const res = await fetch('http://localhost:3000/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: inputUser, password: inputPass }),
      });

      if (res.ok) {
        const json = await res.json();
        const payload = json.data;
        const session: AdminUserSession = {
          ...payload.user,
          token: payload.token,
        };
        if (rememberSession) {
          localStorage.setItem('lagos_admin_session', JSON.stringify(session));
        }
        setIsLoading(false);
        onLoginSuccess(session);
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Invalid administrator credentials');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.message || 'Authentication failed. Check your staff credentials and try again.',
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col justify-between selection:bg-primary selection:text-black">
      {/* Top Status Bar */}
      <div className="border-b border-surface-border/60 bg-surface/30 backdrop-blur-md px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-semibold">SECURITY ENCLAVE ACTIVE</span>
          <span className="text-slate-500">•</span>
          <span className="hidden sm:inline text-slate-400">RESTRICTED BACKOFFICE PORTAL</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="bg-surface-border/60 px-2 py-0.5 rounded text-primary border border-primary/20">
            CLOUD ENCLAVE (ISOLATED)
          </span>
          <span className="text-slate-400 hidden md:inline">TLS 1.3 • AES-GCM-256</span>
        </div>
      </div>

      {/* Main Login Box */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Cyber Glow Top Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-accent-blue" />

          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 text-primary mb-4 shadow-lg shadow-primary/10">
              <ShieldAlert className="w-8 h-8 text-primary" />
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl font-black text-white tracking-tight">
                LAGOS<span className="text-primary">LIFE</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono font-bold tracking-wider">
                CONTROL CENTRE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Administrative Gateway & Backoffice Authentication
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start space-x-2.5 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                Staff Identifier / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="Enter administrator username or email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-surface-border text-white text-sm focus:border-primary focus:outline-none font-mono placeholder:text-slate-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Master Access Key
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Encrypted Input</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-background border border-surface-border text-white text-sm focus:border-primary focus:outline-none font-mono placeholder:text-slate-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="rounded text-primary focus:ring-primary accent-primary cursor-pointer w-4 h-4"
                />
                <span>Persist terminal token</span>
              </label>
              <span className="text-slate-400 hover:text-slate-300 text-[11px] font-mono cursor-default">
                Auto-Logout: 120m
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition active:scale-98 shadow-xl shadow-primary/20 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>AUTHENTICATING SECURE SESSION...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>AUTHENTICATE & ENTER CONTROL CENTRE</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Security Footer Notice */}
      <footer className="border-t border-surface-border/60 bg-surface/20 py-4 px-6 text-center text-xs text-slate-400 font-mono">
        <p>
          CONFIDENTIAL SYSTEM NOTICE: Access to this administrative interface is restricted to authorized operations personnel. All authorization attempts, IP addresses, payment approvals, and currency transactions are logged immutably.
        </p>
      </footer>
    </div>
  );
};
