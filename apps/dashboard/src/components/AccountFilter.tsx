'use client';
import { useEffect, useState } from 'react';
import { api, StaffUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Props {
  value: string;
  onChange: (accountId: string) => void;
}

/**
 * Superadmin-only dropdown to filter data by admin account.
 * Renders nothing for non-superadmin users.
 */
export default function AccountFilter({ value, onChange }: Props) {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<StaffUser[]>([]);

  useEffect(() => {
    if (user?.role !== 'superadmin') return;
    api.getUsers()
      .then(users => setAdmins(users.filter(u => u.role === 'admin' && u.status === 'approved')))
      .catch(() => {});
  }, [user]);

  if (user?.role !== 'superadmin') return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400 text-sm whitespace-nowrap">Account:</span>
      <select
        className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500 text-sm max-w-[200px] min-w-[140px]"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">All Accounts</option>
        {admins.map(a => (
          <option key={a.id} value={a.id}>
            {a.business_name || a.username}
          </option>
        ))}
      </select>
    </div>
  );
}
