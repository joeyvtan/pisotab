package com.pisotab.app.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat

/**
 * Monitors charger and WiFi during an active session.
 * Triggers a loud alarm if either is disconnected (possible theft).
 * All behavior is controlled via PrefsManager settings.
 *
 * Uses applicationContext for all long-lived operations so monitoring
 * continues even after MainActivity is destroyed (customer presses Back).
 */
object AntiTheftManager {

    private var mediaPlayer: MediaPlayer? = null
    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var chargerReceiver: BroadcastReceiver? = null
    private val handler = Handler(Looper.getMainLooper())
    private var wifiLostRunnable: Runnable? = null

    // Retained applicationContext — safe to hold as long as the process lives
    private var appContext: Context? = null

    var onAlarmTriggered: ((reason: String) -> Unit)? = null
    var onAlarmStopped: (() -> Unit)? = null

    private var isAlarming = false
    private var lastAlarmReason: String = ""

    private const val ALARM_CHANNEL_ID = "pisotab_alarm"
    private const val ALARM_NOTIF_ID   = 99

    fun start(context: Context) {
        try {
            // Store applicationContext so BroadcastReceiver and MediaPlayer outlive
            // the Activity. Using Activity context here would cause receivers to stop
            // delivering events after onDestroy() and MediaPlayer to fail on Android 10+.
            appContext = context.applicationContext
            createAlarmChannel()
            // Only unregister old receivers — do NOT stop the alarm sound
            unregisterReceivers()
            val prefs = PrefsManager(appContext!!)
            if (prefs.alarmOnChargerDisconnect && prefs.connectionMode != "usb") watchCharger()
            if (prefs.alarmOnWifiDisconnect) watchWifi()
        } catch (_: Exception) {}
    }

    fun lastAlarmReason(): String = lastAlarmReason

    private fun createAlarmChannel() {
        val ctx = appContext ?: return
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                ALARM_CHANNEL_ID,
                "Anti-Theft Alarm",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Shows when anti-theft alarm is triggered"
                enableVibration(true)
            }
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(ch)
        }
    }

    fun stop(context: Context) {
        // Full shutdown: stop alarm AND unregister receivers
        if (appContext == null) appContext = context.applicationContext
        stopAlarm()
        unregisterReceivers()
    }

    private fun unregisterReceivers() {
        val ctx = appContext ?: return
        try { chargerReceiver?.let { ctx.unregisterReceiver(it) } } catch (_: Exception) {}
        chargerReceiver = null
        wifiLostRunnable?.let { handler.removeCallbacks(it) }
        wifiLostRunnable = null
        try {
            val cb = networkCallback
            val cm = connectivityManager
            if (cb != null && cm != null) cm.unregisterNetworkCallback(cb)
        } catch (_: Exception) {}
        networkCallback = null
        connectivityManager = null
    }

    private fun watchCharger() {
        val ctx = appContext ?: return
        if (chargerReceiver != null) return
        chargerReceiver = object : BroadcastReceiver() {
            override fun onReceive(rcvCtx: Context, intent: Intent) {
                when (intent.action) {
                    Intent.ACTION_POWER_DISCONNECTED -> triggerAlarm("Charger unplugged!")
                    Intent.ACTION_POWER_CONNECTED    -> stopAlarm()
                }
            }
        }
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_POWER_DISCONNECTED)
            addAction(Intent.ACTION_POWER_CONNECTED)
        }
        ctx.registerReceiver(chargerReceiver, filter)
    }

    private fun watchWifi() {
        val ctx = appContext ?: return
        if (networkCallback != null) return
        val prefs = PrefsManager(ctx)
        val delaySecs = prefs.alarmDelaySeconds.toLong()
        connectivityManager = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onLost(network: Network) {
                val runnable = Runnable { triggerAlarm("WiFi disconnected!") }
                wifiLostRunnable = runnable
                handler.postDelayed(runnable, delaySecs * 1000L)
            }
            override fun onAvailable(network: Network) {
                wifiLostRunnable?.let { handler.removeCallbacks(it) }
                wifiLostRunnable = null
                stopAlarm()
            }
        }
        val request = NetworkRequest.Builder()
            .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
            .build()
        connectivityManager?.registerNetworkCallback(request, networkCallback!!)
    }

    private fun triggerAlarm(reason: String) {
        val ctx = appContext ?: return
        if (isAlarming) return
        isAlarming = true
        lastAlarmReason = reason
        // Notify in-app UI if MainActivity is alive and in the foreground
        onAlarmTriggered?.invoke(reason)
        // Post a system notification so the warning is visible even when the app is backgrounded.
        // This is the only way to surface an alert to the user from outside the app's own UI.
        postAlarmNotification(ctx, reason)

        try {
            val prefs = PrefsManager(ctx)
            val uri = if (prefs.alarmSoundUri.isNotEmpty())
                android.net.Uri.parse(prefs.alarmSoundUri)
            else
                RingtoneManager.getDefaultUri(prefs.alarmSoundType)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            val streamType = AudioManager.STREAM_ALARM
            mediaPlayer = MediaPlayer().apply {
                setDataSource(ctx, uri)
                @Suppress("DEPRECATION")
                setAudioStreamType(streamType)
                isLooping = true
                prepare()
                start()
            }
            val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            am.setStreamVolume(streamType, am.getStreamMaxVolume(streamType), 0)
        } catch (_: Exception) {}
    }

    private fun postAlarmNotification(ctx: Context, reason: String) {
        try {
            val notif = NotificationCompat.Builder(ctx, ALARM_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("⚠ Anti-Theft Alarm")
                .setContentText(reason)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setOngoing(true)       // Cannot be dismissed by swipe — admin must stop it
                .setAutoCancel(false)
                .build()
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(ALARM_NOTIF_ID, notif)
        } catch (_: Exception) {}
    }

    fun stopAlarm() {
        if (!isAlarming) return
        isAlarming = false
        lastAlarmReason = ""
        onAlarmStopped?.invoke()
        try { mediaPlayer?.stop(); mediaPlayer?.release() } catch (_: Exception) {}
        mediaPlayer = null
        // Cancel the system notification posted when alarm was triggered
        try {
            val ctx = appContext ?: return
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .cancel(ALARM_NOTIF_ID)
        } catch (_: Exception) {}
    }

    fun isAlarming() = isAlarming
}
