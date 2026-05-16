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
import android.os.BatteryManager
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
    private var batteryReceiver: BroadcastReceiver? = null
    private val handler = Handler(Looper.getMainLooper())
    private var wifiLostRunnable: Runnable? = null

    // Retained applicationContext — safe to hold as long as the process lives
    private var appContext: Context? = null

    var onAlarmTriggered: ((reason: String) -> Unit)? = null
    var onAlarmStopped: (() -> Unit)? = null

    private var isAlarming = false
    private var lastAlarmReason: String = ""

    private const val ALARM_CHANNEL_ID         = "pisotab_alarm"
    private const val ALARM_NOTIF_ID            = 99
    private const val CHARGE_PROTECT_CHANNEL_ID = "pisotab_charge"
    private const val CHARGE_PROTECT_NOTIF_ID   = 98

    fun start(context: Context) {
        try {
            // Store applicationContext so BroadcastReceiver and MediaPlayer outlive
            // the Activity. Using Activity context here would cause receivers to stop
            // delivering events after onDestroy() and MediaPlayer to fail on Android 10+.
            appContext = context.applicationContext
            createAlarmChannel()
            createChargeProtectChannel()
            // Only unregister old receivers — do NOT stop the alarm sound
            unregisterReceivers()
            val prefs = PrefsManager(appContext!!)
            // Suppress charger alarm when ESP32 relay is managing the charger automatically;
            // the relay intentionally disconnects the charger and would cause false alarms.
            val relayActive = prefs.chargeProtectionEnabled && prefs.connectionMode == "esp32"
            if (prefs.alarmOnChargerDisconnect && prefs.connectionMode != "usb" && !relayActive) watchCharger()
            if (prefs.alarmOnWifiDisconnect) watchWifi()
            if (prefs.chargeProtectionEnabled) watchBatteryLevel()
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
        try { batteryReceiver?.let { ctx.unregisterReceiver(it) } } catch (_: Exception) {}
        batteryReceiver = null
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

    private fun createChargeProtectChannel() {
        val ctx = appContext ?: return
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHARGE_PROTECT_CHANNEL_ID,
                "Charge Protection",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Battery charge threshold alerts" }
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(ch)
        }
    }

    private fun watchBatteryLevel() {
        val ctx = appContext ?: return
        if (batteryReceiver != null) return
        val prefs = PrefsManager(ctx)
        val useRelay = prefs.connectionMode == "esp32"
        batteryReceiver = object : BroadcastReceiver() {
            override fun onReceive(rcvCtx: Context, intent: Intent) {
                val level  = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
                val scale  = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
                val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                if (level < 0 || scale <= 0) return
                val pct = (level * 100) / scale
                val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                 status == BatteryManager.BATTERY_STATUS_FULL
                when {
                    isCharging && pct >= prefs.chargeStopPercent -> {
                        if (useRelay) {
                            sendRelayCommand(ctx, prefs, relayOn = false)
                            postChargeNotification(ctx, "Relay OFF — charger disconnected at $pct%", "Protecting battery above ${prefs.chargeStopPercent}%")
                        } else {
                            postChargeNotification(ctx, "Unplug charger — battery at $pct%", "Charging past ${prefs.chargeStopPercent}% damages battery life")
                        }
                    }
                    !isCharging && pct <= prefs.chargeStartPercent -> {
                        if (useRelay) {
                            sendRelayCommand(ctx, prefs, relayOn = true)
                            postChargeNotification(ctx, "Relay ON — charger connected at $pct%", "Battery below ${prefs.chargeStartPercent}%")
                        } else {
                            postChargeNotification(ctx, "Plug in charger — battery at $pct%", "Battery below ${prefs.chargeStartPercent}%")
                        }
                    }
                    else -> cancelChargeNotification(ctx)
                }
            }
        }
        ctx.registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    }

    private fun sendRelayCommand(ctx: Context, prefs: PrefsManager, relayOn: Boolean) {
        val deviceId = prefs.deviceId
        val token    = prefs.backendToken
        if (deviceId.isEmpty() || token.isEmpty()) return
        val url  = "${prefs.serverUrl}/api/devices/$deviceId/remote-cmd"
        val body = """{"cmd":"${if (relayOn) "relay_on" else "relay_off"}"}"""
        Thread {
            try {
                val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $token")
                conn.doOutput = true
                conn.connectTimeout = 5000
                conn.readTimeout    = 5000
                conn.outputStream.use { it.write(body.toByteArray()) }
                conn.responseCode   // send the request
                conn.disconnect()
            } catch (_: Exception) {}
        }.start()
    }

    private fun postChargeNotification(ctx: Context, title: String, text: String) {
        try {
            val notif = NotificationCompat.Builder(ctx, CHARGE_PROTECT_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setOngoing(true)
                .setAutoCancel(false)
                .build()
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .notify(CHARGE_PROTECT_NOTIF_ID, notif)
        } catch (_: Exception) {}
    }

    private fun cancelChargeNotification(ctx: Context) {
        try {
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .cancel(CHARGE_PROTECT_NOTIF_ID)
        } catch (_: Exception) {}
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
