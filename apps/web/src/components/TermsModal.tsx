import React, { useState } from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left max-h-[88vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Tabs */}
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-4 mb-4">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-2 text-sm font-semibold pb-1 transition border-b-2 ${
              activeTab === 'terms'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms & Conditions</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center space-x-2 text-sm font-semibold pb-1 transition border-b-2 ${
              activeTab === 'privacy'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          {activeTab === 'terms' ? (
            <>
              <h4 className="text-base font-bold text-white">1. Service Nature & Virtual Currency</h4>
              <p>
                Lagos Life Money operates as an independent peer-to-peer virtual currency provider.
                All in-game currency is exclusively delivered within the fictional universe of the Lagos Life simulation game.
                In-game currency has no real-world monetary value, is not legal tender, and cannot be redeemed, sold, or cashed out through this service.
              </p>

              <h4 className="text-base font-bold text-white">2. Purchasing & Manual Verification</h4>
              <p>
                Purchases are conducted via direct manual Nigerian bank transfer. We do not use third-party payment gateways.
                Each bank transfer is independently reviewed and verified by an authorized administrator against official commercial bank statements before any in-game delivery is dispatched.
              </p>

              <h4 className="text-base font-bold text-white">3. Recipient In-Game Handle</h4>
              <p>
                Customers are solely responsible for ensuring the accuracy of the Lagos Life character username provided during order placement.
                Because transfers directly credit character accounts via the live game API, transfers dispatched to a verified username cannot be recalled once completed.
              </p>

              <h4 className="text-base font-bold text-white">4. Delivery Timeframes & Cooldowns</h4>
              <p>
                Deliveries are fulfilled promptly upon payment verification. Orders larger than 100 Billion are transferred in gradual batches with an automated 70-second cooldown timer as enforced by the Lagos Life game server anti-spam protocol.
              </p>

              <h4 className="text-base font-bold text-white">5. Strictly Buy-Only Policy</h4>
              <p>
                We do NOT buy, exchange, cash out, or repurchase Lagos Life currency from players. Any attempts to solicit currency cash-outs will be refused.
              </p>
            </>
          ) : (
            <>
              <h4 className="text-base font-bold text-white">1. Information We Collect</h4>
              <p>
                We only collect information strictly necessary to fulfill your order:
                your Lagos Life character username, the bank transfer sender name or reference you provide to identify your payment, and optional email or WhatsApp contact if you request assistance.
                We never request, store, or have access to your bank login details, card numbers, banking PINs, or game passwords.
              </p>

              <h4 className="text-base font-bold text-white">2. How Information is Used</h4>
              <p>
                Collected information is used exclusively to:
                1) Match your incoming Nigerian bank credit to your order,
                2) Dispatch the in-game currency to your character username via live game transfer, and
                3) Provide customer support regarding your specific purchase.
              </p>

              <h4 className="text-base font-bold text-white">3. Data Retention & Local Storage</h4>
              <p>
                Your previous order numbers are stored locally in your browser's local storage so you can easily track past purchases. We never sell, rent, or share customer data with third parties.
              </p>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
