package com.pisotab.app.service

import android.app.*
import android.content.BroadcastReceiver
import android.content.Intent
import android.content.IntentFilter
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.pisotab.app.PisoTabApp
import com.pisotab.app.data.remote.CoinRequest
import com.pisotab.app.data.remote.HeartbeatRequest
import com.google.firebase.messaging.FirebaseMessaging
import com.pisotab.app.data.remote.FcmTokenRequest
import com.pisotab.app.data.remote.StartSessionRequest
import com.pisotab.app.receiver.UsbSessionReceiver
import com.pisotab.app.ui.MainActivity
import com.pisotab.app.util.AntiTheftManager
import com.pisotab.app.util.RemoteConfigManager
import com.pisotab.app.util.SocketManager
import org.json.JSONObject
import kotlinx.coroutines.*

class SyncService : Service() {

    private val app get() = application as PisoTabApp
    private val db  get() = app.database
    private val api get() = app.api

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    // Dynamically registered so startActivity() runs inside the foreground-service process,
    // which is unconditionally allowed on Android 10+. Manifest receivers lose this guarantee
    // and are also suppressed by OEM battery optimizers (Samsung, Xiaomi, Realme, etc.).
    private var usbReceiver: BroadcastReceiver? = null

    companion object {
        const val CHANNEL_ID = "pisotab_sync"
        const val NOTIF_ID   = 2

        // Callbacks so MainActivity/ViewModel can react to socket commands
        var onStartSession: ((sessionId: String, durationMins: Int, amountPaid: Double) -> Unit)? = null
        var onPauseSession: (() -> Unit)? = null
        var onResumeSession: (() -> Unit)? = null
        var onEndSession: ((sessionId: String) -> Unit)? = null
        var onAddTime: ((mins: Int) -> Unit)? = null
        var onConnectionChange: ((connected: Boolean, error: String?) -> Unit)? = null
        /** Fired when the cached license status changes — MainActivity uses this to update UI */
        var onLicenseStatusChange: ((status: String) -> Unit)? = null
    }

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIF_ID, buildNotif())
        connectSocket()
        startHeartbeat()
        startSyncFlush()
        registerFcmToken()
        registerUsbReceiver()
        // Resume alarm monitoring after process restart (e.g. system killed and restarted the
        // service). If alarmOnlyDuringSession is false, monitoring is always active. If true,
        // only start when a session is in progress. Either way, AntiTheftManager.start() is
        // idempotent — it unregisters stale receivers before re-registering fresh ones.
        val prefs = app.prefs
        if (!prefs.alarmOnlyDuringSession || prefs.activeSessionId.isNotEmpty()) {
            AntiTheftManager.start(this)
        }
    }

    private fun registerFcmToken() {
        val deviceId = app.prefs.deviceId
        if (deviceId.isEmpty()) return
        // Get current FCM token and send to backend so it can push to this tablet.
        // Firebase handles token rotation; PisoTabFirebaseService.onNewToken covers refreshes.
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            scope.launch {
                try { api.updateFcmToken(deviceId, FcmTokenRequest(token)) } catch (_: Exception) {}
            }
        }
    }

    private fun connectSocket() {
        val serverUrl = app.prefs.serverUrl
        val deviceId  = app.prefs.deviceId
        if (serverUrl.isEmpty() || deviceId.isEmpty()) return

        // Always disconnect first to ensure only one socket in the device room
        SocketManager.disconnect()

        // Wire SocketManager callbacks → static callbacks (read by ViewModel)
        SocketManager.onStartSession = { id, mins, amount ->
            // Block session start when license is expired
            if (app.prefs.licenseStatus != "trial_expired") {
                onStartSession?.invoke(id, mins, amount)
            }
        }
        SocketManager.onPauseSession = { onPauseSession?.invoke() }
        SocketManager.onResumeSession = { onResumeSession?.invoke() }
        SocketManager.onEndSession = { sessionId ->
            // Handle cmd:end directly in SyncService (foreground service — always alive).
            // This ensures the session ends on-device even when MainActivity is destroyed
            // (customer pressed Back during session → onEndSession callback is null) or
            // when the socket briefly dropped and the event arrived late.
            scope.launch {
                val currentId = app.prefs.activeSessionId
                // Only act when the session ID matches (or server sent no ID — legacy compat)
                if (sessionId.isEmpty() || sessionId == currentId) {
                    if (currentId.isNotEmpty()) {
                        db.sessionDao().updateStatus(currentId, "ended")
                        try { api.endSession(currentId) } catch (_: Exception) {}
                        app.prefs.activeSessionId = ""
                    }
                    // Stop the countdown timer regardless of whether MainActivity is alive
                    startService(Intent(applicationContext, TimerService::class.java).apply {
                        action = TimerService.ACTION_END
                    })
                    // Stop anti-theft monitoring — session is over, no need to watch charger/WiFi.
                    // Must be called from SyncService (always alive) rather than MainActivity,
                    // because the customer may have pressed Back and onDestroy() does NOT stop
                    // monitoring (intentionally, so it persists during active sessions).
                    AntiTheftManager.stop(applicationContext)
                    // When MainActivity is alive, onEndSession?.invoke() already handled the
                    // UI transition: vm.endSessionById() → Expired → LockScreenActivity.
                    // Starting MainActivity here would clear LockScreenActivity via singleTask,
                    // explaining why the lock screen disappears immediately on repeat sessions.
                    // Only start LockScreenActivity directly when MainActivity is destroyed
                    // (onEndSession == null) — e.g., customer pressed Back during the session.
                    if (onEndSession == null) {
                        startActivity(Intent(applicationContext, com.pisotab.app.ui.LockScreenActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        })
                    }
                }
            }
            // Also notify MainActivity callback for immediate UI state update (if alive)
            onEndSession?.invoke(sessionId)
        }
        SocketManager.onAddTime = { mins -> onAddTime?.invoke(mins) }
        SocketManager.onConnectionChange = { connected, err -> onConnectionChange?.invoke(connected, err) }

        // Remote admin — apply config pushed from dashboard via socket
        SocketManager.onApplyConfig = { configJson ->
            RemoteConfigManager.applyConfig(configJson, app.prefs)
            SocketManager.emitConfigAck(deviceId)
        }

        // Remote commands
        SocketManager.onRestartApp = {
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP or android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (intent != null) startActivity(intent)
        }
        SocketManager.onRestartDevice = {
            // Requires root or device admin — best-effort; standard builds will do nothing
            try { Runtime.getRuntime().exec(arrayOf("su", "-c", "reboot")) } catch (_: Exception) {}
        }
        SocketManager.onLockScreen = {
            startActivity(android.content.Intent(applicationContext, com.pisotab.app.ui.LockScreenActivity::class.java).apply {
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP
            })
        }

        SocketManager.connect(serverUrl, deviceId)
    }

    private fun startHeartbeat() {
        scope.launch {
            while (true) {
                delay(30_000L)
                val deviceId = app.prefs.deviceId
                if (deviceId.isNotEmpty()) {
                    // Include live session state so the server DB stays accurate when
                    // Socket.IO is disconnected (e.g. device on a flaky connection).
                    val sessionId = app.prefs.activeSessionId.takeIf { it.isNotEmpty() }
                    val timeRemaining = if (sessionId != null) TimerService.currentSecs.takeIf { it > 0 } else null
                    try {
                        val resp = api.heartbeat(deviceId, HeartbeatRequest(null, null, sessionId, timeRemaining))
                        val pendingConfig = resp.body()?.pending_config
                        if (pendingConfig != null) {
                            // Convert Retrofit data class → JSONObject so RemoteConfigManager can parse it
                            val json = JSONObject().apply {
                                pendingConfig.connection_mode?.let { put("connection_mode", it) }
                                pendingConfig.rate_per_min?.let { put("rate_per_min", it) }
                                pendingConfig.secs_per_coin?.let { put("secs_per_coin", it) }
                                pendingConfig.coin_rates?.let { put("coin_rates", it) }
                                pendingConfig.kiosk_mode?.let { put("kiosk_mode", it) }
                                pendingConfig.floating_timer?.let { put("floating_timer", it) }
                                pendingConfig.deep_freeze?.let { put("deep_freeze", it) }
                                pendingConfig.deep_freeze_grace?.let { put("deep_freeze_grace", it) }
                                pendingConfig.alarm_wifi?.let { put("alarm_wifi", it) }
                                pendingConfig.alarm_charger?.let { put("alarm_charger", it) }
                                pendingConfig.alarm_session_only?.let { put("alarm_session_only", it) }
                                pendingConfig.alarm_delay_secs?.let { put("alarm_delay_secs", it) }
                                pendingConfig.admin_pin?.let { if (it.isNotEmpty()) put("admin_pin", it) }
                            }
                            RemoteConfigManager.applyConfig(json, app.prefs)
                            SocketManager.emitConfigAck(deviceId)
                        }
                    } catch (_: Exception) {}
                }
                // Reconnect socket if dropped
                if (!SocketManager.isConnected()) {
                    connectSocket()
                }

                // Sync license status so kiosk enforcement stays current without manual refresh
                val licDeviceId = app.prefs.deviceId
                if (licDeviceId.isNotEmpty()) {
                    try {
                        val resp = api.checkLicense(licDeviceId)
                        if (resp.isSuccessful) {
                            val newStatus = resp.body()?.status ?: ""
                            if (newStatus.isNotEmpty() && newStatus != app.prefs.licenseStatus) {
                                app.prefs.licenseStatus = newStatus
                                onLicenseStatusChange?.invoke(newStatus)
                            }
                        }
                    } catch (_: Exception) {}
                }
            }
        }
    }

    private fun startSyncFlush() {
        scope.launch {
            while (true) {
                delay(15_000L)

                // 1. Flush unsynced coin events
                val events = db.coinEventDao().getUnsynced()
                for (event in events) {
                    try {
                        api.reportCoin(CoinRequest(event.deviceId, event.coinValue, event.pulses, event.creditedSecs))
                        db.coinEventDao().markSynced(event.id)
                    } catch (_: Exception) { break }
                }

                // 2. Flush sessions that were created offline (local_xxx IDs, syncedToServer = false).
                // POST them to the server now that connectivity is restored; replace the local ID
                // with the server-assigned ID so future timer syncs and session-end calls reach
                // the correct record.
                val unsyncedSessions = db.sessionDao().getUnsyncedSessions()
                for (session in unsyncedSessions) {
                    try {
                        val response = api.startSession(
                            StartSessionRequest(
                                device_id      = session.deviceId,
                                pricing_tier_id = null,
                                duration_mins  = session.durationMins,
                                amount_paid    = session.amountPaid,
                                payment_method = session.paymentMethod
                            )
                        )
                        // Mark old local row ended so it is never returned as an active session
                        db.sessionDao().updateStatus(session.id, "ended")
                        // Insert the server-assigned row with live remaining time
                        val liveSecs = TimerService.currentSecs.takeIf { it > 0 } ?: session.timeRemainingSecs
                        db.sessionDao().upsert(session.copy(id = response.id, syncedToServer = true, timeRemainingSecs = liveSecs))
                        // Update prefs so TimerService and all future API calls use the server ID
                        if (app.prefs.activeSessionId == session.id) {
                            app.prefs.activeSessionId = response.id
                        }
                    } catch (_: Exception) { break }
                }
            }
        }
    }

    private fun buildNotif() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("PisoTab").setContentText("Running").setSilent(true)
        .setSmallIcon(android.R.drawable.ic_dialog_info).build()

    private fun createChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Sync", NotificationManager.IMPORTANCE_MIN)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
    }

    private fun registerUsbReceiver() {
        usbReceiver = UsbSessionReceiver()
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_POWER_CONNECTED)
            addAction(Intent.ACTION_POWER_DISCONNECTED)
        }
        registerReceiver(usbReceiver, filter)
    }

    override fun onDestroy() {
        usbReceiver?.let { try { unregisterReceiver(it) } catch (_: Exception) {} }
        usbReceiver = null
        SocketManager.disconnect()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
