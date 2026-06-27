package com.pisotab.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
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
 * After writing prefs, SyncService is restarted so the new server_url/device_id
 * take effect immediately without a manual reboot.
 */
class ToolConfigReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.pisotab.app.TOOL_CONFIG") return

        val prefs = PrefsManager(context)

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

        // Restart SyncService so the new server_url and device_id take effect now.
        restartSyncService(context)
    }

    private fun restartSyncService(context: Context) {
        try {
            context.stopService(Intent(context, SyncService::class.java))
            context.startForegroundService(Intent(context, SyncService::class.java))
            Log.i(TAG, "SyncService restarted with new config")
        } catch (e: Exception) {
            Log.w(TAG, "Could not restart SyncService: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "ToolConfigReceiver"
    }
}
