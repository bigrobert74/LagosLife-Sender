import React from 'react';
import { X, MessageCircle, Mail, Clock, HelpCircle, ExternalLink } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOrderNumber?: string;
  whatsappSupportLink?: string;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  activeOrderNumber,
  whatsappSupportLink,
}) => {
  if (!isOpen) return null;

  const prefilledMessage = activeOrderNumber
    ? `Hello Lagos Life Support, I need assistance with Order #${activeOrderNumber}`
    : 'Hello Lagos Life Support, I have a question about buying in-game money.';

  const baseWhatsapp = (whatsappSupportLink || 'https://wa.me/2348012345678').trim();
  const separator = baseWhatsapp.includes('?') ? '&' : '?';
  const whatsappUrl = `${baseWhatsapp}${separator}text=${encodeURIComponent(prefilledMessage)}`;
  const mailtoUrl = `mailto:support@lagoslifemoney.shop?subject=${encodeURIComponent(
    activeOrderNumber ? `Order #${activeOrderNumber} Inquiry` : 'Customer Support Request',
  )}&body=${encodeURIComponent(prefilledMessage)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <HelpCircle className="w-4 h-4" />
          <span>CUSTOMER ASSISTANCE</span>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight">Need Help With Your Order?</h3>
        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
          Our team is available to assist with bank verification, username corrections, or delivery status inquiries.
        </p>

        {activeOrderNumber && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Active Order:</span>
            <span className="font-mono font-bold text-emerald-400">#{activeOrderNumber}</span>
          </div>
        )}

        {/* Contact Methods */}
        <div className="mt-5 space-y-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15 transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-emerald-300">
                  WhatsApp Support
                </div>
                <div className="text-xs text-slate-400">Fastest response for active orders</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400" />
          </a>

          <a
            href={mailtoUrl}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800 hover:bg-slate-800 transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-slate-700/50 text-slate-300 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-slate-200">
                  Email Support
                </div>
                <div className="text-xs text-slate-400">support@lagoslifemoney.shop</div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>
        </div>

        {/* Operating Hours Note */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center space-x-2 text-[11px] text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Support hours: 8:00 AM – 11:00 PM (West Africa Time, daily)</span>
        </div>
      </div>
    </div>
  );
};
