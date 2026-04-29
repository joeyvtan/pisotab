'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function SupportPage() {
  const { user } = useAuth();

  const [name, setName]       = useState(user?.full_name || user?.username || '');
  const [email, setEmail]     = useState((user as { email?: string })?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Name, email, and message are required'); return;
    }
    setLoading(true);
    try {
      const res = await api.submitSupportMessage({ name: name.trim(), email: email.trim(), subject: subject.trim() || undefined, message: message.trim() });
      setSuccess(res.message);
      setSubject(''); setMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-white">Support</h1>
        <p className="text-slate-400 text-sm mt-1">Have a question or need help? Send us a message.</p>
      </div>

      <div className="card space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Your Name *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email Address *</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <input className="input" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Brief summary of your issue" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Message *</label>
            <textarea
              className="input min-h-[140px] resize-y"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..." />
          </div>

          {error   && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      <div className="card space-y-2">
        <h2 className="font-medium text-white text-sm">Other Ways to Reach Us</h2>
        <p className="text-slate-400 text-sm">
          You can also reach JJT PisoTab support through Telegram — configure your Telegram bot
          in <a href="/dashboard/settings" className="text-orange-400 hover:underline">Settings</a> to receive
          real-time notifications and communicate directly.
        </p>
      </div>
    </div>
  );
}
