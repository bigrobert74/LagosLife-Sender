import React, { useState } from 'react';
import {
  Package,
  Plus,
  Coins,
  Edit2,
  Archive,
  CheckCircle2,
  DollarSign,
  Save,
  Sliders,
} from 'lucide-react';
import { PACKAGES } from '../data/packages';

export const ProductsPricingView: React.FC = () => {
  const [packages, setPackages] = useState(PACKAGES);
  const [customEnabled, setCustomEnabled] = useState(true);
  const [baseRate, setBaseRate] = useState(20);
  const [minBillions, setMinBillions] = useState(5);
  const [maxBillions, setMaxBillions] = useState(1500);
  const [isSaved, setIsSaved] = useState(false);

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border">
        <h2 className="text-2xl font-black text-white">Products, Packages & Pricing Management</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Manage predefined virtual money packs sold on the storefront, update selling prices in NGN, and configure custom currency slider formulas without deploying code.
        </p>
      </div>

      {/* Package Management Table */}
      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
          <h3 className="font-bold text-white text-sm">Active Currency Packages</h3>
          <span className="text-xs text-slate-400 font-mono">{packages.length} Packages Configured</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
              <tr>
                <th className="py-3.5 px-4 font-bold">Package Name</th>
                <th className="py-3.5 px-4 font-bold">Game Cash Amount</th>
                <th className="py-3.5 px-4 font-bold">Naira Price (NGN)</th>
                <th className="py-3.5 px-4 font-bold">Rate / Billion</th>
                <th className="py-3.5 px-4 font-bold">Badge</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-sans">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-surface-hover/60 transition">
                  <td className="py-4 px-4 font-bold text-white text-sm">
                    {pkg.name}
                  </td>
                  <td className="py-4 px-4 font-mono font-black text-primary text-base">
                    {pkg.formattedGameAmount}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                    ₦{pkg.nairaPrice.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-400">
                    ~₦{(pkg.nairaPrice / (Number(pkg.gameCurrencyAmount) / 1000000000)).toFixed(1)}
                  </td>
                  <td className="py-4 px-4">
                    {pkg.badge ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary text-black">
                        {pkg.badge}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button className="p-1.5 rounded-lg bg-surface-border/60 hover:bg-surface-border text-slate-300 hover:text-white transition">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dynamic Pricing & Custom Currency Slider Configuration */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border shadow-xl">
        <h3 className="font-bold text-white text-base mb-4 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-accent-gold" />
          <span>Custom Currency Amount Rules</span>
        </h3>

        <form onSubmit={handleSavePricing} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Base Rate per 1 Billion (₦)
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Min Custom Purchase (Billions)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={minBillions}
                onChange={(e) => setMinBillions(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Max Custom Purchase (Billions)
              </label>
              <input
                type="number"
                min="100"
                max="5000"
                value={maxBillions}
                onChange={(e) => setMaxBillions(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-md shadow-primary/20"
            >
              <Save className="w-4 h-4" />
              <span>UPDATE PRICING RULES</span>
            </button>
            {isSaved && <span className="text-xs text-primary font-bold">✓ Pricing Rules Updated!</span>}
          </div>
        </form>
      </div>
    </div>
  );
};
