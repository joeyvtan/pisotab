'use client';
import { useEffect, useState } from 'react';
import { api, PricingTier, PeakRule } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatPeso } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDays(s: string): number[] {
  return s.split(',').map(Number).filter(n => n >= 0 && n <= 6);
}

function fmtHour(h: number) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export default function PricingPage() {
  const { user }    = useAuth();
  const canManage   = user?.role === 'admin' || user?.role === 'superadmin';

  // ── Pricing tiers ──────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', amount_pesos: '', duration_mins: '' });
  const [busy, setBusy] = useState(false);

  async function loadTiers() {
    const data = await api.getPricing().catch(() => []);
    setTiers(data);
  }

  useEffect(() => { loadTiers(); }, []);

  async function addTier() {
    if (!form.name || !form.amount_pesos || !form.duration_mins) return;
    setBusy(true);
    try {
      await api.createPricing({
        name: form.name,
        amount_pesos: Number(form.amount_pesos),
        duration_mins: Number(form.duration_mins),
      });
      setForm({ name: '', amount_pesos: '', duration_mins: '' });
      setShowAdd(false);
      loadTiers();
    } finally { setBusy(false); }
  }

  async function toggleActive(tier: PricingTier) {
    await api.updatePricing(tier.id, { is_active: tier.is_active ? 0 : 1 });
    loadTiers();
  }

  async function deleteTier(id: string) {
    if (!confirm('Delete this pricing tier?')) return;
    await api.deletePricing(id);
    loadTiers();
  }

  // ── Peak pricing rules ─────────────────────────────────────────────────────
  const [rules, setRules] = useState<PeakRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '', days_of_week: '1,2,3,4,5', start_hour: '18', end_hour: '22', multiplier: '1.5',
  });
  const [ruleBusy, setRuleBusy] = useState(false);

  async function loadRules() {
    const data = await api.getPeakRules().catch(() => []);
    setRules(data);
  }

  useEffect(() => { loadRules(); }, []);

  function toggleDay(day: number) {
    const days = parseDays(ruleForm.days_of_week);
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setRuleForm(f => ({ ...f, days_of_week: next.join(',') }));
  }

  async function addRule() {
    if (!ruleForm.name || !ruleForm.multiplier) return;
    setRuleBusy(true);
    try {
      await api.createPeakRule({
        name: ruleForm.name,
        days_of_week: ruleForm.days_of_week || '0,1,2,3,4,5,6',
        start_hour: Number(ruleForm.start_hour),
        end_hour: Number(ruleForm.end_hour),
        multiplier: Number(ruleForm.multiplier),
        is_active: 1,
      });
      setRuleForm({ name: '', days_of_week: '1,2,3,4,5', start_hour: '18', end_hour: '22', multiplier: '1.5' });
      setShowAddRule(false);
      loadRules();
    } finally { setRuleBusy(false); }
  }

  async function toggleRule(rule: PeakRule) {
    await api.updatePeakRule(rule.id, { is_active: rule.is_active ? 0 : 1 });
    loadRules();
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this peak rule?')) return;
    await api.deletePeakRule(id);
    loadRules();
  }

  return (
    <div className="space-y-8">

      {/* ── Pricing Tiers ── */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Pricing Tiers</h1>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
              + Add Tier
            </button>
          )}
        </div>

        {showAdd && canManage && (
          <div className="card space-y-3">
            <h2 className="font-bold text-white">New Pricing Tier</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Name</label>
                <input className="input text-sm" placeholder="₱1 — 5 mins"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount (₱)</label>
                <input className="input text-sm" type="number" step="0.5" placeholder="1"
                  value={form.amount_pesos} onChange={e => setForm(f => ({ ...f, amount_pesos: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Duration (mins)</label>
                <input className="input text-sm" type="number" placeholder="5"
                  value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={addTier} disabled={busy}>
                {busy ? 'Adding...' : 'Add Tier'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map(tier => (
            <div key={tier.id} className={`card ${!tier.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white">{tier.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{tier.duration_mins} minutes</p>
                </div>
                <div className="text-xl font-bold text-yellow-400">{formatPeso(tier.amount_pesos)}</div>
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Rate: {formatPeso(tier.amount_pesos / tier.duration_mins)}/min
              </div>
              {canManage && (
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary text-xs flex-1" onClick={() => toggleActive(tier)}>
                    {tier.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
                    onClick={() => deleteTier(tier.id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Peak Hour Pricing ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Peak Hour Pricing</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              During peak hours, session duration is divided by the multiplier.
              Example: ×1.5 peak — ₱10 (65 min) gives 43 min instead.
            </p>
          </div>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAddRule(!showAddRule)}>
              + Add Rule
            </button>
          )}
        </div>

        {showAddRule && canManage && (
          <div className="card space-y-4">
            <h3 className="font-bold text-white">New Peak Rule</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Rule Name</label>
              <input className="input text-sm" placeholder="Weekday Evening"
                value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Days</label>
              <div className="flex gap-2">
                {DAY_LABELS.map((label, i) => {
                  const active = parseDays(ruleForm.days_of_week).includes(i);
                  return (
                    <button key={i} onClick={() => toggleDay(i)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        active ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Hour</label>
                <select className="input text-sm"
                  value={ruleForm.start_hour} onChange={e => setRuleForm(f => ({ ...f, start_hour: e.target.value }))}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{fmtHour(i)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">End Hour</label>
                <select className="input text-sm"
                  value={ruleForm.end_hour} onChange={e => setRuleForm(f => ({ ...f, end_hour: e.target.value }))}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{fmtHour(i)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Multiplier</label>
                <input className="input text-sm" type="number" step="0.1" min="1" placeholder="1.5"
                  value={ruleForm.multiplier} onChange={e => setRuleForm(f => ({ ...f, multiplier: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              End hour is exclusive. 18→22 = 6 PM to 9:59 PM. Overnight: 22→6 = 10 PM to 5:59 AM.
            </p>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={addRule} disabled={ruleBusy}>
                {ruleBusy ? 'Adding...' : 'Add Rule'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAddRule(false)}>Cancel</button>
            </div>
          </div>
        )}

        {rules.length === 0 ? (
          <div className="card text-slate-400 text-sm">
            No peak rules defined — all sessions use base duration.
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => {
              const days = parseDays(rule.days_of_week);
              return (
                <div key={rule.id} className={`card flex items-center justify-between ${!rule.is_active ? 'opacity-50' : ''}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{rule.name}</span>
                      <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-mono">
                        ×{rule.multiplier}
                      </span>
                      {!rule.is_active && (
                        <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">Off</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {fmtHour(rule.start_hour)} – {fmtHour(rule.end_hour)}
                      {' · '}
                      {days.length === 7 ? 'Every day' : days.map(d => DAY_LABELS[d]).join(', ')}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-2 ml-4 shrink-0">
                      <button className="btn-secondary text-xs" onClick={() => toggleRule(rule)}>
                        {rule.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
                        onClick={() => deleteRule(rule.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
