import React from 'react';
import { Package, CreditCard, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 border-t border-slate-800/80">
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          How It Works
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Three simple steps to buy your in-game money.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
            01
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Choose your money package</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Select the amount of Lagos Life cash you want and enter your in-game username.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-mono font-bold text-sm flex items-center justify-center mb-4">
            02
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Pay through bank transfer</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Copy the business account number, transfer the exact Naira amount, and tap "I Have Paid".
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-left">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-mono font-bold text-sm flex items-center justify-center mb-4">
            03
          </div>
          <h3 className="text-base font-bold text-white mb-1.5">Receive your Lagos Life money</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We confirm the bank credit and transfer the money directly to your character in-game.
          </p>
        </div>
      </div>
    </section>
  );
};
