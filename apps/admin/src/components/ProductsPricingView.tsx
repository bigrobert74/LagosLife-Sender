import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Sliders,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
} from 'lucide-react';

const API = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

interface AdminPackage {
  id: string;
  name: string;
  slug: string;
  gameCurrencyAmount: string;
  formattedGameAmount: string;
  nairaPrice: number;
  badge: string | null;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
}

interface PackageSettings {
  ratePerBillion: number;
  minBillions: number;
  maxBillions: number;
}

const emptyEdit = {
  name: '',
  gameCurrencyAmount: '',
  nairaPrice: '',
  badge: '',
  isPopular: false,
  isActive: false,
};

export const ProductsPricingView: React.FC = () => {
  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [settings, setSettings] = useState<PackageSettings>({ ratePerBillion: 10, minBillions: 1, maxBillions: 1500 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEdit);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyEdit);
  const [addSaving, setAddSaving] = useState(false);

  // Settings
  const [settingsForm, setSettingsForm] = useState({ ratePerBillion: 10, minBillions: 1, maxBillions: 1500 });
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [pkgRes, setRes] = await Promise.all([
        fetch(`${API}/api/v1/admin/packages`),
        fetch(`${API}/api/v1/admin/packages/settings`),
      ]);
      if (pkgRes.ok) {
        const j = await pkgRes.json();
        if (Array.isArray(j?.data)) setPackages(j.data);
      }
      if (setRes.ok) {
        const j = await setRes.json();
        if (j?.data) {
          setSettings(j.data);
          setSettingsForm(j.data);
        }
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 8000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ---- Toggle active ----
  const toggleActive = async (pkg: AdminPackage) => {
    try {
      const res = await fetch(`${API}/api/v1/admin/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      if (res.ok) {
        setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, isActive: !pkg.isActive } : p)));
        showToast(`${pkg.name} ${!pkg.isActive ? 'published to storefront' : 'hidden from storefront'}`);
      } else {
        showToast('Failed to update package', false);
      }
    } catch {
      showToast('Network error', false);
    }
  };

  // ---- Start inline edit ----
  const startEdit = (pkg: AdminPackage) => {
    setEditingId(pkg.id);
    setEditForm({
      name: pkg.name,
      gameCurrencyAmount: pkg.gameCurrencyAmount,
      nairaPrice: pkg.nairaPrice.toString(),
      badge: pkg.badge ?? '',
      isPopular: pkg.isPopular,
      isActive: pkg.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyEdit);
  };

  const saveEdit = async (id: string) => {
    try {
      const payload: any = {
        name: editForm.name,
        gameCurrencyAmount: editForm.gameCurrencyAmount,
        nairaPrice: Number(editForm.nairaPrice),
        badge: editForm.badge.trim() || null,
        isPopular: editForm.isPopular,
      };
      const res = await fetch(`${API}/api/v1/admin/packages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchAll();
        setEditingId(null);
        showToast('Package updated ✓');
      } else {
        showToast('Save failed', false);
      }
    } catch {
      showToast('Network error', false);
    }
  };

  // ---- Add new ----
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          gameCurrencyAmount: addForm.gameCurrencyAmount,
          nairaPrice: Number(addForm.nairaPrice),
          badge: addForm.badge.trim() || null,
          isPopular: addForm.isPopular,
          isActive: addForm.isActive,
        }),
      });
      if (res.ok) {
        await fetchAll();
        setShowAdd(false);
        setAddForm(emptyEdit);
        showToast('Package created' + (addForm.isActive ? ' & published' : ' (inactive — toggle to publish)'));
      } else {
        showToast('Failed to create', false);
      }
    } catch {
      showToast('Network error', false);
    }
    setAddSaving(false);
  };

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/v1/admin/packages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPackages((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirm(null);
        showToast('Package deleted');
      } else {
        showToast('Delete failed', false);
      }
    } catch {
      showToast('Network error', false);
    }
  };

  // ---- Settings ----
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/packages/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        setSettings(settingsForm);
        showToast('Pricing settings saved ✓');
      } else {
        showToast('Failed to save settings', false);
      }
    } catch {
      showToast('Network error', false);
    }
    setSettingsSaving(false);
  };

  const FormInput = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-background border border-surface-border text-white font-mono text-xs focus:outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-xs font-bold shadow-2xl flex items-center space-x-2 ${
            toast.ok ? 'bg-primary text-black' : 'bg-red-500 text-white'
          }`}
        >
          {toast.ok ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-white">Products, Packages & Pricing</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Create, edit and publish currency packages. Only packages you{' '}
            <span className="text-primary font-bold">explicitly activate</span> will appear on the storefront.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider transition shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Package</span>
        </button>
      </div>

      {/* Package Table */}
      <div className="rounded-3xl bg-surface border border-surface-border overflow-hidden shadow-xl">
        <div className="p-5 border-b border-surface-border flex justify-between items-center bg-background/60">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <Package className="w-4 h-4 text-primary" />
            <span>Currency Packages</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {packages.filter((p) => p.isActive).length} / {packages.length} published
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">Loading packages…</div>
        ) : packages.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">No packages yet. Click "Add Package" to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-background text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Package Name</th>
                  <th className="py-3.5 px-4 font-bold">Game Cash</th>
                  <th className="py-3.5 px-4 font-bold">Price (NGN)</th>
                  <th className="py-3.5 px-4 font-bold">Rate/B</th>
                  <th className="py-3.5 px-4 font-bold">Badge</th>
                  <th className="py-3.5 px-4 font-bold text-center">Storefront</th>
                  <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {packages.map((pkg) =>
                  editingId === pkg.id ? (
                    // ---- Inline Edit Row ----
                    <tr key={pkg.id} className="bg-surface-hover/40">
                      <td className="py-3 px-4">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded-lg bg-background border border-primary text-white text-xs font-bold focus:outline-none"
                          placeholder="Package name"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          value={editForm.gameCurrencyAmount}
                          onChange={(e) => setEditForm((f) => ({ ...f, gameCurrencyAmount: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded-lg bg-background border border-surface-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                          placeholder="e.g. 50000000000"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={editForm.nairaPrice}
                          onChange={(e) => setEditForm((f) => ({ ...f, nairaPrice: e.target.value }))}
                          className="w-24 px-2 py-1.5 rounded-lg bg-background border border-surface-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        ~₦{editForm.gameCurrencyAmount && Number(editForm.nairaPrice) > 0
                          ? (Number(editForm.nairaPrice) / (Number(editForm.gameCurrencyAmount) / 1e9)).toFixed(1)
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          value={editForm.badge}
                          onChange={(e) => setEditForm((f) => ({ ...f, badge: e.target.value }))}
                          className="w-24 px-2 py-1.5 rounded-lg bg-background border border-surface-border text-white text-xs font-mono focus:outline-none focus:border-primary uppercase"
                          placeholder="e.g. HOT"
                        />
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 text-[10px]">unchanged</td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => saveEdit(pkg.id)}
                          className="p-1.5 rounded-lg bg-primary text-black hover:bg-primary-hover transition"
                          title="Save"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-surface-border text-slate-300 hover:text-white transition"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    // ---- Normal Row ----
                    <tr key={pkg.id} className="hover:bg-surface-hover/40 transition">
                      <td className="py-4 px-4 font-bold text-white text-sm">
                        {pkg.name}
                        {pkg.isPopular && (
                          <span className="ml-2 text-[9px] font-bold text-accent-gold bg-accent-gold/10 px-1.5 py-0.5 rounded">POPULAR</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono font-black text-primary text-base">
                        {pkg.formattedGameAmount}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-white text-sm">
                        ₦{pkg.nairaPrice.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400 text-[11px]">
                        ~₦{(pkg.nairaPrice / (Number(pkg.gameCurrencyAmount) / 1e9)).toFixed(1)}/B
                      </td>
                      <td className="py-4 px-4">
                        {pkg.badge ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/20 text-primary border border-primary/30">
                            {pkg.badge}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => toggleActive(pkg)}
                          title={pkg.isActive ? 'Click to hide from storefront' : 'Click to publish to storefront'}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition border ${
                            pkg.isActive
                              ? 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-green-500/15 hover:text-green-400 hover:border-green-500/30'
                          }`}
                        >
                          {pkg.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{pkg.isActive ? 'LIVE' : 'HIDDEN'}</span>
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right space-x-1">
                        <button
                          onClick={() => startEdit(pkg)}
                          className="p-1.5 rounded-lg bg-surface-border/60 hover:bg-surface-border text-slate-300 hover:text-white transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(pkg.id)}
                          className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Amount Settings */}
      <div className="p-6 rounded-3xl bg-surface border border-surface-border shadow-xl">
        <h3 className="font-bold text-white text-base mb-4 flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-accent-gold" />
          <span>Custom Currency Amount Rules</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Controls pricing for the custom amount slider on the storefront (₦ per 1 Billion).
        </p>

        <form onSubmit={saveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Rate per 1 Billion (₦)
              </label>
              <input
                type="number"
                min="1"
                value={settingsForm.ratePerBillion}
                onChange={(e) => setSettingsForm((f) => ({ ...f, ratePerBillion: Number(e.target.value) }))}
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
                value={settingsForm.minBillions}
                onChange={(e) => setSettingsForm((f) => ({ ...f, minBillions: Number(e.target.value) }))}
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
                value={settingsForm.maxBillions}
                onChange={(e) => setSettingsForm((f) => ({ ...f, maxBillions: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="submit"
              disabled={settingsSaving}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-md shadow-primary/20 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{settingsSaving ? 'Saving…' : 'Save Pricing Rules'}</span>
            </button>
            <span className="text-[11px] text-slate-500">
              Current: ₦{settings.ratePerBillion}/B · Min {settings.minBillions}B · Max {settings.maxBillions}B
            </span>
          </div>
        </form>
      </div>

      {/* Add Package Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-surface border border-surface-border rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Add New Package</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              New packages start <span className="text-yellow-400 font-bold">hidden</span> by default. Toggle "Publish to Storefront" to make it live immediately.
            </p>
            <form onSubmit={handleAdd} className="space-y-3">
              <FormInput
                label="Package Name"
                value={addForm.name}
                onChange={(v) => setAddForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. 100 Billion Mega"
              />
              <FormInput
                label="Game Cash Amount (raw number)"
                value={addForm.gameCurrencyAmount}
                onChange={(v) => setAddForm((f) => ({ ...f, gameCurrencyAmount: v }))}
                placeholder="e.g. 100000000000"
              />
              <FormInput
                label="Price (₦ NGN)"
                value={addForm.nairaPrice}
                onChange={(v) => setAddForm((f) => ({ ...f, nairaPrice: v }))}
                type="number"
                placeholder="e.g. 2000"
              />
              <FormInput
                label="Badge (optional — e.g. HOT, VIP)"
                value={addForm.badge}
                onChange={(v) => setAddForm((f) => ({ ...f, badge: v.toUpperCase() }))}
                placeholder="Leave blank for no badge"
              />
              <div className="flex items-center space-x-3 pt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addForm.isActive}
                    onChange={(e) => setAddForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <span className="text-xs font-bold text-slate-300">
                  {addForm.isActive ? '✓ Publish to storefront immediately' : 'Save as hidden (publish later)'}
                </span>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={addSaving || !addForm.name || !addForm.gameCurrencyAmount || !addForm.nairaPrice}
                  className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider transition disabled:opacity-50"
                >
                  {addSaving ? 'Creating…' : 'Create Package'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-3 rounded-xl bg-surface-border text-slate-300 hover:text-white text-xs font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-surface border border-red-500/40 rounded-3xl shadow-2xl p-6 space-y-4 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-black text-white">Delete Package?</h3>
            <p className="text-xs text-slate-400">
              This will permanently remove the package. It will immediately disappear from the storefront.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider transition"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-surface-border text-slate-300 hover:text-white text-xs font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
