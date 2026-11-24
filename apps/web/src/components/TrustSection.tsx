import React from 'react';
import { ShieldCheck, MessageCircle } from 'lucide-react';

interface TrustSectionProps {
  onOpenSupport: () => void;
}

export const TrustSection: React.FC<TrustSectionProps> = ({ onOpenSupport }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-t border-slate-800/80">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Manual Bank Verification Before Fulfillment</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xl leading-relaxed">
              Every customer transfer is independently verified against official Nigerian bank statements before in-game money is transferred. We never automate debiting or use third-party payment gateways.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={onOpenSupport}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-2 transition"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Contact Customer Support</span>
          </button>
        </div>
      </div>
    </section>
  );
};
