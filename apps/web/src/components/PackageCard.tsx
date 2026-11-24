import React from 'react';
import { CurrencyPackage } from '../data/packages';
import { ArrowRight } from 'lucide-react';

interface PackageCardProps {
  pkg: CurrencyPackage;
  isSelected?: boolean;
  onSelect: (pkg: CurrencyPackage) => void;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(pkg)}
      className={`group cursor-pointer rounded-2xl p-6 transition border flex flex-col justify-between ${
        isSelected
          ? 'bg-slate-900 border-emerald-400 ring-1 ring-emerald-400/40 shadow-lg'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <div>
        {/* Package Quantity */}
        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
          Lagos Life Cash
        </div>
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
          {pkg.formattedGameAmount}
        </div>
        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
          ₦LL {Number(pkg.gameCurrencyAmount).toLocaleString()}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-800/80">
        {/* NGN Price */}
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-xs text-slate-400">Price:</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            ₦{pkg.nairaPrice.toLocaleString()}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(pkg);
          }}
          className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
            isSelected
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-white'
          }`}
        >
          <span>{isSelected ? 'SELECTED' : 'BUY NOW'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
