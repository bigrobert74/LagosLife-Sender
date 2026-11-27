import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X, Coins } from 'lucide-react';

interface PurchaseNotice {
  username: string;
  amount: string;
  timeAgo: string;
  isReal?: boolean;
}

const SIMULATED_CUSTOMERS: PurchaseNotice[] = [
  { username: '@lagos_don', amount: '1.0 Trillion', timeAgo: 'Just now' },
  { username: '@tunde_vip', amount: '200 Billion', timeAgo: '1 min ago' },
  { username: '@chioma_b', amount: '50 Billion', timeAgo: '2 mins ago' },
  { username: '@lekki_boss', amount: '500 Billion', timeAgo: '3 mins ago' },
  { username: '@obi_rich', amount: '120 Billion', timeAgo: '4 mins ago' },
  { username: '@yemi_plug', amount: '2.0 Trillion', timeAgo: '5 mins ago' },
  { username: '@kcee_whale', amount: '1.0 Trillion', timeAgo: '6 mins ago' },
  { username: '@ada_island', amount: '200 Billion', timeAgo: '7 mins ago' },
  { username: '@femi_bigboy', amount: '500 Billion', timeAgo: '9 mins ago' },
  { username: '@zainab_fx', amount: '50 Billion', timeAgo: '11 mins ago' },
  { username: '@emeka_king', amount: '120 Billion', timeAgo: '13 mins ago' },
  { username: '@bode_money', amount: '3.0 Trillion', timeAgo: '15 mins ago' },
  { username: '@simi_vibes', amount: '20 Billion', timeAgo: '18 mins ago' },
  { username: '@bola_ceo', amount: '500 Billion', timeAgo: '21 mins ago' },
];

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hr ago';
  if (hrs < 24) return `${hrs} hrs ago`;
  return 'Recently';
}

interface RecentPurchasePopupProps {
  onSelectBuy?: () => void;
}

export const RecentPurchasePopup: React.FC<RecentPurchasePopupProps> = ({ onSelectBuy }) => {
  const [feed, setFeed] = useState<PurchaseNotice[]>(SIMULATED_CUSTOMERS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Fetch real recent purchases and interleave with simulated ones
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/orders/recent-activity');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            const realItems: PurchaseNotice[] = json.data.map((item: any) => ({
              username: item.username,
              amount: item.amount,
              timeAgo: formatRelativeTime(item.createdAt),
              isReal: true,
            }));

            // Interleave real orders at the front & throughout
            const combined: PurchaseNotice[] = [];
            const maxLen = Math.max(realItems.length, SIMULATED_CUSTOMERS.length);
            for (let i = 0; i < maxLen; i++) {
              if (i < realItems.length) combined.push(realItems[i]);
              if (i < SIMULATED_CUSTOMERS.length) combined.push(SIMULATED_CUSTOMERS[i]);
            }
            setFeed(combined);
          }
        }
      } catch {
        // Silently keep simulated feed if offline
      }
    };

    fetchRecent();
    const poll = window.setInterval(fetchRecent, 30000);
    return () => window.clearInterval(poll);
  }, []);

  // Cycle pop-in toast smoothly
  useEffect(() => {
    if (dismissed || feed.length === 0) return;

    let cancelled = false;

    const scheduleNext = (delayMs: number) => {
      timerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setVisible(true);

        // Stay visible for 5.5s, then hide
        timerRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setVisible(false);

          // Advance index and schedule next pop-in after 6.5s
          timerRef.current = window.setTimeout(() => {
            if (cancelled) return;
            setCurrentIndex((prev) => (prev + 1) % feed.length);
            scheduleNext(500);
          }, 6500);
        }, 5500);
      }, delayMs);
    };

    // Initial pop-in 3.5 seconds after page load
    scheduleNext(3500);

    return () => {
      cancelled = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [dismissed, feed.length]);

  if (dismissed || feed.length === 0) return null;

  const item = feed[currentIndex % feed.length];

  return (
    <div
      className={`fixed bottom-4 left-4 z-40 max-w-[310px] sm:max-w-xs transition-all duration-500 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="relative flex items-center space-x-3 p-3.5 pr-8 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 shadow-2xl shadow-black/60">
        {/* Icon */}
        <div
          onClick={onSelectBuy}
          className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Coins className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Text */}
        <div onClick={onSelectBuy} className="min-w-0 cursor-pointer">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-bold text-white truncate">{item.username}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
            Bought <span className="font-extrabold text-emerald-400">{item.amount}</span> in-game cash
          </p>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{item.timeAgo} • Verified Order</span>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => {
            setVisible(false);
            setDismissed(true);
          }}
          aria-label="Dismiss purchase notification"
          className="absolute top-2 right-2 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
