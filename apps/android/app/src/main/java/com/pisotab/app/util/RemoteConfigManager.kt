package com.pisotab.app.util

import android.util.Log
import org.json.JSONObject

/**
 * Applies a remote config payload (from the dashboard PATCH /api/devices/:id/config)
 * into local SharedPreferences so all app components pick up the new settings immediately.
 *
 * Called from SyncService both on heartbeat response (pending_config) and
 * on the cmd:apply_config socket event.
 */
object RemoteConfigManager {

    private const val TAG = "RemoteConfigManager"

    /** Notified on the main thread after prefs are updated from a remote config push. */
    var onConfigChanged: (() -> Unit)? = null

    fun applyConfig(config: JSONObject, prefs: PrefsManager) {
        try {
            if (config.has("connection_mode")) {
                prefs.connectionMode = config.getString("connection_mode")
            }
            if (config.has("rate_per_min")) {
                prefs.timerRatePerMinute = config.getDouble("rate_per_min").toFloat()
            }
            if (config.has("secs_per_coin")) {
                prefs.timerSecondsPerCoin = config.getInt("secs_per_coin")
            }
            if (config.has("coin_rates")) {
                prefs.coinRates = config.getString("coin_rates")
            }
            if (config.has("kiosk_mode")) {
                prefs.isKioskModeEnabled = config.getBoolean("kiosk_mode")
            }
            if (config.has("floating_timer")) {
                prefs.floatingTimerEnabled = config.getBoolean("floating_timer")
            }
            if (config.has("deep_freeze")) {
                prefs.deepFreezeEnabled = config.getBoolean("deep_freeze")
            }
            if (config.has("deep_freeze_grace")) {
                prefs.deepFreezeGracePeriodSecs = config.getInt("deep_freeze_grace")
            }
            if (config.has("alarm_wifi")) {
                prefs.alarmOnWifiDisconnect = config.getBoolean("alarm_wifi")
            }
            if (config.has("alarm_charger")) {
                prefs.alarmOnChargerDisconnect = config.getBoolean("alarm_charger")
            }
            if (config.has("alarm_session_only")) {
                prefs.alarmOnlyDuringSession = config.getBoolean("alarm_session_only")
            }
            if (config.has("alarm_delay_secs")) {
                prefs.alarmDelaySeconds = config.getInt("alarm_delay_secs")
            }
            if (config.has("admin_pin") && !config.isNull("admin_pin")) {
                val pin = config.getString("admin_pin")
                if (pin.isNotEmpty()) prefs.adminPin = pin
            }
            Log.d(TAG, "Remote config applied successfully")
            onConfigChanged?.invoke()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to apply remote config: ${e.message}")
        }
    }
}
