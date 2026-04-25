package com.pisotab.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.pisotab.app.service.SyncService
import com.pisotab.app.ui.MainActivity

/**
 * Launches the app automatically after device reboot.
 * Registered for BOOT_COMPLETED in the manifest.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            context.startForegroundService(Intent(context, SyncService::class.java))
            val appIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            context.startActivity(appIntent)
        }
    }
}
