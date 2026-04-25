package com.pisotab.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.pisotab.app.PisoTabApp
import com.pisotab.app.data.remote.FcmTokenRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Receives Firebase Cloud Messaging events.
 *
 * Responsibilities:
 *   1. onNewToken — sends the refreshed FCM token to the backend so it can push to this device.
 *   2. onMessageReceived — shows a local notification when a session event arrives via FCM
 *      (backup delivery path when Socket.IO is temporarily disconnected).
 */
class PisoTabFirebaseService : FirebaseMessagingService() {

    private val app get() = application as PisoTabApp

    companion object {
        private const val FCM_CHANNEL_ID  = "pisotab_fcm"
        private const val FCM_NOTIF_ID    = 100
    }

    /**
     * Called by Firebase when the registration token is created or rotated.
     * Send the new token to the backend so push messages reach this device.
     */
    override fun onNewToken(token: String) {
        val deviceId = app.prefs.deviceId
        if (deviceId.isEmpty()) return   // Not configured yet — heartbeat will retry later
        CoroutineScope(Dispatchers.IO).launch {
            try { app.api.updateFcmToken(deviceId, FcmTokenRequest(token)) } catch (_: Exception) {}
        }
    }

    /**
     * Called when a message arrives while the app is in the foreground, OR
     * as a data-only message while backgrounded/killed (no auto-shown notification).
     * Shows a local notification so the admin or customer sees the alert.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title ?: message.data["title"] ?: return
        val body  = message.notification?.body  ?: message.data["body"]  ?: ""
        showNotification(title, body)
    }

    private fun showNotification(title: String, body: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(FCM_CHANNEL_ID, "Session Alerts", NotificationManager.IMPORTANCE_HIGH)
            )
        }
        val notif = NotificationCompat.Builder(this, FCM_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        nm.notify(FCM_NOTIF_ID, notif)
    }
}
