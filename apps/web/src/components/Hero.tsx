import React from 'react';
import { ArrowRight, Search, ShieldCheck } from 'lucide-react';

interface HeroProps {
  onScrollToPackages: () => void;
  onOpenTracker: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScrollToPackages, onOpenTracker }) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-800/80 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Quality Marker */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-slate-800 bg-slate-900/80 text-slate-300 text-xs font-medium mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Manual Bank Verification • Direct In-Game Transfer</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          Get Your Lagos Life Money.
        </h1>

        {/* Supporting Subtitle */}
        <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          Choose your package, make a transfer and receive your game money.
        </p>

        {/* Primary Actions */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onScrollToPackages}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition shadow-sm hover:shadow-emerald-500/20 active:scale-98"
          >
            <span>BUY MONEY</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenTracker}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-medium text-sm flex items-center justify-center space-x-2 transition"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>TRACK ORDER</span>
          </button>
        </div>
      </div>
    </section>
  );
};
