import React from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle2, ArrowRight } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Array<{ id: string; type: 'URGENT' | 'WARNING' | 'INFO'; message: string; timestamp: string }>;
  onNavigate: (view: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onNavigate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-surface border-l border-surface-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between bg-background">
          <div>
            <h3 className="text-base font-extrabold text-white">Alerts & Notifications</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time operational alerts</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface-border/50 hover:bg-surface-border text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2 opacity-80" />
              <p className="font-bold text-white">All Clear!</p>
              <p className="mt-1">No pending verification or low inventory warnings.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border text-xs relative ${
                  alert.type === 'URGENT'
                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : alert.type === 'WARNING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                }`}
              >
                <div className="flex items-start space-x-2.5">
                  {alert.type === 'URGENT' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : alert.type === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold uppercase tracking-wider text-[10px] mb-1">
                      {alert.type} PRIORITY
                    </div>
                    <p className="leading-relaxed">{alert.message}</p>
                    <div className="mt-3 flex justify-between items-center text-[10px] opacity-75">
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => {
                          if (alert.id.includes('review')) onNavigate('payments');
                          else if (alert.id.includes('deliv')) onNavigate('delivery');
                          else if (alert.id.includes('stock')) onNavigate('inventory');
                          onClose();
                        }}
                        className="font-bold underline hover:opacity-100 flex items-center space-x-0.5"
                      >
                        <span>Take Action</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
