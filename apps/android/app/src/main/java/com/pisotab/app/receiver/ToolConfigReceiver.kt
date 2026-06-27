package com.pisotab.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pisotab.app.PisoTabApp
import com.pisotab.app.util.PrefsManager

/**
 * Receives ADB-pushed config from the JJTPisoTab Setup Tool.
 *
 * Usage (via setup tool or manual ADB):
 *   adb shell am broadcast -a com.pisotab.app.TOOL_CONFIG
 *       --es server_url "https://api.jjtpisotab.com"
 *       --es device_id  "dev_xxxx"
 *       --es device_name "Store Unit 1"
 *       --es admin_pin  "1234"
 *
 * Only non-empty values overwrite existing prefs, so partial updates are safe.
 *
 * No SyncService restart is needed: SyncService.startHeartbeat() reads
 * app.prefs.deviceId fresh on every 30-second iteration. The next tick
 * after this receiver fires will automatically use the new device_id.
 *
 * If server_url changes, PisoTabApp.initApi() is called to rebuild the
 * Retrofit client with the new base URL before the next heartbeat.
 */
class ToolConfigReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.pisotab.app.TOOL_CONFIG") return

        val prefs = PrefsManager(context)
        val oldServerUrl = prefs.serverUrl

        intent.getStringExtra("server_url")?.takeIf { it.isNotBlank() }?.let {
            prefs.serverUrl = it
            Log.i(TAG, "server_url → $it")
        }
        intent.getStringExtra("device_id")?.takeIf { it.isNotBlank() }?.let {
            prefs.deviceId = it
            Log.i(TAG, "device_id → $it")
        }
        intent.getStringExtra("device_name")?.takeIf { it.isNotBlank() }?.let {
            prefs.deviceName = it
            Log.i(TAG, "device_name → $it")
        }
        intent.getStringExtra("admin_pin")?.takeIf { it.isNotBlank() }?.let {
            prefs.adminPin = it
            Log.i(TAG, "admin_pin updated")
        }

        // If the server URL changed, reinitialize the Retrofit client so the next
        // heartbeat hits the new server. The heartbeat loop reads device_id from prefs
        // on every tick, so no service restart is needed for device_id changes.
        if (prefs.serverUrl != oldServerUrl) {
            try {
                PisoTabApp.instance.initApi()
                Log.i(TAG, "API client reinitialized for new server URL: ${prefs.serverUrl}")
            } catch (e: Exception) {
                Log.w(TAG, "Could not reinitialize API: ${e.message}")
            }
        }

        Log.i(TAG, "Config applied — next heartbeat will use device_id=${prefs.deviceId}")
    }

    companion object {
        private const val TAG = "ToolConfigReceiver"
    }
}
