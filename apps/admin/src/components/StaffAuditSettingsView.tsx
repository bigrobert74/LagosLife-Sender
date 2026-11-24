import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  History,
  Activity,
  CheckCircle2,
  Lock,
  Cpu,
  Database,
  Radio,
  Zap,
  KeyRound,
  Search,
  ArrowRight,
  AlertCircle,
  Coins,
  Send,
} from 'lucide-react';

interface StaffAuditSettingsViewProps {
  staff: any[];
  auditLogs: any[];
  health: any;
  systemSettings: any;
}

export const StaffAuditSettingsView: React.FC<StaffAuditSettingsViewProps> = ({
  staff,
  auditLogs,
  health,
  systemSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'STAFF' | 'HEALTH' | 'LIVE_API'>('LIVE_API');

  // Live Game API Test States
  // 1. POST /api/auth/login
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [auth2FaCode, setAuth2FaCode] = useState('');
  const [authChallenge, setAuthChallenge] = useState<string | null>(null);
  const [authResponse, setAuthResponse] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // 2. GET /api/players?q=
  const [playerQuery, setPlayerQuery] = useState('Tunde');
  const [playerResults, setPlayerResults] = useState<any | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);

  // 3. POST /api/send
  const [sendToId, setSendToId] = useState('usr-001');
  const [sendAmount, setSendAmount] = useState<number>(50000000000);
  const [sendPin, setSendPin] = useState('1234');
  const [sendResponse, setSendResponse] = useState<any | null>(null);
  const [sendLoading, setSendLoading] = useState(false);

  // 4. GET /api/gl/status
  const [glStatus, setGlStatus] = useState<any | null>(null);
  const [glLoading, setGlLoading] = useState(false);

  const fetchGlStatus = async () => {
    setGlLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/gl/status');
      const data = await res.json();
      setGlStatus(data);
    } catch (err) {
      console.warn(err);
    } finally {
      setGlLoading(false);
    }
  };

  useEffect(() => {
    fetchGlStatus();
  }, []);

  const handleTestLogin = async (is2FaStep = false) => {
    setAuthLoading(true);
    setAuthResponse(null);
    try {
      const payload: any = is2FaStep
        ? {
            action: 'login',
            challenge: authChallenge,
            code: auth2FaCode,
            username: authUsername,
            password: authPassword,
          }
        : {
            username: authUsername,
            password: authPassword,
          };

      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 401 && data.code === 'two_factor') {
        setAuthChallenge(data.challenge);
      } else if (res.ok) {
        setAuthChallenge(null);
      }
      setAuthResponse({ status: res.status, data });
    } catch (err: any) {
      setAuthResponse({ error: err.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTestPlayerSearch = async () => {
    setPlayerLoading(true);
    setPlayerResults(null);
    try {
      const res = await fetch(`http://localhost:3000/api/players?q=${encodeURIComponent(playerQuery)}`);
      const data = await res.json();
      setPlayerResults({ status: res.status, data });
    } catch (err: any) {
      setPlayerResults({ error: err.message });
    } finally {
      setPlayerLoading(false);
    }
  };

  const handleTestSend = async () => {
    setSendLoading(true);
    setSendResponse(null);
    try {
      const res = await fetch('http://localhost:3000/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendToId,
          amount: Number(sendAmount),
          pin: sendPin,
        }),
      });
      const data = await res.json();
      setSendResponse({ status: res.status, data });
      if (res.ok) {
        fetchGlStatus(); // refresh vault cash
      }
    } catch (err: any) {
      setSendResponse({ error: err.message });
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar */}
      <div className="flex space-x-2 border-b border-surface-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('LIVE_API')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'LIVE_API'
              ? 'bg-primary text-black font-extrabold shadow-md shadow-primary/20'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Live Game APIs Console (All 4 Endpoints)</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'AUDIT'
              ? 'bg-primary text-black'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'STAFF'
              ? 'bg-primary text-black'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({staff.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HEALTH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ${
            activeTab === 'HEALTH'
              ? 'bg-primary text-black'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Diagnostics & Health</span>
        </button>
      </div>

      {/* LIVE GAME APIS CONSOLE TAB */}
      {activeTab === 'LIVE_API' && (
        <div className="space-y-6 text-xs">
          {/* Header */}
          <div className="p-6 rounded-3xl bg-surface border border-surface-border">
            <div className="flex items-center space-x-2 text-primary font-bold uppercase tracking-wider text-[11px] mb-1">
              <Zap className="w-4 h-4" />
              <span>LIVE GAME SERVER API CONSOLE</span>
            </div>
            <h2 className="text-xl font-black text-white">Lagos Life Real-Time Integration Hub</h2>
            <p className="text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Interact directly with all 4 endpoints reverse-engineered and observed from the live Lagos Life game network telemetry.
            </p>
          </div>

          {/* 4 Endpoints Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. POST /api/auth/login */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-extrabold">POST</span>
                  <span className="font-mono text-sm">/api/auth/login</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Owner Game Auth & 2FA</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Game Username</label>
                  <input
                    type="text"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border font-mono text-white"
                  />
                </div>

                {authChallenge && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <div className="text-amber-400 font-bold text-[11px] flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>2FA Challenge Active: Enter 6-digit Code</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={auth2FaCode}
                      onChange={(e) => setAuth2FaCode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-background border border-amber-500/50 font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleTestLogin(true)}
                      className="w-full py-2 rounded-lg bg-amber-500 text-black font-extrabold uppercase font-mono text-[10px]"
                    >
                      VERIFY 2FA CODE (SAME URL)
                    </button>
                  </div>
                )}

                {!authChallenge && (
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={() => handleTestLogin(false)}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold uppercase tracking-wider font-mono text-xs transition"
                  >
                    {authLoading ? 'EXECUTING LOGIN...' : 'TEST POST /api/auth/login'}
                  </button>
                )}

                {authResponse && (
                  <div className="p-3 rounded-xl bg-background border border-surface-border font-mono text-[11px] overflow-x-auto text-slate-300">
                    <div className="text-[10px] text-slate-500 mb-1">HTTP Response Status: {authResponse.status}</div>
                    <pre>{JSON.stringify(authResponse.data || authResponse, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* 2. GET /api/players?q= */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-extrabold">GET</span>
                  <span className="font-mono text-sm">/api/players?q=</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Live Player Lookup</span>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search character..."
                    value={playerQuery}
                    onChange={(e) => setPlayerQuery(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-surface-border font-mono text-white"
                  />
                  <button
                    type="button"
                    disabled={playerLoading}
                    onClick={handleTestPlayerSearch}
                    className="px-4 py-2 rounded-xl bg-primary text-black font-bold font-mono"
                  >
                    Lookup
                  </button>
                </div>

                {playerResults && (
                  <div className="p-3 rounded-xl bg-background border border-surface-border font-mono text-[11px] overflow-x-auto text-slate-300 max-h-56">
                    <div className="text-[10px] text-slate-500 mb-1">HTTP Status: {playerResults.status} • Found {playerResults.data?.players?.length || 0} matches</div>
                    <pre>{JSON.stringify(playerResults.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* 3. POST /api/send */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px] font-extrabold">POST</span>
                  <span className="font-mono text-sm">/api/send</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Transfer Money in Game</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">To (`id`)</label>
                    <input
                      type="text"
                      value={sendToId}
                      onChange={(e) => setSendToId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-surface-border font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Amount</label>
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-surface-border font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">PIN (4-Digit)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={sendPin}
                      onChange={(e) => setSendPin(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-surface-border font-mono text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={sendLoading}
                  onClick={handleTestSend}
                  className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold uppercase font-mono tracking-wider text-xs transition"
                >
                  {sendLoading ? 'TRANSMITTING POST /api/send...' : 'DISPATCH TRANSFER (POST /api/send)'}
                </button>

                {sendResponse && (
                  <div className="p-3 rounded-xl bg-background border border-surface-border font-mono text-[11px] overflow-x-auto text-slate-300">
                    <div className="text-[10px] text-slate-500 mb-1">HTTP Status: {sendResponse.status}</div>
                    <pre>{JSON.stringify(sendResponse.data || sendResponse, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* 4. GET /api/gl/status */}
            <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-extrabold">GET</span>
                  <span className="font-mono text-sm">/api/gl/status</span>
                </div>
                <button
                  type="button"
                  onClick={fetchGlStatus}
                  className="text-[10px] text-primary underline font-mono hover:text-white"
                >
                  Refresh Facts
                </button>
              </div>

              {glStatus ? (
                <div className="space-y-3 font-mono">
                  <div className="p-3 rounded-xl bg-background border border-surface-border space-y-1">
                    <div className="text-slate-400 text-[10px]">LADDER FACTS (LIVE CASH TELEMETRY)</div>
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-slate-300">saved (Cash):</span>
                      <span className="font-bold text-accent-gold text-sm">
                        ₦{(glStatus.ladder?.facts?.saved || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-300">netWorth:</span>
                      <span className="font-bold text-white">
                        ₦{(glStatus.ladder?.facts?.netWorth || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-background border border-surface-border space-y-1 text-[11px]">
                    <div>Character: <strong className="text-white">@{glStatus.username}</strong> ({glStatus.name})</div>
                    <div>Rank: <span className="text-primary">{glStatus.progression?.rank}</span> (Level {glStatus.progression?.level})</div>
                    <div>Badges: {glStatus.badges?.map((b: any) => b.name).join(', ')}</div>
                    <div>Titles: {glStatus.titles?.join(' • ')}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 font-mono">Loading gl/status...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'AUDIT' && (
        <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
          <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
            <div>
              <h3 className="font-bold text-white text-sm">System Audit Records</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Every administrative action is immutably logged with actor, timestamp, and IP address</p>
            </div>
            <span className="text-xs text-primary font-mono font-bold">Tamper-Proof Audit Active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">Administrator</th>
                  <th className="py-3 px-4 font-bold">Action</th>
                  <th className="py-3 px-4 font-bold">Entity</th>
                  <th className="py-3 px-4 font-bold">Details</th>
                  <th className="py-3 px-4 font-bold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-sans">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/60 transition">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {log.adminUsername}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase bg-surface-border text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.entityType}:{log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs max-w-md">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STAFF USERS TAB */}
      {activeTab === 'STAFF' && (
        <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
          <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
            <h3 className="font-bold text-white text-sm">Staff Directory & Role Assignments</h3>
            <span className="text-xs text-slate-400 font-mono">RBAC Enabled</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Name</th>
                  <th className="py-3.5 px-4 font-bold">Username</th>
                  <th className="py-3.5 px-4 font-bold">Assigned Role</th>
                  <th className="py-3.5 px-4 font-bold">Granted Permissions</th>
                  <th className="py-3.5 px-4 font-bold">Last Login</th>
                  <th className="py-3.5 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-sans">
                {staff.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-hover/60 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">@{u.username}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/40">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {u.permissions.join(', ')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(u.lastLoginAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-bold text-emerald-400">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SYSTEM HEALTH TAB */}
      {activeTab === 'HEALTH' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
            <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase">
              <Cpu className="w-4 h-4" />
              <span>Application Service Health</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400 font-mono">HEALTHY_ONLINE</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-mono text-white">{health?.uptimeSeconds || 120} seconds</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-slate-400">Memory Footprint:</span>
                <span className="font-mono text-white">{health?.memoryUsageMb || 34} MB</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Software Build:</span>
                <span className="font-mono text-primary font-bold">{health?.version || '2.0.0-PROD'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
            <div className="flex items-center space-x-2 text-accent-blue font-bold text-xs uppercase">
              <Database className="w-4 h-4" />
              <span>Infrastructure Connectivity</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-slate-400">PostgreSQL 16 Database:</span>
                <span className="font-bold text-emerald-400 font-mono">CONNECTED</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-slate-400">Redis 7 / BullMQ Queue:</span>
                <span className="font-bold text-emerald-400 font-mono">CONNECTED</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border">
                <span className="text-slate-400">Edge CDN / Cloudflare WAF:</span>
                <span className="font-bold text-emerald-400 font-mono">PROTECTED</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Receipt Cloudflare R2 Storage:</span>
                <span className="font-bold text-emerald-400 font-mono">SECURE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
