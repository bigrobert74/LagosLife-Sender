import React from 'react';
import { X, Smartphone, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface InGameGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InGameGuideModal: React.FC<InGameGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface border border-surface-border p-4 sm:p-6 sm:p-8 shadow-2xl text-left overflow-y-auto max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-border/50 hover:bg-surface-border flex items-center justify-center text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-2 text-accent-gold text-xs font-bold uppercase tracking-wider mb-2">
          <Smartphone className="w-4 h-4" />
          <span>IMPORTANT GAME CONFIGURATION</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-white">
          Configure Your In-Game Phone Settings
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
          In order to receive money in <span className="text-primary font-bold">Lagos Life</span>, your character must allow transfers from external players.
        </p>

        {/* Visual Steps */}
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-2xl bg-background border border-surface-border flex items-start space-x-3.5">
            <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Open Your In-Game Smartphone</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Press the Phone icon on your screen inside the Lagos Life game.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-surface-border flex items-start space-x-3.5">
            <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Navigate to Settings</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap on the gear / Settings app on your in-game phone.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-background border border-accent-gold/40 bg-accent-gold/5 flex items-start space-x-3.5">
            <div className="w-7 h-7 rounded-xl bg-accent-gold/20 text-accent-gold font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-accent-gold">Set "Who can send me money"</h4>
                <span className="text-[10px] font-mono bg-accent-gold text-black font-extrabold px-1.5 py-0.5 rounded">
                  CRITICAL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Scroll down and change the setting to <strong className="text-primary">"Anyone"</strong>. If it is set to "Friends only" or "Nobody", our owner account will not be able to deliver your cash!
              </p>
            </div>
          </div>
        </div>

        {/* Warning Callout */}
        <div className="mt-5 p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center space-x-2 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0 text-primary" />
          <span>You only need to do this once. Once configured, all future orders deliver smoothly!</span>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition active:scale-95"
        >
          <span>I UNDERSTAND — CONTINUE SHOPPING</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
