import React from 'react';
import { CurrencyPackage } from '../data/packages';
import { PackageCard } from './PackageCard';
import { ArrowRight, Sparkles } from 'lucide-react';

interface PackageGridProps {
  packages: CurrencyPackage[];
  selectedPackage: CurrencyPackage | null;
  onSelectPackage: (pkg: CurrencyPackage) => void;
  isCustomSelected?: boolean;
  onSelectCustom?: () => void;
  customFormattedAmount?: string;
  customNairaPrice?: number;
  ratePerBillion?: number;
}

export const PackageGrid: React.FC<PackageGridProps> = ({
  packages,
  selectedPackage,
  onSelectPackage,
  isCustomSelected = false,
  onSelectCustom,
  customFormattedAmount,
  customNairaPrice,
  ratePerBillion = 4,
}) => {
  return (
    <section id="packages-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Available Money Packages
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          Select a package or enter a custom amount above 1 Trillion to proceed to payment.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            isSelected={!isCustomSelected && selectedPackage?.id === pkg.id}
            onSelect={onSelectPackage}
          />
        ))}

        {/* 8th Card: Custom High-Roller (> 1 Trillion) */}
        <div
          onClick={onSelectCustom}
          className={`group cursor-pointer rounded-2xl p-6 transition border flex flex-col justify-between ${
            isCustomSelected
              ? 'bg-slate-900 border-emerald-400 ring-1 ring-emerald-400/40 shadow-lg'
              : 'bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/60 hover:bg-slate-900'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>High Roller VIP</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CUSTOM VIP 💎
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {isCustomSelected && customFormattedAmount ? customFormattedAmount : '> 1.0 Trillion'}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Type any custom Trillion amount
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xs text-slate-400">
                {isCustomSelected && customNairaPrice ? 'Price:' : 'Rate:'}
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {isCustomSelected && customNairaPrice
                  ? `₦${customNairaPrice.toLocaleString()}`
                  : `₦${(ratePerBillion * 1000).toLocaleString()} / 1T`}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCustom?.();
              }}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
                isCustomSelected
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-slate-950 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <span>{isCustomSelected ? 'CUSTOM AMOUNT ACTIVE' : 'TYPE IN AMOUNT'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
