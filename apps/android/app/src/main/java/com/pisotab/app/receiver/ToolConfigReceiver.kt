package com.pisotab.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.pisotab.app.PisoTabApp
import com.pisotab.app.service.SyncService
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
 * After updating prefs, SyncService is started (same pattern as BootReceiver).
 * This works even when the app was killed by "adb install -r": Android spawns a
 * process for the receiver (PisoTabApp.onCreate runs), so startForegroundService
 * can be called with the same-package context — non-exported services are allowed.
 * If SyncService is already running, startForegroundService calls onStartCommand()
 * (not overridden), which is a safe no-op.
 *
 * If server_url changes, PisoTabApp.initApi() rebuilds the Retrofit client with
 * the new base URL before the first heartbeat fires.
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

        // If the server URL changed, reinitialize the Retrofit client so the
        // next heartbeat hits the correct server.
        if (prefs.serverUrl != oldServerUrl) {
            try {
                PisoTabApp.instance.initApi()
                Log.i(TAG, "API client reinitialized for new server URL: ${prefs.serverUrl}")
            } catch (e: Exception) {
                Log.w(TAG, "Could not reinitialize API: ${e.message}")
            }
        }

        // Start SyncService so it sends heartbeats with the new device_id.
        // Same pattern as BootReceiver — works even if the app process was killed
        // by "adb install -r", because this receiver runs in the app's own process
        // context and can start non-exported services within the same package.
        try {
            context.startForegroundService(Intent(context, SyncService::class.java))
            Log.i(TAG, "SyncService started — first heartbeat will fire with device_id=${prefs.deviceId}")
        } catch (e: Exception) {
            Log.w(TAG, "Could not start SyncService: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "ToolConfigReceiver"
    }
}
