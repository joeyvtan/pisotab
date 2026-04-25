'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, GcashSettings, LicensePricing } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function GcashSettingsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [settings, setSettings] = useState<GcashSettings | null>(null);
  const [pricing, setPricing]   = useState<LicensePricing[]>([]);
  const [form, setForm]         = useState({ gcash_name: '', gcash_number: '' });
  const [priceForm, setPriceForm] = useState({ user_id: '', price_pesos: '', duration_days: '365' });
  const [saving, setSaving]     = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [pdfEnabled, setPdfEnabled] = useState(true);
  const [togglingPdf, setTogglingPdf] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'superadmin') router.replace('/dashboard');
  }, [user, router]);

  async function load() {
    try {
      const s = await api.getGcashSettings();
      setSettings(s);
      setForm({ gcash_name: s.gcash_name, gcash_number: s.gcash_number });
    } catch { /* not yet set */ }
    try {
      const p = await api.getLicensePricing();
      setPricing(p.pricing);
    } catch { /* ignore */ }
    try {
      const appSettings = await api.getAppSettings();
      setPdfEnabled(appSettings['invoice_pdf_enabled'] === '1');
    } catch { /* ignore */ }
  }

  async function togglePdf() {
    setTogglingPdf(true);
    try {
      const next = pdfEnabled ? '0' : '1';
      await api.updateAppSetting('invoice_pdf_enabled', next);
      setPdfEnabled(next === '1');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update setting');
    } finally { setTogglingPdf(false); }
  }

  useEffect(() => { if (user?.role === 'superadmin') load(); }, [user]);

  async function saveGcash(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await api.updateGcashSettings(form);
      setSuccess('GCash settings saved.');
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  async function savePricing(e: React.FormEvent) {
    e.preventDefault();
    setSavingPrice(true);
    try {
      await api.setLicensePricing({
        user_id: priceForm.user_id || undefined,
        price_pesos: Number(priceForm.price_pesos),
        duration_days: priceForm.duration_days ? Number(priceForm.duration_days) : undefined,
      } as Parameters<typeof api.setLicensePricing>[0]);
      setPriceForm({ user_id: '', price_pesos: '', duration_days: '365' });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally { setSavingPrice(false); }
  }

  async function deletePrice(id: string) {
    if (!confirm('Remove this pricing rule?')) return;
    try { await api.deleteLicensePricing(id); load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Failed'); }
  }

  if (user?.role !== 'superadmin') return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">GCash Settings</h1>

      {/* GCash payment details */}
      <div className="card space-y-4">
        <h2 className="text-white font-medium">Payment Details</h2>
        <p className="text-slate-400 text-sm">
          These details are shown to admins on the Buy License page.
        </p>
        {error   && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
        <form onSubmit={saveGcash} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">GCash Name</label>
            <input className="input" value={form.gcash_name}
              onChange={e => setForm(f => ({ ...f, gcash_name: e.target.value }))}
              placeholder="Juan dela Cruz" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">GCash Number</label>
            <input className="input" value={form.gcash_number}
              onChange={e => setForm(f => ({ ...f, gcash_number: e.target.value }))}
              placeholder="09XX-XXX-XXXX" />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save GCash Details'}
          </button>
        </form>
      </div>

      {/* Invoice PDF toggle */}
      <div className="card space-y-3">
        <h2 className="text-white font-medium">Invoice PDF</h2>
        <p className="text-slate-400 text-sm">
          When enabled, admins can download a PDF receipt for each approved purchase request.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={togglePdf}
            disabled={togglingPdf}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              pdfEnabled ? 'bg-green-600' : 'bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pdfEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${pdfEnabled ? 'text-green-400' : 'text-slate-400'}`}>
            {togglingPdf ? 'Updating...' : pdfEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* License pricing */}
      <div className="card space-y-4">
        <h2 className="text-white font-medium">License Pricing</h2>
        <p className="text-slate-400 text-sm">
          Set platform-wide default pricing, or override per admin account (leave User ID blank for default).
        </p>
        <form onSubmit={savePricing} className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">User ID (blank = default)</label>
            <input className="input text-sm" value={priceForm.user_id}
              onChange={e => setPriceForm(f => ({ ...f, user_id: e.target.value }))}
              placeholder="usr_xxxxxxxx" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Price (₱) *</label>
            <input className="input text-sm" type="number" min="0" step="0.01"
              value={priceForm.price_pesos}
              onChange={e => setPriceForm(f => ({ ...f, price_pesos: e.target.value }))}
              placeholder="299" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Duration (days)</label>
            <input className="input text-sm" type="number" min="1"
              value={priceForm.duration_days}
              onChange={e => setPriceForm(f => ({ ...f, duration_days: e.target.value }))}
              placeholder="365" />
          </div>
          <div className="col-span-3">
            <button type="submit" className="btn-primary text-sm" disabled={savingPrice}>
              {savingPrice ? 'Saving...' : 'Set Pricing Rule'}
            </button>
          </div>
        </form>

        {pricing.length > 0 && (
          <div className="divide-y divide-slate-700 mt-2">
            {pricing.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div className="text-sm text-slate-300">
                  {p.user_id ? (
                    <span><span className="text-orange-400">{p.user_username ?? p.user_id}</span> — custom</span>
                  ) : (
                    <span className="text-slate-400">Default (all admins)</span>
                  )}
                  <span className="ml-3 text-white font-medium">₱{p.price_pesos}</span>
                  <span className="text-slate-500 ml-2 text-xs">
                    {p.duration_days ? `${p.duration_days} days` : 'Lifetime'}
                  </span>
                </div>
                <button onClick={() => deletePrice(p.id)}
                  className="text-slate-500 hover:text-red-400 text-sm transition-colors">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
