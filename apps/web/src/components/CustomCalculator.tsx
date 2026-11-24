import React, { useState } from 'react';
import { Calculator, ArrowRight, Zap, Info } from 'lucide-react';

interface CustomCalculatorProps {
  onProceedCustom: (amountNaira: number, billions: number) => void;
}

export const CustomCalculator: React.FC<CustomCalculatorProps> = ({ onProceedCustom }) => {
  const [billions, setBillions] = useState<number>(75);

  // Dynamic formula: Base ₦20 per billion, discounted for higher volumes
  const ratePerBillion = billions >= 500 ? 10 : billions >= 200 ? 15 : billions >= 100 ? 18 : 20;
  const calculatedNaira = Math.max(100, Math.round(billions * ratePerBillion));

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-surface via-surface-hover to-surface border border-surface-border shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-md">
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-accent-blue uppercase tracking-wider mb-2">
              <Calculator className="w-4 h-4" />
              <span>CUSTOM CURRENCY AMOUNT</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white">
              Need a Specific In-Game Balance?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Drag the slider to choose any custom amount from 5B to 1,500B. Price adjusts automatically.
            </p>
          </div>

          <div className="flex-1 max-w-sm w-full bg-background/90 p-5 rounded-2xl border border-surface-border">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-xs text-slate-400 font-semibold uppercase">In-Game Cash:</span>
              <span className="text-xl font-black text-white font-mono">
                {billions} Billion
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="1500"
              step="5"
              value={billions}
              onChange={(e) => setBillions(Number(e.target.value))}
              className="w-full h-2.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-primary mb-4"
            />

            <div className="flex justify-between items-baseline py-2.5 px-3 rounded-xl bg-surface/80 border border-surface-border mb-4">
              <span className="text-xs text-slate-400">Total in Naira:</span>
              <span className="text-2xl font-black text-primary font-mono">
                ₦{calculatedNaira.toLocaleString()}
              </span>
            </div>

            <button
              onClick={() => onProceedCustom(calculatedNaira, billions)}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition active:scale-95 shadow-md shadow-primary/20"
            >
              <span>CONTINUE WITH {billions}B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
