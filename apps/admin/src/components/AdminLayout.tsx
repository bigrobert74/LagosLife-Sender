import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Truck,
  Coins,
  Users,
  DollarSign,
  TrendingUp,
  Tag,
  Bell,
  MessageCircle,
  Building,
  UserCheck,
  Shield,
  Lock,
  History,
  Settings,
  Activity,
  Search,
  LogOut,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  User,
  Key,
  RotateCw,
  Zap,
  Smartphone,
  Volume2,
} from 'lucide-react';

import { AdminDashboardView } from './AdminDashboardView';
import { OrdersManagementView } from './OrdersManagementView';
import { PaymentVerificationView } from './PaymentVerificationView';
import { InventoryLedgerView } from './InventoryLedgerView';
import { BankAccountSettingsView } from './BankAccountSettingsView';
import { CustomersView } from './CustomersView';
import { StaffAuditSettingsView } from './StaffAuditSettingsView';
import { OwnerAccountConnectionView } from './OwnerAccountConnectionView';
import { AutomaticFulfillmentSettingsView } from './AutomaticFulfillmentSettingsView';
import { FulfillmentQueueView } from './FulfillmentQueueView';
import { OrderDetailsModal } from './OrderDetailsModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationDrawer } from './NotificationDrawer';
import { PhoneAlertsModal } from './PhoneAlertsModal';
import { playOrderAlertChime, triggerSystemNotification } from '../utils/notifications';
import { AdminUserSession } from './AdminLoginScreen';

interface AdminLayoutProps {
  adminUser: AdminUserSession;
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ adminUser, onLogout }) => {
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [inspectedOrder, setInspectedOrder] = useState<any | null>(null);
  const [isPhoneAlertsOpen, setIsPhoneAlertsOpen] = useState<boolean>(false);
  const [activeToast, setActiveToast] = useState<{
    id: string;
    title: string;
    subtitle: string;
    order: any;
    isUrgent: boolean;
  } | null>(null);

  const prevOrdersRef = React.useRef<Map<string, string> | null>(null);

  // Auto-dismiss in-app notification toast after 8 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => setActiveToast(null), 8000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Live Data State fetched from backend
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [bankSettings, setBankSettings] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  const fetchAdminData = async () => {
    try {
      const [
        overviewRes,
        analyticsRes,
        alertsRes,
        ordersRes,
        inventoryRes,
        ledgerRes,
        bankRes,
        custRes,
        staffRes,
        auditRes,
        healthRes,
      ] = await Promise.all([
        fetch('http://localhost:3000/api/v1/admin/dashboard/overview').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/dashboard/analytics').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/dashboard/alerts').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/orders').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/inventory').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/inventory/ledger').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/settings/bank-account').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/customers').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/staff').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/audit-logs').then((r) => r.json()),
        fetch('http://localhost:3000/api/v1/admin/health').then((r) => r.json()),
      ]);

      if (overviewRes?.success) setOverview(overviewRes.data);
      if (analyticsRes?.success) setAnalytics(analyticsRes.data);
      if (alertsRes?.success) setAlerts(alertsRes.data);
      if (ordersRes?.success && Array.isArray(ordersRes.data?.orders)) {
        const currentOrders: any[] = ordersRes.data.orders;
        setOrders(currentOrders);

        // Live notification detection: detect new orders or payment submissions
        if (prevOrdersRef.current !== null) {
          for (const order of currentOrders) {
            const prevStatus = prevOrdersRef.current.get(order.orderNumber);
            if (!prevStatus) {
              // Brand new order placed!
              playOrderAlertChime(false);
              const title = `💰 New Order #${order.orderNumber}`;
              const subtitle = `@${order.gameUsername} bought ${order.formattedGameAmount} for ₦${Number(order.totalNairaAmount).toLocaleString()}`;
              triggerSystemNotification(title, subtitle, () => setInspectedOrder(order));
              setActiveToast({
                id: order.orderNumber,
                title: '💰 NEW ORDER PLACED!',
                subtitle,
                order,
                isUrgent: false,
              });
              break;
            } else if (prevStatus === 'PENDING_PAYMENT' && order.status === 'PAYMENT_UNDER_REVIEW') {
              // Payment proof submitted by buyer!
              playOrderAlertChime(true);
              const title = `🚨 Payment Received #${order.orderNumber}`;
              const subtitle = `@${order.gameUsername} submitted transfer for ₦${Number(order.totalNairaAmount).toLocaleString()}`;
              triggerSystemNotification(title, subtitle, () => setInspectedOrder(order));
              setActiveToast({
                id: order.orderNumber,
                title: '🚨 PAYMENT PROOF SUBMITTED!',
                subtitle,
                order,
                isUrgent: true,
              });
              break;
            }
          }
        }

        // Update tracking map
        const newMap = new Map<string, string>();
        for (const o of currentOrders) {
          newMap.set(o.orderNumber, o.status);
        }
        prevOrdersRef.current = newMap;
      }
      if (inventoryRes?.success) setInventory(inventoryRes.data);
      if (ledgerRes?.success) setLedger(ledgerRes.data);
      if (bankRes?.success) setBankSettings(bankRes.data);
      if (custRes?.success) setCustomers(custRes.data);
      if (staffRes?.success) setStaff(staffRes.data);
      if (auditRes?.success) setAuditLogs(auditRes.data);
      if (healthRes?.success) setHealth(healthRes.data);
    } catch (err) {
      console.warn('Backend offline or simulated mode fallback active:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyPayment = async (orderNumber: string, data: any) => {
    try {
      await fetch(`http://localhost:3000/api/v1/admin/orders/${orderNumber}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectPayment = async (orderNumber: string, data: any) => {
    try {
      await fetch(`http://localhost:3000/api/v1/admin/orders/${orderNumber}/reject-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustInventory = async (data: any) => {
    try {
      await fetch('http://localhost:3000/api/v1/admin/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReconcile = async (data: any) => {
    try {
      await fetch('http://localhost:3000/api/v1/admin/inventory/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBank = async (updated: any) => {
    try {
      await fetch('http://localhost:3000/api/v1/admin/settings/bank-account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { section: 'MAIN' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Package, badge: orders.length },
    { id: 'payments', label: 'Payment Verification', icon: CreditCard, badge: overview?.kpiCards?.pendingReview, alert: true },
    { id: 'fulfillment-queue', label: 'Fulfillment Pipeline', icon: RotateCw },
    { id: 'inventory', label: 'Inventory & Ledger', icon: Coins },
    { id: 'customers', label: 'Customers', icon: Users },
    { section: 'OWNER & AUTOMATION' },
    { id: 'owner-account', label: 'Owner Account Link', icon: Key },
    { id: 'fulfillment-settings', label: 'Fulfillment Rules', icon: Zap },
    { section: 'SYSTEM CONFIG' },
    { id: 'banking', label: 'Bank Settings', icon: Building },
    { id: 'audit', label: 'Audit & Staff', icon: Shield },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
      case 'PAYMENT_ADMIN':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'DELIVERY_ADMIN':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface/90 backdrop-blur-md h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl bg-surface-card border border-surface-border md:hidden text-slate-300"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2 font-black text-base sm:text-lg">
            <span className="text-white">LAGOS<span className="text-primary">LIFE</span></span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-card text-primary border border-primary/30 hidden sm:inline-block">
              CONTROL CENTRE
            </span>
          </div>
        </div>

        {/* Global Controls & Staff Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-surface-border bg-surface-card hover:border-primary/50 text-xs text-slate-400 hover:text-white transition"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline font-mono bg-surface-border px-1.5 py-0.5 rounded text-[10px]">Ctrl+K</kbd>
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-2 rounded-xl bg-surface-card border border-surface-border text-slate-300 hover:text-white transition"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            {alerts && alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            )}
          </button>

          {/* Instant Phone Alerts Quick-Connect Button */}
          <button
            onClick={() => setIsPhoneAlertsOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition shadow-sm shrink-0"
            title="Configure iPhone & Android instant lock-screen push notifications"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">📱 Phone Alerts</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          </button>

          {/* Customer Storefront Link */}
          <a
            href={(import.meta as any).env?.VITE_STOREFRONT_URL || 'https://lagos-life-web.pages.dev'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-surface-border bg-surface-card text-slate-300 hover:text-white text-xs font-semibold transition"
            title="Open Customer Storefront in new tab"
          >
            <span>Customer Site</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* Authenticated Staff Pill */}
          <div className="flex items-center space-x-2 pl-2 border-l border-surface-border">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary/30 to-accent-blue/30 border border-primary/40 flex items-center justify-center font-bold text-xs text-white uppercase font-mono shrink-0">
              {adminUser.username.slice(0, 2)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white leading-tight">
                {adminUser.name}
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${getRoleBadge(adminUser.role)}`}>
                  {adminUser.role.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Explicit Sign Out Button */}
            <button
              onClick={onLogout}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition text-xs font-bold flex items-center space-x-1 shrink-0"
              title="Secure Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
            aria-hidden="true"
          />
        )}

        {/* Fixed Collapsible Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-surface-border transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-surface-border flex justify-between items-center md:hidden">
            <span className="font-bold text-sm text-white">Admin Navigation</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-lg text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
            {navItems.map((item, idx) => {
              if (item.section) {
                return (
                  <div key={idx} className="pt-4 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {item.section}
                  </div>
                );
              }
              const Icon = item.icon!;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id!);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                    isActive
                      ? 'bg-primary text-black font-extrabold shadow-md shadow-primary/20'
                      : 'text-slate-300 hover:bg-surface-hover hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        isActive
                          ? 'bg-black text-primary'
                          : item.alert
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-surface-border text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {activeView === 'dashboard' && (
              <AdminDashboardView
                overview={overview}
                analytics={analytics}
                alerts={alerts}
                orders={orders}
                onNavigate={(v) => setActiveView(v)}
                onViewOrder={(o) => setInspectedOrder(o)}
              />
            )}

            {activeView === 'orders' && (
              <OrdersManagementView
                orders={orders}
                onViewOrder={(o) => setInspectedOrder(o)}
                onCancelOrder={() => {}}
              />
            )}

            {activeView === 'payments' && (
              <PaymentVerificationView
                orders={orders}
                onVerifyPayment={handleVerifyPayment}
                onRejectPayment={handleRejectPayment}
                onViewOrder={(o) => setInspectedOrder(o)}
              />
            )}

            {activeView === 'fulfillment-queue' && (
              <FulfillmentQueueView
                onManualDelivery={(num) => {
                  setActiveView('orders');
                }}
              />
            )}

            {activeView === 'owner-account' && <OwnerAccountConnectionView />}

            {activeView === 'fulfillment-settings' && <AutomaticFulfillmentSettingsView />}

            {activeView === 'inventory' && inventory && (
              <InventoryLedgerView
                inventory={inventory}
                ledger={ledger}
                onAdjustBalance={handleAdjustInventory}
                onReconcile={handleReconcile}
              />
            )}

            {activeView === 'customers' && <CustomersView customers={customers} />}

            {activeView === 'banking' && bankSettings && (
              <BankAccountSettingsView
                bankSettings={bankSettings}
                onUpdateBankSettings={handleUpdateBank}
              />
            )}

            {activeView === 'audit' && (
              <StaffAuditSettingsView
                staff={staff}
                auditLogs={auditLogs}
                health={health}
                systemSettings={{}}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <OrderDetailsModal
        isOpen={!!inspectedOrder}
        onClose={() => setInspectedOrder(null)}
        order={inspectedOrder}
        onVerifyPayment={(num) => {
          setInspectedOrder(null);
          setActiveView('payments');
        }}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectOrder={(num) => {
          const found = orders.find((o) => o.orderNumber === num);
          if (found) setInspectedOrder(found);
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        alerts={alerts}
        onNavigate={(v) => setActiveView(v)}
      />

      <PhoneAlertsModal
        isOpen={isPhoneAlertsOpen}
        onClose={() => setIsPhoneAlertsOpen(false)}
      />

      {/* Live Glowing In-App Notification Toast */}
      {activeToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-4 fade-in duration-300 shadow-2xl">
          <div
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start space-x-3 text-left ${
              activeToast.isUrgent
                ? 'bg-amber-950/95 border-amber-500/70 text-white shadow-amber-500/20'
                : 'bg-emerald-950/95 border-emerald-500/70 text-white shadow-emerald-500/20'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                activeToast.isUrgent ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-black'
              }`}
            >
              <Volume2 className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-xs uppercase tracking-wider">
                {activeToast.title}
              </div>
              <div className="text-xs text-slate-200 mt-0.5 line-clamp-2">
                {activeToast.subtitle}
              </div>
              <div className="mt-2.5 flex items-center space-x-2">
                <button
                  onClick={() => {
                    setInspectedOrder(activeToast.order);
                    setActiveToast(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white text-black text-xs font-bold hover:bg-slate-200 transition"
                >
                  Inspect Order
                </button>
                <button
                  onClick={() => setActiveToast(null)}
                  className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-xs text-slate-300 transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
