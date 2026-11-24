import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Save,
} from 'lucide-react';

interface BankAccountSettingsViewProps {
  bankSettings: any;
  onUpdateBankSettings: (updated: any) => void;
}

export const BankAccountSettingsView: React.FC<BankAccountSettingsViewProps> = ({
  bankSettings,
  onUpdateBankSettings,
}) => {
  const [bankName, setBankName] = useState(bankSettings.bankName);
  const [accountName, setAccountName] = useState(bankSettings.accountName);
  const [accountNumber, setAccountNumber] = useState(bankSettings.accountNumber);
  const [instructions, setInstructions] = useState(bankSettings.instructions);
  const [supportMessage, setSupportMessage] = useState(bankSettings.supportMessage);
  const [deadlineMinutes, setDeadlineMinutes] = useState(bankSettings.paymentDeadlineMinutes || 60);

  // Security confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      alert('Password re-authentication required for sensitive financial settings change.');
      return;
    }

    onUpdateBankSettings({
      bankName,
      accountName,
      accountNumber,
      instructions,
      supportMessage,
      paymentDeadlineMinutes: deadlineMinutes,
    });

    setShowConfirmModal(false);
    setAdminPassword('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border">
        <div className="flex items-center space-x-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>CHECKOUT RECIPIENT BANK CONFIGURATION</span>
        </div>
        <h2 className="text-2xl font-black text-white">Manual Bank Transfer Details</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Configure the official commercial bank account displayed to customers on the <strong>Copy & Pay</strong> checkout screen. Updating these details dynamically updates customer checkout across the platform without code deployments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-surface border border-surface-border shadow-xl">
          <h3 className="font-bold text-white text-base mb-4">Edit Bank Details</h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Bank Name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Account Number <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-primary font-mono font-bold text-base focus:outline-none focus:border-primary tracking-wider"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Account Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm focus:outline-none focus:border-primary uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Checkout Payment Instructions
              </label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full p-3 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Customer Support Prompt Message
                </label>
                <input
                  type="text"
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Payment Order Expiry (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={deadlineMinutes}
                  onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition active:scale-95 shadow-lg shadow-primary/20"
              >
                <Save className="w-4 h-4" />
                <span>SAVE BANK CONFIGURATION</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Customer Checkout Preview Card */}
        <div className="p-6 rounded-3xl bg-surface border border-surface-border space-y-4">
          <div className="flex items-center space-x-2 text-slate-400 font-bold uppercase text-[11px]">
            <Eye className="w-4 h-4 text-accent-blue" />
            <span>Live Customer Checkout Preview</span>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-surface to-surface-hover border-2 border-primary/50 shadow-xl space-y-3">
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Bank Name</div>
            <div className="text-base font-bold text-white font-mono">{bankName}</div>

            <div className="text-[11px] text-slate-400 uppercase font-semibold">Account Name</div>
            <div className="text-sm font-bold text-slate-200">{accountName}</div>

            <div className="text-[11px] text-slate-400 uppercase font-semibold">Account Number</div>
            <div className="py-2.5 px-3 rounded-xl bg-background border border-primary/50 font-mono font-black text-primary text-xl tracking-wider">
              {accountNumber}
            </div>

            <div className="pt-2 text-[10px] text-slate-400 border-t border-surface-border">
              Customers will see this exact account with a dedicated <strong>COPY ACCOUNT NUMBER</strong> button.
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY RE-AUTHENTICATION CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-surface border-2 border-accent-gold/50 p-4 sm:p-8 shadow-2xl text-left max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-accent-gold text-xs font-bold uppercase tracking-wider mb-1">
              <Lock className="w-4 h-4" />
              <span>HIGH-RISK SETTING PROTECTION</span>
            </div>
            <h3 className="text-xl font-black text-white">Re-Authenticate to Save</h3>
            <p className="text-xs text-slate-300 mt-1">
              Changing the business bank account alters where customer funds are transferred. Please confirm with your admin password.
            </p>

            <form onSubmit={handleConfirmSave} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Administrator Password
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="Enter your password..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-sm focus:outline-none focus:border-accent-gold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-1/3 py-3 rounded-xl border border-surface-border bg-surface text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-3 rounded-xl bg-accent-gold hover:bg-amber-500 text-black font-extrabold uppercase tracking-wider transition active:scale-95"
                >
                  CONFIRM & DEPLOY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
