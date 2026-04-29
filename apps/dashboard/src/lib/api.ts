/**
 * API client — thin wrapper around fetch with auth token injection.
 */
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pisotab_token') || '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),
  register: (data: { username: string; password: string; email?: string; full_name?: string; business_name?: string }) =>
    request<{ message: string; user: StaffUser }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    }),
  forgotPassword: (username: string) =>
    request<{ message: string; reset_token: string }>('/api/auth/forgot-password', {
      method: 'POST', body: JSON.stringify({ username }),
    }),
  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ token, new_password }),
    }),

  // Devices
  getDevices: (account?: string) => {
    const qs = account ? `?account=${encodeURIComponent(account)}` : '';
    return request<Device[]>('/api/devices' + qs);
  },
  createDevice: (data: Partial<Device>) =>
    request<Device>('/api/devices', { method: 'POST', body: JSON.stringify(data) }),
  deleteDevice: (id: string) => request('/api/devices/' + id, { method: 'DELETE' }),
  heartbeat: (id: string) => request(`/api/devices/${id}/heartbeat`, { method: 'POST' }),

  // Sessions
  getSessions: (params?: Record<string, string>) => {
    const qs = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    return request<Session[]>('/api/sessions' + qs);
  },
  startSession: (device_id: string, duration_mins: number, amount_paid: number, pricing_tier_id?: string) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ device_id, duration_mins, amount_paid, pricing_tier_id, payment_method: 'manual' }),
    }),
  pauseSession: (id: string) => request(`/api/sessions/${id}/pause`, { method: 'POST' }),
  resumeSession: (id: string) => request(`/api/sessions/${id}/resume`, { method: 'POST' }),
  endSession: (id: string) => request(`/api/sessions/${id}/end`, { method: 'POST' }),
  addTime: (id: string, added_mins: number, amount_paid: number) =>
    request(`/api/sessions/${id}/add-time`, {
      method: 'POST', body: JSON.stringify({ added_mins, amount_paid }),
    }),
  getRevenue: (account?: string) => {
    const qs = account ? `?account=${encodeURIComponent(account)}` : '';
    return request<RevenueRow[]>('/api/sessions/revenue/summary' + qs);
  },
  getAnalytics: (account?: string) => {
    const qs = account ? `?account=${encodeURIComponent(account)}` : '';
    return request<AnalyticsData>('/api/sessions/analytics' + qs);
  },

  // Pricing
  getPricing: () => request<PricingTier[]>('/api/pricing'),
  createPricing: (data: Partial<PricingTier>) =>
    request<PricingTier>('/api/pricing', { method: 'POST', body: JSON.stringify(data) }),
  updatePricing: (id: string, data: Partial<PricingTier>) =>
    request<PricingTier>('/api/pricing/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePricing: (id: string) => request('/api/pricing/' + id, { method: 'DELETE' }),

  // Users
  getUsers: () => request<StaffUser[]>('/api/users'),
  createUser: (username: string, password: string, role: 'superadmin' | 'admin' | 'staff') =>
    request<StaffUser>('/api/users', { method: 'POST', body: JSON.stringify({ username, password, role }) }),
  deleteUser: (id: string) => request('/api/users/' + id, { method: 'DELETE' }),
  approveUser: (id: string) => request(`/api/users/${id}/approve`, { method: 'PATCH' }),
  suspendUser: (id: string) => request(`/api/users/${id}/suspend`, { method: 'PATCH' }),
  changeUserRole: (id: string, role: string) =>
    request(`/api/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  batchApproveUsers: (ids: string[]) =>
    request<{ ok: boolean; approved: number }>('/api/users/batch-approve', {
      method: 'POST', body: JSON.stringify({ ids }),
    }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST', body: JSON.stringify({ current_password, new_password }),
    }),
  updateTelegram: (telegram_bot_token: string, telegram_chat_id: string) =>
    request<{ ok: boolean }>('/api/auth/me/telegram', {
      method: 'PATCH', body: JSON.stringify({ telegram_bot_token, telegram_chat_id }),
    }),
  getMe: () => request<{ telegram_bot_token?: string; telegram_chat_id?: string } & Record<string, unknown>>('/api/auth/me'),

  // Locations
  getLocations: () => request<Location[]>('/api/locations'),
  createLocation: (name: string, address: string) =>
    request<Location>('/api/locations', { method: 'POST', body: JSON.stringify({ name, address }) }),
  deleteLocation: (id: string) => request('/api/locations/' + id, { method: 'DELETE' }),

  // Device update (e.g. reassign location)
  updateDevice: (id: string, data: Partial<Device>) =>
    request<Device>('/api/devices/' + id, { method: 'PATCH', body: JSON.stringify(data) }),

  // Firmware OTA (admin only)
  getFirmware: () => request<FirmwareInfo>('/api/firmware'),
  uploadFirmware: async (file: File, version: string): Promise<FirmwareInfo> => {
    const token = getToken();
    const form = new FormData();
    form.append('firmware', file);
    form.append('version', version);
    const res = await fetch(`${BASE}/api/firmware/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || 'Upload failed'); }
    return res.json();
  },
  triggerOta: (device_id: string) =>
    request<{ ok: boolean; url: string; version: string }>(`/api/firmware/ota/${device_id}`, { method: 'POST' }),

  // Licenses (admin only)
  getLicenses: () => request<License[]>('/api/licenses'),
  generateLicense: (expires_days: number | null) =>
    request<License>('/api/licenses/generate', { method: 'POST', body: JSON.stringify({ expires_days }) }),
  manageTrial: (deviceId: string, opts: { reset?: boolean; trial_days?: number }) =>
    request(`/api/licenses/trial/${deviceId}`, { method: 'PATCH', body: JSON.stringify(opts) }),
  unbindLicense: (id: string) => request(`/api/licenses/${id}/unbind`, { method: 'PATCH' }),
  deactivateLicense: (id: string) => request(`/api/licenses/${id}/deactivate`, { method: 'PATCH' }),
  deleteLicense: (id: string) => request(`/api/licenses/${id}`, { method: 'DELETE' }),

  // GCash settings
  getGcashSettings: () => request<GcashSettings>('/api/gcash-settings'),
  updateGcashSettings: (data: Partial<GcashSettings>) =>
    request<GcashSettings>('/api/gcash-settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // License pricing
  getLicensePricing: () => request<{ pricing: LicensePricing[]; effective: LicensePricing | null }>('/api/license-pricing'),
  setLicensePricing: (data: Partial<LicensePricing>) =>
    request<LicensePricing>('/api/license-pricing', { method: 'POST', body: JSON.stringify(data) }),
  deleteLicensePricing: (id: string) => request(`/api/license-pricing/${id}`, { method: 'DELETE' }),

  // Purchase requests
  getPurchaseRequests: () => request<PurchaseRequest[]>('/api/purchase-requests'),
  submitPurchaseRequest: (data: { quantity: number; gcash_reference: string; plan?: string }) =>
    request<PurchaseRequest>('/api/purchase-requests', { method: 'POST', body: JSON.stringify(data) }),
  approvePurchaseRequest: (id: string, note?: string) =>
    request(`/api/purchase-requests/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  rejectPurchaseRequest: (id: string, note?: string) =>
    request(`/api/purchase-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ note }) }),
  batchApprovePurchaseRequests: (ids: string[]) =>
    request<{ ok: boolean; approved: number; licenses_generated: { id: string; key: string }[] }>('/api/purchase-requests/batch-approve', {
      method: 'POST', body: JSON.stringify({ ids }),
    }),
  downloadReceipt: async (id: string) => {
    const token = getToken();
    const res = await fetch(`${BASE}/api/purchase-requests/${id}/receipt`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || 'Failed'); }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `receipt-${id}.pdf`; a.click();
    URL.revokeObjectURL(url);
  },

  // App settings
  getAppSettings: () => request<Record<string, string>>('/api/app-settings'),
  updateAppSetting: (key: string, value: string) =>
    request<{ key: string; value: string }>(`/api/app-settings/${key}`, {
      method: 'PATCH', body: JSON.stringify({ value }),
    }),

  // Downloads
  getDownloads: () => request<DownloadsData>('/api/downloads'),
  uploadApk: async (file: File, version: string): Promise<DownloadFile> => {
    const token = getToken();
    const form = new FormData();
    form.append('apk', file);
    form.append('version', version);
    const res = await fetch(`${BASE}/api/downloads/upload-apk`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error || 'Upload failed'); }
    return res.json();
  },

  // Audit log
  getAuditLog: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<AuditEntry[]>('/api/audit-log' + qs);
  },

  // Support / contact form
  submitSupportMessage: (data: { name: string; email: string; subject?: string; message: string }) =>
    request<{ ok: boolean; message: string }>('/api/support/contact', {
      method: 'POST', body: JSON.stringify(data),
    }),

  // 2FA TOTP
  totpSetup: () => request<{ secret: string; qr_code: string }>('/api/auth/totp/setup'),
  totpEnable: (code: string) => request<{ ok: boolean; message: string }>('/api/auth/totp/enable', {
    method: 'POST', body: JSON.stringify({ code }),
  }),
  totpDisable: (code: string) => request<{ ok: boolean; message: string }>('/api/auth/totp/disable', {
    method: 'POST', body: JSON.stringify({ code }),
  }),
  totpVerify: (temp_token: string, code: string) =>
    request<{ token: string; user: User }>('/api/auth/totp/verify', {
      method: 'POST', body: JSON.stringify({ temp_token, code }),
    }),

  // License transfer
  transferLicense: (id: string, to_user_id: string) =>
    request(`/api/licenses/${id}/transfer`, { method: 'POST', body: JSON.stringify({ to_user_id }) }),

  // Peak pricing rules (admin only)
  getPeakRules: () => request<PeakRule[]>('/api/peak-rules'),
  createPeakRule: (data: Omit<PeakRule, 'id' | 'created_at'>) =>
    request<PeakRule>('/api/peak-rules', { method: 'POST', body: JSON.stringify(data) }),
  updatePeakRule: (id: string, data: Partial<PeakRule>) =>
    request<PeakRule>('/api/peak-rules/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePeakRule: (id: string) => request('/api/peak-rules/' + id, { method: 'DELETE' }),

  // Remote device admin (Phase 11)
  getDeviceConfig: (id: string) => request<DeviceConfig>(`/api/devices/${id}/config`),
  updateDeviceConfig: (id: string, data: Partial<DeviceConfig>) =>
    request<DeviceConfig & { pushed: boolean }>(`/api/devices/${id}/config`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  sendRemoteCmd: (id: string, cmd: 'restart_app' | 'restart_device' | 'lock_screen') =>
    request<{ sent: boolean; cmd: string }>(`/api/devices/${id}/remote-cmd`, {
      method: 'POST', body: JSON.stringify({ cmd }),
    }),
};

// Types
export interface User {
  id: string; username: string; role: string;
  email?: string; full_name?: string; business_name?: string;
  status?: string;
}
export interface Device {
  id: string; name: string; location_id: string; location_name?: string;
  status: 'online' | 'offline' | 'in_session' | 'locked';
  last_seen: number; ip_address?: string; android_id?: string;
  owner_user_id?: string;
  active_session_id?: string; time_remaining_secs?: number; session_status?: string;
  session_payment_method?: string;
  license_status?: 'active' | 'trial' | 'trial_expired';
  license_days_left?: number | null;
  trial_days_override?: number | null;
}
export interface Session {
  id: string; device_id: string; device_name?: string; tier_name?: string;
  started_at: number; ended_at?: number; duration_mins: number;
  time_remaining_secs: number; status: 'active' | 'paused' | 'ended';
  payment_method: string; amount_paid: number;
}
export interface PricingTier {
  id: string; name: string; amount_pesos: number; duration_mins: number; is_active: number;
}
export interface Location { id: string; name: string; address?: string; }
export interface StaffUser {
  id: string; username: string; role: string; created_at: number;
  email?: string; full_name?: string; business_name?: string;
  status: 'pending' | 'approved' | 'suspended';
}
export interface RevenueRow { day: string; session_count: number; total_revenue: number; total_mins: number; }
export interface FirmwareInfo {
  version: string | null; filename: string | null; size: number | null;
  uploaded_at: number | null; download_url?: string;
}
export interface PeakRule {
  id: string; name: string; days_of_week: string;
  start_hour: number; end_hour: number; multiplier: number;
  is_active: number; created_at: number;
}
export interface License {
  id: string; key: string; plan: string;
  device_id: string | null; device_name: string | null;
  expires_at: number | null; created_at: number;
}
export interface GcashSettings {
  id: string; gcash_name: string; gcash_number: string; qr_image_url?: string;
}
export interface LicensePricing {
  id: string; user_id: string | null; user_username?: string;
  plan: string; price_pesos: number; duration_days: number | null; created_at: number;
}
export interface PurchaseRequest {
  id: string; user_id: string; plan: string; quantity: number;
  amount_paid: number; gcash_reference: string;
  status: 'pending' | 'approved' | 'rejected';
  requester_username?: string; requester_full_name?: string;
  reviewer_username?: string; reviewed_at?: number; note?: string;
  created_at: number;
}
export interface DownloadFile {
  id: string; type: 'apk' | 'firmware'; version: string;
  filename: string; size: number; changelog?: string | null; uploaded_at: number; download_url: string;
}
export interface DownloadsData {
  apk: DownloadFile | null; firmware: DownloadFile | null; all: DownloadFile[];
}
export interface AuditEntry {
  id: string; user_id: string; actor_username: string;
  action: string; target_type: string; target_id: string;
  detail: Record<string, unknown> | null; created_at: number;
}
export interface AnalyticsData {
  hourly:    { hour: number; sessions: number; revenue: number }[];
  byDevice:  { device_name: string; sessions: number; revenue: number; avg_mins: number }[];
  byPayment: { payment_method: string; sessions: number; revenue: number }[];
}
export interface CoinRate { coin: number; minutes: number; }
export interface DeviceConfig {
  device_id:          string;
  connection_mode:    'esp32' | 'usb';
  rate_per_min:       number;
  secs_per_coin:      number;
  coin_rates:         string;
  kiosk_mode:         boolean;
  floating_timer:     boolean;
  deep_freeze:        boolean;
  deep_freeze_grace:  number;
  alarm_wifi:         boolean;
  alarm_charger:      boolean;
  alarm_session_only: boolean;
  alarm_delay_secs:   number;
  updated_at:         number;
  applied_at:         number | null;
  config_pending:     boolean;
  admin_pin:          string | null;
}
