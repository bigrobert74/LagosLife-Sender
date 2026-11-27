import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, ExternalLink, Check, AlertTriangle, Users } from 'lucide-react';

const API =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_URL ||
  'http://localhost:3000';

export const WhatsappSettingsView: React.FC = () => {
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [whatsappSupportLink, setWhatsappSupportLink] = useState('https://wa.me/2348012345678');
  const [groupLabel, setGroupLabel] = useState('Join Our WhatsApp Group');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API}/api/v1/admin/settings/whatsapp`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setWhatsappGroupLink(json.data.whatsappGroupLink || '');
            setWhatsappSupportLink(json.data.whatsappSupportLink || 'https://wa.me/2348012345678');
            setGroupLabel(json.data.groupLabel || 'Join Our WhatsApp Group');
          }
        }
      } catch {
        // ignore offline
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/settings/whatsapp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsappGroupLink: whatsappGroupLink.trim(),
          whatsappSupportLink: whatsappSupportLink.trim(),
          groupLabel: groupLabel.trim() || 'Join Our WhatsApp Group',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setWhatsappGroupLink(json.data.whatsappGroupLink || '');
          setWhatsappSupportLink(json.data.whatsappSupportLink || '');
          setGroupLabel(json.data.groupLabel || 'Join Our WhatsApp Group');
        }
        showToast('WhatsApp links updated on storefront ✓');
      } else {
        showToast('Failed to save WhatsApp links', false);
      }
    } catch {
      showToast('Network error saving settings', false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 relative">
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
      <div className="p-6 rounded-3xl bg-surface border border-surface-border">
        <div className="flex items-center space-x-2 text-[#25D366] text-xs font-bold uppercase tracking-wider mb-1">
          <MessageCircle className="w-4 h-4" />
          <span>COMMUNITY & SUPPORT LINKS</span>
        </div>
        <h2 className="text-2xl font-black text-white">WhatsApp Group & Support Links</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Configure the WhatsApp group invite button displayed at the bottom of the customer storefront and your direct WhatsApp support link. Changes reflect live without redeploying.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-surface border border-surface-border shadow-xl">
          <h3 className="font-bold text-white text-base mb-4">Edit WhatsApp Links</h3>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading WhatsApp settings...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  WhatsApp Group Invite Link
                </label>
                <input
                  type="url"
                  value={whatsappGroupLink}
                  onChange={(e) => setWhatsappGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-xs focus:outline-none focus:border-[#25D366]"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Shown as a WhatsApp icon button at the bottom of the selling website. Leave blank to hide the group button.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Group Button Label
                </label>
                <input
                  type="text"
                  value={groupLabel}
                  onChange={(e) => setGroupLabel(e.target.value)}
                  placeholder="Join Our WhatsApp Group"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white text-xs focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  WhatsApp Direct Support Link
                </label>
                <input
                  type="url"
                  value={whatsappSupportLink}
                  onChange={(e) => setWhatsappSupportLink(e.target.value)}
                  placeholder="https://wa.me/2348012345678"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border text-white font-mono text-xs focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Used for the customer support WhatsApp button in the footer and support modal.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-black font-extrabold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-md shadow-primary/20 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save WhatsApp Links'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live Storefront Preview */}
        <div className="p-6 rounded-3xl bg-surface border border-surface-border shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm mb-2 flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#25D366]" />
              <span>Storefront Footer Preview</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              This is how the WhatsApp Group button appears at the bottom of the selling website.
            </p>

            {whatsappGroupLink.trim() ? (
              <a
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2.5 px-4 py-2.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] font-bold text-xs transition"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.15 1.6 5.96L0 24l6.33-1.66a11.86 11.86 0 0 0 5.73 1.46h.01c6.56 0 11.9-5.34 11.9-11.9 0-3.18-1.24-6.17-3.45-8.42ZM12.07 21.8h-.01a9.88 9.88 0 0 1-5.04-1.38l-.36-.21-3.76.99 1-3.66-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.89 9.9-9.89 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 7c0 5.46-4.44 9.89-9.87 9.89Zm5.42-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
                </svg>
                <span>{groupLabel || 'Join Our WhatsApp Group'}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            ) : (
              <div className="p-4 rounded-2xl bg-background border border-dashed border-surface-border text-[11px] text-slate-500 text-center">
                No WhatsApp Group Link configured. Button is currently hidden on the storefront.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-surface-border text-[11px] text-slate-500">
            Support link:{' '}
            <span className="font-mono text-slate-300 break-all">
              {whatsappSupportLink || 'Not set'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
