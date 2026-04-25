/**
 * Socket.IO event definitions.
 * Shared between server emitters and client listeners.
 */
const EVENTS = {
  // Server → Client (dashboard)
  DEVICE_STATUS:    'device:status',     // { device_id, status, last_seen }
  SESSION_STARTED:  'session:started',   // { session }
  SESSION_UPDATED:  'session:updated',   // { session_id, time_remaining_secs, status }
  SESSION_ENDED:    'session:ended',     // { session_id, device_id }
  COIN_INSERTED:    'coin:inserted',     // { device_id, coin_value, credited_secs }
  ALERT:            'alert',             // { type, device_id, message }
  BADGES_UPDATE:    'badges:update',     // { pending_users, pending_requests }

  // Client (dashboard) → Server
  CMD_START:        'cmd:start',         // { device_id, duration_mins, amount_paid }
  CMD_PAUSE:        'cmd:pause',         // { session_id }
  CMD_RESUME:       'cmd:resume',        // { session_id }
  CMD_END:          'cmd:end',           // { session_id }
  CMD_ADD_TIME:     'cmd:add_time',      // { session_id, added_mins }
  CMD_LOCK:         'cmd:lock',          // { device_id }
  CMD_UNLOCK:       'cmd:unlock',        // { device_id }
};

module.exports = EVENTS;
