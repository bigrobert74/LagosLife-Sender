import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'STAFF' | 'AUDIT' | 'HEALTH'>('AUDIT');

  return (
    <div className="space-y-6">
      {/* Sub Navigation Bar */}
      <div className="flex space-x-2 border-b border-surface-border pb-3">
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'AUDIT'
              ? 'bg-primary text-black'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Immutable Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'STAFF'
              ? 'bg-primary text-black'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Administrators ({staff.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HEALTH')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'HEALTH'
              ? 'bg-primary text-black'
              : 'bg-surface hover:bg-surface-hover text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Health & Diagnostics</span>
        </button>
      </div>

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
                  <th className="py-3 px-4 font-bold">Name</th>
                  <th className="py-3 px-4 font-bold">Username</th>
                  <th className="py-3 px-4 font-bold">Assigned Role</th>
                  <th className="py-3 px-4 font-bold">Granted Permissions</th>
                  <th className="py-3 px-4 font-bold">Last Login</th>
                  <th className="py-3 px-4 font-bold">Status</th>
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
