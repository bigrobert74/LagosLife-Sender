import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PackageGrid } from './components/PackageGrid';
import { PlayerSearchLookup, LagosLifePlayer } from './components/PlayerSearchLookup';
import { HowItWorks } from './components/HowItWorks';
import { TrustSection } from './components/TrustSection';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { SupportModal } from './components/SupportModal';
import { TermsModal } from './components/TermsModal';
import { PACKAGES as FALLBACK_PACKAGES, CurrencyPackage } from './data/packages';
import { ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Sparkles, Coins } from 'lucide-react';

export default function App() {
  // Packages State
  const [packages, setPackages] = useState<CurrencyPackage[]>(FALLBACK_PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState<CurrencyPackage | null>(FALLBACK_PACKAGES[1] || FALLBACK_PACKAGES[0]);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customTrillionInput, setCustomTrillionInput] = useState<string>('2');
  const [selectedPlayer, setSelectedPlayer] = useState<LagosLifePlayer | null>(null);
  const [typedUsername, setTypedUsername] = useState<string>('');
  const [confirmedSettings, setConfirmedSettings] = useState<boolean>(true);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Active Order & Modals
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState<boolean>(false);
  const [trackedOrderNum, setTrackedOrderNum] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);
  const [termsTab, setTermsTab] = useState<'terms' | 'privacy'>('terms');

  // Live Bank Details State
  const [liveBankDetails, setLiveBankDetails] = useState<{
    bankName: string;
    accountName: string;
    accountNumber: string;
  }>({
    bankName: 'Moniepoint Microfinance Bank',
    accountName: 'Lagos Life Virtual Hub',
    accountNumber: '8123456789',
  });

  // Fetch Live Packages from Backend
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/packages');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setPackages(json.data);
            if (!selectedPkg) {
              setSelectedPkg(json.data[0]);
            }
          }
        }
      } catch (err) {
        // Silently use fallback packages if API is offline
      }
    };
    fetchPackages();
  }, []);

  // Fetch Live Bank Settings from Backend
  useEffect(() => {
    const fetchLiveBank = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/orders/bank-instructions');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setLiveBankDetails({
              bankName: json.data.bankName,
              accountName: json.data.accountName,
              accountNumber: json.data.accountNumber,
            });
          }
        }
      } catch (e) {
        // Keep fallback
      }
    };
    fetchLiveBank();
    const interval = setInterval(fetchLiveBank, 3000);
    return () => clearInterval(interval);
  }, []);

  // Custom Trillions calculations (₦8,000 per 1 Trillion)
  const parsedTrillions = Math.max(0.1, parseFloat(customTrillionInput) || 1);
  const customCurrencyAmount = Math.round(parsedTrillions * 1_000_000_000_000).toString();
  const customNairaPrice = Math.round(parsedTrillions * 8000);
  const customFormattedAmount = Number.isInteger(parsedTrillions)
    ? `${parsedTrillions} Trillion`
    : `${parseFloat(parsedTrillions.toFixed(2))} Trillion`;

  const scrollToPackages = () => {
    const el = document.getElementById('packages-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPurchaseForm = () => {
    const el = document.getElementById('purchase-form-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectPackage = (pkg: CurrencyPackage) => {
    setIsCustomMode(false);
    setSelectedPkg(pkg);
    scrollToPurchaseForm();
  };

  const handleSelectCustom = () => {
    setIsCustomMode(true);
    scrollToPurchaseForm();
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingOrder) return;

    if (isCustomMode) {
      if (parsedTrillions < 1.1) {
        setOrderError('Custom orders are for amounts greater than 1 Trillion. Please enter 1.1 Trillion or higher.');
        return;
      }
    } else if (!selectedPkg) {
      setOrderError('Please select a money package.');
      scrollToPackages();
      return;
    }

    const finalUsername = (typedUsername.trim() || selectedPlayer?.username || '').trim();
    if (!finalUsername || finalUsername.length < 2) {
      setOrderError('Please enter your Lagos Life character username.');
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError(null);

    const targetCashCurrency = isCustomMode ? customCurrencyAmount : String(selectedPkg?.gameCurrencyAmount);
    const targetFormattedGame = isCustomMode ? customFormattedAmount : String(selectedPkg?.formattedGameAmount);
    const targetNairaPrice = isCustomMode ? customNairaPrice : Number(selectedPkg?.nairaPrice || 0);

    const payload = isCustomMode
      ? {
          customAmount: customCurrencyAmount,
          packageId: 'custom',
          gameUsername: finalUsername,
          targetPlayerId: selectedPlayer?.id || `usr-${finalUsername.toLowerCase()}`,
        }
      : {
          packageId: selectedPkg?.id,
          gameUsername: finalUsername,
          targetPlayerId: selectedPlayer?.id || `usr-${finalUsername.toLowerCase()}`,
        };

    try {
      const res = await fetch('http://localhost:3000/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const newOrder = {
          orderNumber: String(data.orderNumber || `LL-${Math.floor(100000 + Math.random() * 900000)}`),
          gameUsername: String(data.gameUsername || finalUsername),
          gameCurrencyAmount: String(data.gameCurrencyAmount || targetCashCurrency),
          formattedGameAmount: String(data.formattedGameAmount || targetFormattedGame),
          totalNairaAmount: Number(data.amountToPayNaira || data.totalNairaAmount || targetNairaPrice),
          bankName: String(data.bankInstructions?.bankName || data.bankName || liveBankDetails.bankName || 'OPAY'),
          accountName: String(data.bankInstructions?.accountName || data.accountName || liveBankDetails.accountName || 'KELVIN'),
          accountNumber: String(data.bankInstructions?.accountNumber || data.accountNumber || liveBankDetails.accountNumber || '9036627043'),
          status: String(data.status || 'PENDING_PAYMENT'),
        };
        setActiveOrder(newOrder);
        setIsCheckoutOpen(true);
        setIsSubmittingOrder(false);
        return;
      }
    } catch (err) {
      console.warn('API order creation offline, using local client order session', err);
    }

    // Fallback order generation if API is restarting
    const orderNumber = `LL-${Math.floor(100000 + Math.random() * 900000)}`;
    const fallbackOrder = {
      orderNumber,
      gameUsername: finalUsername,
      gameCurrencyAmount: targetCashCurrency,
      formattedGameAmount: targetFormattedGame,
      totalNairaAmount: targetNairaPrice,
      bankName: String(liveBankDetails.bankName || 'OPAY'),
      accountName: String(liveBankDetails.accountName || 'KELVIN'),
      accountNumber: String(liveBankDetails.accountNumber || '9036627043'),
      status: 'PENDING_PAYMENT',
    };
    setActiveOrder(fallbackOrder);
    setIsCheckoutOpen(true);
    setIsSubmittingOrder(false);
  };

  const handleOpenTrackerWithNumber = (orderNumber: string) => {
    setTrackedOrderNum(orderNumber);
    setIsTrackerOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-400 selection:text-slate-950">
      {/* 1. Header / Navigation */}
      <Navbar
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateBuy={scrollToPackages}
        onOpenTracker={() => {
          setTrackedOrderNum(activeOrder?.orderNumber || '');
          setIsTrackerOpen(true);
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenFAQ={() => {
          const el = document.getElementById('faq-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* 2. Hero Section */}
        <Hero
          onScrollToPackages={scrollToPackages}
          onOpenTracker={() => setIsTrackerOpen(true)}
        />

        {/* 3. Available Packages Grid */}
        <PackageGrid
          packages={packages}
          selectedPackage={selectedPkg}
          onSelectPackage={handleSelectPackage}
          isCustomSelected={isCustomMode}
          onSelectCustom={handleSelectCustom}
          customFormattedAmount={customFormattedAmount}
          customNairaPrice={customNairaPrice}
        />

        {/* 4. Dedicated Buy Money Form & Username Input */}
        <section
          id="purchase-form-section"
          className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
        >
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-left shadow-xl">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>STEP 2: RECIPIENT & REVIEW</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Review Package & Enter Username
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Confirm your selected package and enter your Lagos Life character username to proceed.
            </p>

            <form onSubmit={handleCreateOrder} className="mt-6 space-y-5">
              {/* Order Mode Switcher: Pre-set Packages vs Custom Trillions */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    !isCustomMode
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Standard Packages</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                    isCustomMode
                      ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Custom Amount (&gt; 1 Trillion)</span>
                </button>
              </div>

              {/* Type In Amount Form (When Custom Trillions Mode is Active) */}
              {isCustomMode && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Type In Cash Amount (Trillions)</span>
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Buy any custom amount above 1 Trillion.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        ₦8,000 / 1 Trillion
                      </span>
                    </div>
                  </div>

                  {/* Number Input */}
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      max="100"
                      value={customTrillionInput}
                      onChange={(e) => setCustomTrillionInput(e.target.value)}
                      placeholder="e.g. 2.5"
                      className="w-full pl-4 pr-24 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-400"
                    />
                    <div className="absolute right-3 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                      TRILLION
                    </div>
                  </div>

                  {/* Quick Select Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-400">Quick Select:</span>
                    {[1.5, 2, 3, 5, 10, 20].map((trill) => (
                      <button
                        key={trill}
                        type="button"
                        onClick={() => setCustomTrillionInput(trill.toString())}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                          customTrillionInput === trill.toString()
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                        }`}
                      >
                        {trill}T
                      </button>
                    ))}
                  </div>

                  {/* Live Charge Breakdown */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Exact In-Game Cash</span>
                      <span className="text-white font-bold text-sm">
                        ₦LL {Number(customCurrencyAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase">Accurate Charge</span>
                      <span className="text-emerald-400 font-black text-base">
                        ₦{customNairaPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Package / Order Summary Capsule */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase text-slate-400 font-semibold">
                    {isCustomMode ? 'Custom Money Order' : 'Selected Money Package'}
                  </span>
                  <div className="text-lg font-extrabold text-white font-sans mt-0.5">
                    {isCustomMode ? `${customFormattedAmount}` : (selectedPkg?.formattedGameAmount || '1 Billion')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase text-slate-400 font-semibold">
                    Amount Payable
                  </span>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    ₦{(isCustomMode ? customNairaPrice : Number(selectedPkg?.nairaPrice || 0)).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Username Input with Inline Search & Validation */}
              <PlayerSearchLookup
                selectedPlayer={selectedPlayer}
                onSelectPlayer={(player) => {
                  setSelectedPlayer(player);
                  setTypedUsername(player.username);
                }}
                onUsernameChange={(val) => setTypedUsername(val)}
                onClear={() => {
                  setSelectedPlayer(null);
                  setTypedUsername('');
                }}
              />

              {/* In-Game Phone Setting Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2.5">
                <input
                  type="checkbox"
                  id="phone-setting"
                  checked={confirmedSettings}
                  onChange={(e) => setConfirmedSettings(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900 shrink-0 cursor-pointer"
                />
                <label htmlFor="phone-setting" className="cursor-pointer text-slate-400 leading-relaxed">
                  I confirm that my Lagos Life in-game character phone setting is set to <strong className="text-white">"Anyone"</strong> so the owner character can transfer cash into my account.
                </label>
              </div>

              {orderError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingOrder || !confirmedSettings || (typedUsername.trim().length < 2 && !selectedPlayer)}
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-md hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>CREATING ORDER...</span>
                  </>
                ) : (
                  <>
                    <span>CONTINUE TO PAYMENT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* 5. How It Works */}
        <HowItWorks />

        {/* 6. Trust & Support Banner */}
        <TrustSection onOpenSupport={() => setIsSupportOpen(true)} />

        {/* 7. FAQ */}
        <FAQ />
      </main>

      {/* 8. Footer */}
      <Footer
        onNavigateHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNavigateBuy={scrollToPackages}
        onOpenTracker={() => setIsTrackerOpen(true)}
        onOpenFAQ={() => {
          const el = document.getElementById('faq-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenTerms={() => {
          setTermsTab('terms');
          setIsTermsOpen(true);
        }}
        onOpenPrivacy={() => {
          setTermsTab('privacy');
          setIsTermsOpen(true);
        }}
      />

      {/* MODALS */}
      {/* Checkout Modal (Copy & Pay + Payment Submitted) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        orderData={activeOrder}
        onPaymentSubmitted={(data) => {
          console.log('Payment submitted proof:', data);
        }}
        onOpenSupport={() => setIsSupportOpen(true)}
        onTrackOrder={handleOpenTrackerWithNumber}
      />

      {/* Order Tracker Modal */}
      <OrderTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        initialOrderNumber={trackedOrderNum || activeOrder?.orderNumber}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* Customer Order History Modal */}
      <OrderHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onTrackOrder={handleOpenTrackerWithNumber}
      />

      {/* Customer Support Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        activeOrderNumber={activeOrder?.orderNumber}
      />

      {/* Terms & Privacy Modal */}
      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        initialTab={termsTab}
      />
    </div>
  );
}
