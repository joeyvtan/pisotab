'use client';
import { useEffect, useState } from 'react';
import { api, PurchaseRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'bg-amber-900 text-amber-300',
    approved: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded capitalize ${map[status] ?? 'bg-slate-700 text-slate-300'}`}>
      {status}
    </span>
  );
}

export default function PurchaseRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState<string | null>(null);
  const [noteMap, setNoteMap]   = useState<Record<string, string>>({});

  const isSuperAdmin = user?.role === 'superadmin';
  const [pdfEnabled, setPdfEnabled]   = useState(true);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy]     = useState(false);

  async function load() {
    setLoading(true);
    try { setRequests(await api.getPurchaseRequests()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    api.getAppSettings().then(s => setPdfEnabled(s['invoice_pdf_enabled'] === '1')).catch(() => {});
  }, []);

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    setBusy(id);
    try {
      const res = await api.approvePurchaseRequest(id, noteMap[id]);
      const keys = (res as { licenses_generated?: { key: string }[] }).licenses_generated;
      if (keys?.length) {
        alert(`Approved! ${keys.length} key(s) generated:\n\n${keys.map(k => k.key).join('\n')}`);
      }
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to approve');
    } finally { setBusy(null); }
  }

  async function reject(id: string) {
    if (!confirm('Reject this request?')) return;
    setBusy(id);
    try { await api.rejectPurchaseRequest(id, noteMap[id]); load(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed to reject'); }
    finally { setBusy(null); }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function batchApprove() {
    if (selected.size === 0) return;
    if (!confirm(`Approve ${selected.size} selected request${selected.size > 1 ? 's' : ''}?`)) return;
    setBatchBusy(true);
    try {
      const res = await api.batchApprovePurchaseRequests(Array.from(selected));
      setSelected(new Set());
      alert(`${res.approved} request${res.approved !== 1 ? 's' : ''} approved. ${res.licenses_generated.length} keys generated.`);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Batch approve failed');
    } finally { setBatchBusy(false); }
  }

  async function downloadReceipt(id: string) {
    try { await api.downloadReceipt(id); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed to download receipt'); }
  }

  function formatDate(unix: number) {
    return new Date(unix * 1000).toLocaleDateString('en-PH', { dateStyle: 'medium' });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Purchase Requests</h1>
        {isSuperAdmin && selected.size > 0 && (
          <button
            disabled={batchBusy}
            onClick={batchApprove}
            className="text-sm px-4 py-2 rounded bg-green-700 hover:bg-green-600 text-white transition-colors">
            {batchBusy ? 'Approving...' : `Approve Selected (${selected.size})`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="card text-slate-500 text-sm">No purchase requests yet.</div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {isSuperAdmin && r.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="mt-1 accent-orange-500 cursor-pointer w-4 h-4 flex-shrink-0" />
                  )}
                  <div>
                    {isSuperAdmin && (
                      <div className="text-white font-medium">
                        {r.requester_full_name || r.requester_username}
                        {r.requester_full_name && (
                          <span className="text-slate-400 text-sm ml-2">@{r.requester_username}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <StatusBadge status={r.status} />
                      <span className="text-slate-400 text-sm">
                        {r.quantity} × {r.plan} — ₱{r.amount_paid.toFixed(2)}
                      </span>
                      <span className="text-slate-500 text-xs">{formatDate(r.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-slate-400">
                GCash Ref: <span className="text-white font-mono">{r.gcash_reference}</span>
              </div>

              {r.note && (
                <div className="text-xs text-slate-500 bg-slate-800 rounded p-2">
                  Note: {r.note}
                </div>
              )}

              {r.reviewer_username && (
                <div className="text-xs text-slate-500">
                  Reviewed by {r.reviewer_username}
                </div>
              )}

              {/* Superadmin actions for pending requests */}
              {isSuperAdmin && r.status === 'pending' && (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    className="input text-sm flex-1"
                    placeholder="Optional note..."
                    value={noteMap[r.id] ?? ''}
                    onChange={e => setNoteMap(m => ({ ...m, [r.id]: e.target.value }))}
                  />
                  <button
                    disabled={busy === r.id}
                    onClick={() => approve(r.id)}
                    className="text-sm px-4 py-2 rounded bg-green-700 hover:bg-green-600 text-white transition-colors">
                    {busy === r.id ? '...' : 'Approve'}
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => reject(r.id)}
                    className="text-sm px-4 py-2 rounded bg-red-800 hover:bg-red-700 text-white transition-colors">
                    Reject
                  </button>
                </div>
              )}

              {/* Download receipt — available when PDF is enabled */}
              {r.status === 'approved' && pdfEnabled && (
                <div className="pt-1">
                  <button
                    onClick={() => downloadReceipt(r.id)}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors">
                    📄 Download Receipt (PDF)
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
