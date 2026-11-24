import React from 'react';
import { MessageCircle } from 'lucide-react';

interface FooterProps {
  onNavigateHome: () => void;
  onNavigateBuy: () => void;
  onOpenTracker: () => void;
  onOpenFAQ: () => void;
  onOpenSupport: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateBuy,
  onOpenTracker,
  onOpenFAQ,
  onOpenSupport,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pb-10 border-b border-slate-800/80">
          {/* Brand Info */}
          <div className="max-w-sm">
            <div className="flex items-center space-x-2.5 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-sm">
                ₦
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">
                LAGOS LIFE <span className="text-emerald-400">MONEY</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Virtual currency marketplace for Lagos Life players. Fast, human-verified in-game currency deliveries via manual bank transfer.
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div>
              <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
                Purchasing
              </div>
              <ul className="space-y-2">
                <li>
                  <button onClick={onNavigateHome} className="hover:text-white transition">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={onNavigateBuy} className="hover:text-white transition">
                    Buy Money
                  </button>
                </li>
                <li>
                  <button onClick={onOpenTracker} className="hover:text-white transition">
                    Track Order
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
                Help & Support
              </div>
              <ul className="space-y-2">
                <li>
                  <button onClick={onOpenFAQ} className="hover:text-white transition">
                    FAQ
                  </button>
                </li>
                <li>
                  <button onClick={onOpenSupport} className="hover:text-white transition">
                    Contact Support
                  </button>
                </li>
                <li>
                  <a
                    href="https://wa.me/2348012345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-emerald-400 transition flex items-center space-x-1"
                  >
                    <span>WhatsApp</span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
                Policies
              </div>
              <ul className="space-y-2">
                <li>
                  <button onClick={onOpenTerms} className="hover:text-white transition">
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button onClick={onOpenPrivacy} className="hover:text-white transition">
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} Lagos Life Money. Virtual gaming currency only. Not legal tender.
          </p>
          <p>
            Independent third-party purchasing service.
          </p>
        </div>
      </div>
    </footer>
  );
};
