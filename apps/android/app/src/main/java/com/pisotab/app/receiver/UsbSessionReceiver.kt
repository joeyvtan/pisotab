package com.pisotab.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.pisotab.app.service.TimerService
import com.pisotab.app.ui.MainActivity
import com.pisotab.app.util.PrefsManager
import java.util.UUID

/**
 * Detects USB power connect/disconnect to drive the USB coin-slot mode.
 *
 * External timer ON  (USB power connected)    → start a count-up session
 * External timer OFF (USB power disconnected) → end the session
 *
 * Only acts when connectionMode == "usb".
 */
class UsbSessionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val prefs = PrefsManager(context)
        if (prefs.connectionMode != "usb") return

        when (intent.action) {
            Intent.ACTION_POWER_CONNECTED -> {
                if (prefs.activeSessionId.isNotEmpty()) return  // already in a session
                val sessionId = "usb_" + UUID.randomUUID().toString().take(8)
                context.startActivity(Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("usb_session_id", sessionId)
                })
            }

            Intent.ACTION_POWER_DISCONNECTED -> {
                if (prefs.activeSessionId.isEmpty()) return
                // Do NOT clear prefs or navigate here — TimerService.endSession() handles
                // cleanup (prefs clear, DB/API update) and launches LockScreenActivity.
                context.startService(Intent(context, TimerService::class.java).apply {
                    action = TimerService.ACTION_END
                })
            }
        }
    }
}
