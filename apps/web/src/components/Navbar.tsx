import React, { useState } from 'react';
import { Menu, X, Search, HelpCircle, History, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onNavigateHome: () => void;
  onNavigateBuy: () => void;
  onOpenTracker: () => void;
  onOpenHistory: () => void;
  onOpenFAQ: () => void;
  onOpenSupport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateHome,
  onNavigateBuy,
  onOpenTracker,
  onOpenHistory,
  onOpenFAQ,
  onOpenSupport,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleMobileClick = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center space-x-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            ₦
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-sans">
                LAGOS LIFE <span className="text-emerald-400">MONEY</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
              Virtual Currency Store
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
          <button
            onClick={onNavigateHome}
            className="hover:text-white transition"
          >
            Home
          </button>
          <button
            onClick={onNavigateBuy}
            className="hover:text-white transition"
          >
            Buy Money
          </button>
          <button
            onClick={onOpenTracker}
            className="hover:text-white transition"
          >
            Track Order
          </button>
          <button
            onClick={onOpenFAQ}
            className="hover:text-white transition"
          >
            FAQ
          </button>
          <button
            onClick={onOpenSupport}
            className="hover:text-white transition"
          >
            Support
          </button>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <button
            onClick={onOpenHistory}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
            title="My Order History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateBuy}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-sm hover:shadow-emerald-500/20"
          >
            BUY MONEY
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={onNavigateBuy}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider"
          >
            BUY
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 gap-2 pt-2 text-sm font-medium text-slate-200">
            <button
              onClick={() => handleMobileClick(onNavigateHome)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-900"
            >
              Home
            </button>
            <button
              onClick={() => handleMobileClick(onNavigateBuy)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-900 font-bold text-emerald-400"
            >
              Buy Money
            </button>
            <button
              onClick={() => handleMobileClick(onOpenTracker)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-900"
            >
              Track Order
            </button>
            <button
              onClick={() => handleMobileClick(onOpenHistory)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-900"
            >
              My Orders
            </button>
            <button
              onClick={() => handleMobileClick(onOpenFAQ)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-900"
            >
              FAQ
            </button>
            <button
              onClick={() => handleMobileClick(onOpenSupport)}
              className="w-full text-left py-2.5 px-3 rounded-lg hover:bg-slate-900"
            >
              Support
            </button>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button
              onClick={() => handleMobileClick(onNavigateBuy)}
              className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
            >
              <span>BUY MONEY</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
