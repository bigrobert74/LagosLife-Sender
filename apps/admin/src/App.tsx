import React, { useState, useEffect } from 'react';
import { AdminLoginScreen, AdminUserSession } from './components/AdminLoginScreen';
import { AdminLayout } from './components/AdminLayout';

export default function App() {
  const [adminUser, setAdminUser] = useState<AdminUserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Check persisted admin session on workstation
    const saved = localStorage.getItem('lagos_admin_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) {
          setAdminUser(parsed);
        }
      } catch (err) {
        console.warn('Invalid session payload in storage:', err);
        localStorage.removeItem('lagos_admin_session');
      }
    }
    setIsInitializing(false);
  }, []);

  const handleLogout = () => {
    if (adminUser) {
      fetch('http://localhost:3000/api/v1/admin/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUsername: adminUser.username }),
      }).catch(() => {});
    }
    localStorage.removeItem('lagos_admin_session');
    setAdminUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#080C14] flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-ping" />
          <span>INITIALIZING SECURITY PROTOCOLS...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return <AdminLoginScreen onLoginSuccess={(user) => setAdminUser(user)} />;
  }

  return <AdminLayout adminUser={adminUser} onLogout={handleLogout} />;
}
