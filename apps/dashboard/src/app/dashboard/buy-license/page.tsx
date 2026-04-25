'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, GcashSettings } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function BuyLicensePage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [gcash, setGcash]         = useState<GcashSettings | null>(null);
  const [effectivePrice, setPrice] = useState<number | null>(null);
  const [form, setForm]           = useState({ quantity: '1', gcash_reference: '' });
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  // Only admins (not superadmin) use this page
  useEffect(() => {
    if (user && user.role === 'superadmin') router.replace('/dashboard/licenses');
    if (user && user.role === 'staff')      router.replace('/dashboard');
  }, [user, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [g, p] = await Promise.all([api.getGcashSettings(), api.getLicensePricing()]);
        setGcash(g);
        setPrice(p.effective?.price_pesos ?? null);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    if (user?.role === 'admin') load();
  }, [user]);

  const qty   = Math.max(1, parseInt(form.quantity) || 1);
  const total = effectivePrice != null ? effectivePrice * qty : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.gcash_reference.trim()) {
      setError('GCash reference number is required'); return;
    }
    setSubmitting(true);
    try {
      await api.submitPurchaseRequest({
        quantity: qty,
        gcash_reference: form.gcash_reference.trim(),
      });
      setSuccess('Purchase request submitted! A Super Admin will review and approve it shortly.');
      setForm({ quantity: '1', gcash_reference: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally { setSubmitting(false); }
  }

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-white">Buy License</h1>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : (
        <>
          {/* GCash payment info */}
          {gcash?.gcash_name ? (
            <div className="card space-y-3">
              <h2 className="text-white font-medium">Send Payment via GCash</h2>
              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">GCash Name</span>
                  <span className="text-white font-medium">{gcash.gcash_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">GCash Number</span>
                  <span className="text-white font-mono font-medium">{gcash.gcash_number}</span>
                </div>
                {effectivePrice != null && (
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                    <span className="text-slate-400">Price per license</span>
                    <span className="text-orange-400 font-bold">₱{effectivePrice.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                Send the exact amount, then enter your GCash reference number below.
              </p>
            </div>
          ) : (
            <div className="card bg-amber-900/30 border border-amber-700/50">
              <p className="text-amber-300 text-sm">
                GCash payment details have not been configured yet. Please contact your Super Admin.
              </p>
            </div>
          )}

          {/* Submit form */}
          <div className="card space-y-4">
            <h2 className="text-white font-medium">Submit Payment Reference</h2>

            {success && (
              <div className="bg-green-900/40 border border-green-700 rounded-lg p-3">
                <p className="text-green-300 text-sm">{success}</p>
              </div>
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Number of Licenses</label>
                <input className="input w-32" type="number" min="1" max="50"
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                {total != null && (
                  <p className="text-orange-400 text-sm mt-1 font-medium">
                    Total: ₱{total.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">GCash Reference Number *</label>
                <input className="input font-mono" value={form.gcash_reference}
                  onChange={e => setForm(f => ({ ...f, gcash_reference: e.target.value }))}
                  placeholder="e.g. 1234567890" />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={submitting || !gcash?.gcash_name}>
                {submitting ? 'Submitting...' : 'Submit Purchase Request'}
              </button>
            </form>
          </div>

          <div className="card text-xs text-slate-500 space-y-1">
            <p>After submitting, a Super Admin will verify your payment and activate your license keys.</p>
            <p>To check the status of your request, visit <a href="/dashboard/purchase-requests" className="text-orange-400 hover:underline">Purchase Requests</a>.</p>
          </div>
        </>
      )}
    </div>
  );
}
