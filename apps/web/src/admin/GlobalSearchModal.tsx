import React, { useState, useEffect } from 'react';
import { Search, X, Package, User, Hash, ArrowRight, Loader2 } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (orderNumber: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectOrder,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ orders: any[]; customers: any[]; references: any[] }>({
    orders: [],
    customers: [],
    references: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ orders: [], customers: [], references: [] });
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/api/v1/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const json = await res.json();
          setResults(json.data);
        }
      } catch (err) {
        console.warn('Global search query error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-20 p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface border border-surface-border shadow-2xl overflow-hidden text-left max-h-[88vh] flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-surface-border bg-background">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search Order #, Customer Name, Lagos Life Username, Bank Reference... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white text-sm focus:outline-none font-mono"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mr-2 shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-surface-border/50 hover:bg-surface-border text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {query.trim() && !isLoading && results.orders.length === 0 && results.customers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching orders, customers, or bank references found for "{query}".
            </div>
          ) : null}

          {/* Matching Orders */}
          {results.orders.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                <span>Orders ({results.orders.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.orders.map((order) => (
                  <div
                    key={order.orderNumber}
                    onClick={() => {
                      onSelectOrder(order.orderNumber);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-background/80 hover:bg-surface-hover border border-surface-border cursor-pointer flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-white text-sm group-hover:text-primary transition">
                          #{order.orderNumber}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-surface font-mono text-emerald-400 font-bold">
                          {order.formattedGameAmount}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Customer: <strong className="text-slate-300">@{order.gameUsername}</strong> • ₦{order.totalNairaAmount.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-primary flex items-center space-x-1">
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matching Customers */}
          {results.customers.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-accent-blue" />
                <span>Customers ({results.customers.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.customers.map((cust) => (
                  <div
                    key={cust.id}
                    className="p-3 rounded-xl bg-background/80 border border-surface-border flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-sm font-mono">
                        @{cust.gameUsername}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {cust.name} • Total Spent: ₦{cust.totalSpentNaira.toLocaleString()} ({cust.completedOrders} orders completed)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 bg-background border-t border-surface-border text-[11px] text-slate-500 flex justify-between items-center px-4">
          <span>Search orders, handles, and bank references in real-time</span>
          <span className="font-mono bg-surface-border/40 px-1.5 py-0.5 rounded">Esc to close</span>
        </div>
      </div>
    </div>
  );
};
