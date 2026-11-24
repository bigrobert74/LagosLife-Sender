import React, { useState } from 'react';
import {
  Users,
  Search,
  ShieldAlert,
  CheckCircle2,
  Coins,
  CreditCard,
  Ban,
  RotateCcw,
} from 'lucide-react';

interface CustomersViewProps {
  customers: any[];
}

export const CustomersView: React.FC<CustomersViewProps> = ({ customers }) => {
  const [search, setSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState<any | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.gameUsername.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-surface border border-surface-border">
        <div>
          <h2 className="text-2xl font-black text-white">Customer Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered Lagos Life players, track total spending, order history, and account standing.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search handle or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-primary font-mono"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
              <tr>
                <th className="py-3.5 px-4 font-bold">Lagos Life Handle</th>
                <th className="py-3.5 px-4 font-bold">Sender Legal Name</th>
                <th className="py-3.5 px-4 font-bold">Total Orders</th>
                <th className="py-3.5 px-4 font-bold">Completed</th>
                <th className="py-3.5 px-4 font-bold">Total Spent (NGN)</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border font-sans">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover/60 transition">
                  <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                    @{c.gameUsername}
                  </td>
                  <td className="py-4 px-4 text-slate-300 font-medium">
                    {c.name}
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-300">
                    {c.totalOrders}
                  </td>
                  <td className="py-4 px-4 font-mono text-emerald-400 font-bold">
                    {c.completedOrders}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-primary text-sm">
                    ₦{c.totalSpentNaira.toLocaleString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => setSelectedCust(c)}
                      className="px-3 py-1.5 rounded-xl bg-surface-border/60 hover:bg-surface-border text-slate-200 text-xs font-bold transition"
                    >
                      Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
