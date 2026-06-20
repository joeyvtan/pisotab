package com.pisotab.app.service

import android.app.*
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.*
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.pisotab.app.PisoTabApp
import com.pisotab.app.data.remote.SyncTimeRequest
import com.pisotab.app.data.remote.UsbAmountSyncRequest
import com.pisotab.app.ui.MainActivity
import kotlinx.coroutines.*

class TimerService : Service() {

    private val app get() = application as PisoTabApp
    private val db  get() = app.database
    private val api get() = app.api

    companion object {
        const val ACTION_START     = "ACTION_START"
        const val ACTION_START_USB = "ACTION_START_USB"
        const val ACTION_PAUSE     = "ACTION_PAUSE"
        const val ACTION_RESUME    = "ACTION_RESUME"
        const val ACTION_END       = "ACTION_END"
        const val ACTION_ADD_TIME  = "ACTION_ADD_TIME"
        const val EXTRA_SESSION_ID    = "session_id"
        const val EXTRA_DURATION_SECS = "duration_secs"
        const val EXTRA_ADD_SECS      = "add_secs"
        const val CHANNEL_ID = "pisotab_timer"
        const val NOTIF_ID   = 1

        // Called every second so MainActivity can update the display
        var onTick: ((secs: Int) -> Unit)? = null
        var isRunning: Boolean = false
        var isUsbMode: Boolean = false
        var currentSecs: Int = 0
        // Tracks which session the running timer belongs to — used by MainActivity to
        // detect a stale timer from a previous session and force ACTION_START instead of RESUME.
        var currentSessionId: String = ""

        // Packages that must never trigger the whitelist enforcer redirect.
        // Includes browsers (Chrome Custom Tabs used for OAuth), Google Play Services
        // (GMS account picker / Google Sign-In are real Activities that register in
        // UsageStats), and other system packages that briefly appear during login flows.
        // Dynamic queryIntentActivities() returns an empty list on Android 11+ without
        // a matching <queries> entry, so this list is hardcoded.
        val EXEMPT_PACKAGES = setOf(
            // Browsers (Chrome Custom Tabs / OAuth)
            "com.android.chrome",
            "com.chrome.beta",
            "com.chrome.dev",
            "com.chrome.canary",
            "org.chromium.chrome",
            "com.google.android.apps.chrome",
            "org.mozilla.firefox",
            "org.mozilla.firefox_beta",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.microsoft.emmx",
            "com.sec.android.app.sbrowser",
            "com.android.browser",
            "com.huawei.browser",
            "com.mi.globalbrowser",
            "com.brave.browser",
            // Google auth / account picker (shows as a foreground Activity during sign-in)
            "com.google.android.gms",
            "com.google.android.gsf",
            "com.google.android.googlequicksearchbox",
            "com.google.android.auth",
            // Android system UI that briefly appears during transitions / dialogs
            "com.android.systemui",
            "com.android.vending",
            "android"
        )
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var timerJob: Job? = null
    private var whitelistJob: Job? = null
    private var timeRemainingSecs = 0
    private var sessionId = ""
    private var isPaused = false
    private var syncCounter = 0
    // Wall-clock deadline: epoch ms when the session expires (excluding paused time).
    // Recomputed on start, resume, and add-time so the timer is always anchored to real time.
    private var deadlineMs = 0L
    // Remaining secs snapshot taken the moment pause begins — used to restore the deadline on resume.
    private var pausedRemainingSecs = 0

    // Floating overlay
    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var floatingTimerText: TextView? = null
    private var floatingParams: WindowManager.LayoutParams? = null
    private var hasBeepedAt10 = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                sessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: return START_NOT_STICKY
                timeRemainingSecs = intent.getIntExtra(EXTRA_DURATION_SECS, 0)
                currentSecs = timeRemainingSecs
                currentSessionId = sessionId
                isPaused = false
                isRunning = true
                isUsbMode = false
                hasBeepedAt10 = false
                startForeground(NOTIF_ID, buildNotification())
                createFloatingView()
                startTimer()
                startWhitelistEnforcement()
            }
            ACTION_START_USB -> {
                sessionId = intent.getStringExtra(EXTRA_SESSION_ID) ?: return START_NOT_STICKY
                timeRemainingSecs = intent.getIntExtra(EXTRA_DURATION_SECS, 0)
                currentSecs = timeRemainingSecs
                currentSessionId = sessionId
                isPaused = false
                isRunning = true
                isUsbMode = true
                hasBeepedAt10 = false
                startForeground(NOTIF_ID, buildNotification())
                createFloatingView()
                startUsbTimer()
                startWhitelistEnforcement()
            }
            ACTION_PAUSE -> {
                if (!isPaused) {
                    // Snapshot wall-clock remaining so resume can reanchor the deadline accurately
                    pausedRemainingSecs = ((deadlineMs - System.currentTimeMillis()) / 1000L)
                        .toInt().coerceAtLeast(0)
                    isPaused = true
                }
                updateNotification()
            }
            ACTION_RESUME -> {
                if (isPaused) {
                    // Reanchor deadline from the paused snapshot, discarding time spent paused
                    deadlineMs = System.currentTimeMillis() + (pausedRemainingSecs * 1000L)
                    isPaused = false
                }
                updateNotification()
            }
            ACTION_ADD_TIME -> {
                val extra = intent.getIntExtra(EXTRA_ADD_SECS, 0)
                if (isPaused) {
                    pausedRemainingSecs += extra
                    timeRemainingSecs = pausedRemainingSecs
                } else {
                    deadlineMs += extra * 1000L
                    timeRemainingSecs = ((deadlineMs - System.currentTimeMillis()) / 1000L)
                        .toInt().coerceAtLeast(0)
                }
                currentSecs = timeRemainingSecs
                onTick?.invoke(timeRemainingSecs)
                updateNotification()
            }
            ACTION_END -> endSession()
        }
        return START_STICKY
    }

    private fun startTimer() {
        timerJob?.cancel()
        // Anchor to wall-clock deadline instead of decrementing per delay(1000L).
        // delay(1000L) is "at least 1000ms" — DB writes + UI work after each delay add
        // ~5-20ms per cycle. Over a 30-min session that compounds to 5-15 seconds of drift
        // versus the ESP32 millis()-based hardware timer. Wall-clock anchoring eliminates drift
        // because remaining = (deadline - now) is always correct regardless of loop overhead.
        deadlineMs = System.currentTimeMillis() + (timeRemainingSecs * 1000L)
        timerJob = scope.launch {
            while (true) {
                delay(200L) // short poll — value read from wall clock, never accumulated
                if (isPaused) continue
                val remaining = ((deadlineMs - System.currentTimeMillis()) / 1000L)
                    .toInt().coerceAtLeast(0)
                // Only act when the second actually changes to avoid redundant DB/UI writes
                if (remaining != timeRemainingSecs) {
                    timeRemainingSecs = remaining
                    currentSecs = remaining
                    syncCounter++
                    // Always use prefs.activeSessionId — for coin sessions the ID changes from
                    // a local placeholder to the server-assigned ID after the API call completes.
                    val activeId = app.prefs.activeSessionId.takeIf { it.isNotEmpty() } ?: sessionId
                    db.sessionDao().updateTime(activeId, remaining)
                    onTick?.invoke(remaining)
                    updateFloatingView()
                    if (syncCounter % 10 == 0) {
                        try { api.syncTime(activeId, SyncTimeRequest(remaining)) } catch (_: Exception) {}
                    }
                    updateNotification()
                }
                if (remaining <= 0) break
            }
            onSessionExpired()
        }
    }

    private fun startUsbTimer() {
        timerJob?.cancel()
        timerJob = scope.launch {
            while (true) {
                delay(1000L)
                if (!isPaused) {
                    timeRemainingSecs++
                    currentSecs = timeRemainingSecs
                    val activeId = app.prefs.activeSessionId.takeIf { it.isNotEmpty() } ?: sessionId
                    db.sessionDao().updateTime(activeId, timeRemainingSecs)
                    onTick?.invoke(timeRemainingSecs)
                    updateFloatingView()
                    // Record a coin event every minute for sales monitoring
                    if (timeRemainingSecs % 60 == 0) {
                        val rate = app.prefs.timerRatePerMinute.toDouble()
                        val event = com.pisotab.app.data.local.CoinEventEntity(
                            id = java.util.UUID.randomUUID().toString(),
                            deviceId = app.prefs.deviceId,
                            coinValue = rate,
                            pulses = 0,
                            creditedSecs = 60,
                            createdAt = System.currentTimeMillis()
                        )
                        db.coinEventDao().insert(event)
                        // Keep amountPaid on the session entity in sync
                        val elapsedMins = timeRemainingSecs / 60
                        try { db.sessionDao().updateAmountPaid(activeId, elapsedMins * rate) } catch (_: Exception) {}
                    }
                    updateNotification()
                }
            }
        }
    }

    private fun startWhitelistEnforcement() {
        val allowed = app.prefs.allowedPackages
        if (allowed.isEmpty()) return  // no whitelist configured — skip
        whitelistJob?.cancel()
        // Track consecutive detections of the same non-whitelisted package.
        // Login flows involve transient system UI (GMS account picker, auth dialogs,
        // Chrome Custom Tabs) that appear as foreground Activities in UsageStats.
        // Requiring 5 consecutive detections (~8s) gives any auth flow time to complete.
        // IMPORTANT: null from getForegroundApp() resets the count — a momentary
        // UsageStats gap must not silently accumulate toward the threshold.
        var consecutiveCount = 0
        var lastNonAllowed: String? = null
        whitelistJob = scope.launch {
            while (isActive) {
                delay(2000L)
                if (isPaused) { consecutiveCount = 0; continue }
                val foreground = getForegroundApp()
                if (foreground == null) { consecutiveCount = 0; continue }
                if (foreground == packageName) { consecutiveCount = 0; continue }
                if (foreground in allowed) { consecutiveCount = 0; continue }
                if (foreground in EXEMPT_PACKAGES) { consecutiveCount = 0; continue }
                // Non-whitelisted, non-exempt — count consecutive detections
                if (foreground == lastNonAllowed) {
                    consecutiveCount++
                } else {
                    consecutiveCount = 1
                    lastNonAllowed = foreground
                }
                // Redirect only after 5 consecutive checks (~8s) of the same package.
                if (consecutiveCount >= 5) {
                    consecutiveCount = 0
                    startActivity(Intent(this@TimerService, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                }
            }
        }
    }

    private fun getForegroundApp(): String? {
        return try {
            val usm = getSystemService(USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
            val now = System.currentTimeMillis()
            // queryEvents() tracks Activity MOVE_TO_FOREGROUND/BACKGROUND lifecycle events.
            // queryUsageStats() returns keyboard IME package as "last used" while user types
            // (Samsung/OEM behavior) — causes false enforcer triggers during Facebook login.
            // IME services are NOT Activities and never generate MOVE_TO_FOREGROUND events,
            // so queryEvents() is immune to the keyboard interference.
            val events = usm.queryEvents(now - 3_600_000L, now)
            var foreground: String? = null
            val ev = android.app.usage.UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(ev)
                when (ev.eventType) {
                    android.app.usage.UsageEvents.Event.MOVE_TO_FOREGROUND ->
                        foreground = ev.packageName
                    android.app.usage.UsageEvents.Event.MOVE_TO_BACKGROUND ->
                        if (foreground == ev.packageName) foreground = null
                }
            }
            foreground
        } catch (_: Exception) { null }
    }

    private fun onSessionExpired() {
        whitelistJob?.cancel()
        removeFloatingView()
        val activeId = app.prefs.activeSessionId.takeIf { it.isNotEmpty() } ?: sessionId
        // Clear prefs SYNCHRONOUSLY before launching MainActivity.
        // syncFromDb() in onResume() checks prefs.activeSessionId first — if empty it returns
        // Idle immediately without querying the DB. This prevents the race where the DB cleanup
        // coroutine (below) hasn't finished yet but onResume already reads stale "active" data,
        // causing an infinite restart loop (showActive(0) → timer expires immediately → repeat).
        app.prefs.activeSessionId = ""
        // DB + server cleanup on an independent scope — stopSelf() triggers onDestroy() which
        // cancels `scope`, killing any coroutine launched on it before it can execute.
        CoroutineScope(Dispatchers.IO).launch {
            db.sessionDao().updateStatus(activeId, "ended")
            try { api.endSession(activeId) } catch (_: Exception) {}
        }
        // If onTick is set, MainActivity is alive and already handling the Expired state
        // transition via onTimeTick(0) → SessionState.Expired → onExpired() → LockScreenActivity.
        // Starting MainActivity here would stack a new instance ON TOP of LockScreenActivity,
        // immediately showing the idle screen and hiding the lock screen countdown.
        // If onTick is null, MainActivity was destroyed (customer pressed Back during session)
        // and we must launch LockScreenActivity directly since onTimeTick(0) was never called.
        if (onTick == null) {
            startActivity(Intent(this, com.pisotab.app.ui.LockScreenActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            })
        }
        stopSelf()
    }

    private fun endSession() {
        whitelistJob?.cancel()
        removeFloatingView()
        timerJob?.cancel()
        val activeId = app.prefs.activeSessionId.takeIf { it.isNotEmpty() } ?: sessionId
        app.prefs.activeSessionId = ""
        val finalElapsed = timeRemainingSecs
        val ratePerMin = app.prefs.timerRatePerMinute.toDouble()
        val wasUsb = isUsbMode
        CoroutineScope(Dispatchers.IO).launch {
            if (wasUsb) {
                // Apply offset to compensate for external hardware timers that cut power
                // slightly before the full minute boundary, which would otherwise floor
                // the earned amount to zero (e.g., 58 s elapsed → ₱0 at ₱1/min).
                val offsetSecs    = app.prefs.usbTimerOffsetSecs
                val effectiveSecs = finalElapsed + offsetSecs
                val totalAmount   = (effectiveSecs / 60.0) * ratePerMin
                val durationMins  = effectiveSecs / 60
                try { db.sessionDao().updateAmountPaid(activeId, totalAmount) } catch (_: Exception) {}
                // Sync final earnings to backend — USB sessions start with amount_paid=0
                // on the server; this call writes the real value before endSession marks it ended.
                try { api.syncUsbAmount(activeId, UsbAmountSyncRequest(totalAmount, durationMins)) } catch (_: Exception) {}
            }
            db.sessionDao().updateStatus(activeId, "ended")
            try { api.endSession(activeId) } catch (_: Exception) {}
        }
        // Mirror onSessionExpired(): transition to lock screen regardless of how the session ended.
        // For USB mode, the normal timer loop never reaches onSessionExpired() (it counts up forever),
        // so this is the only path that shows LockScreenActivity after USB disconnect.
        if (onTick == null) {
            startActivity(Intent(this, com.pisotab.app.ui.LockScreenActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            })
        } else {
            // MainActivity is alive — signal Expired state.
            // Clear isUsbMode first so the USB guard in MainActivity (secs<=0 && !isUsbMode) passes.
            isUsbMode = false
            onTick?.invoke(0)
        }
        stopSelf()
    }

    // ── Floating overlay helpers ────────────────────────────────────────────

    private fun createFloatingView() {
        if (!app.prefs.floatingTimerEnabled) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) return

        // Remove any existing overlay before creating a new one.
        // ACTION_START can be sent to an already-running TimerService (e.g. when session ID
        // changes after offline→online sync, or on app reopen). Without this, the old view is
        // orphaned in WindowManager while floatingView/floatingParams are overwritten — the old
        // view's touch listener then crashes (NPE on floatingParams!!) when it fires, which
        // interrupts onSessionExpired() and prevents the kiosk lock screen from appearing.
        removeFloatingView()

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val timerText = TextView(this).apply {
            text = floatFmt(timeRemainingSecs)
            textSize = 18f
            setTextColor(Color.WHITE)
            setPadding(28, 18, 16, 18)
            gravity = Gravity.CENTER
        }
        val homeBtn = TextView(this).apply {
            text = "⌂"
            textSize = 18f
            setTextColor(Color.parseColor("#94A3B8"))
            setPadding(12, 18, 24, 18)
            gravity = Gravity.CENTER
        }
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            background = floatBg(urgent = false)
            addView(timerText)
            addView(homeBtn)
        }

        floatingTimerText = timerText
        floatingView = container

        floatingParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 32
            y = 300
        }

        // Touch listener on timerText so dragging moves the container window.
        // homeBtn gets its own click listener — no conflict since listeners are on different views.
        val capturedContainer = floatingView!!
        val capturedParams    = floatingParams!!
        val capturedWm        = windowManager!!
        var downX = 0f; var downY = 0f; var startX = 0; var startY = 0

        timerText.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    downX = event.rawX; downY = event.rawY
                    startX = capturedParams.x; startY = capturedParams.y
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    capturedParams.x = startX + (event.rawX - downX).toInt()
                    capturedParams.y = startY + (event.rawY - downY).toInt()
                    try { capturedWm.updateViewLayout(capturedContainer, capturedParams) } catch (_: Exception) {}
                    true
                }
                else -> false
            }
        }
        homeBtn.setOnClickListener {
            startActivity(Intent(this@TimerService, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            })
        }

        try { capturedWm.addView(capturedContainer, capturedParams) } catch (_: Exception) {}
    }

    private fun updateFloatingView() {
        val view = floatingView ?: return
        val urgent = timeRemainingSecs in 1..10
        floatingTimerText?.text = floatFmt(timeRemainingSecs)
        view.background = floatBg(urgent)
        // Beep exactly once when countdown hits 10 seconds
        if (timeRemainingSecs == 10 && !hasBeepedAt10) {
            hasBeepedAt10 = true
            try {
                val tg = ToneGenerator(AudioManager.STREAM_ALARM, ToneGenerator.MAX_VOLUME)
                tg.startTone(ToneGenerator.TONE_PROP_BEEP, 600)
                Handler(Looper.getMainLooper()).postDelayed({ tg.release() }, 1000)
            } catch (_: Exception) {}
        } else if (timeRemainingSecs > 10) {
            hasBeepedAt10 = false
        }
    }

    private fun removeFloatingView() {
        floatingView?.let { v ->
            try {
                // Set FLAG_NOT_TOUCHABLE before removing the window.
                // If the user is pressing the floating timer when the session expires,
                // the overlay is the "touch owner" for that gesture. WindowManagerService
                // defers the focus transition to the next activity (MainActivity) until
                // ACTION_UP arrives on the owning window — but once removed, that ACTION_UP
                // never comes, so the kiosk re-lock in MainActivity.onResume() never fires.
                // Adding FLAG_NOT_TOUCHABLE first tells the InputDispatcher to cancel the
                // active touch on this window immediately, clearing the touch state so
                // startActivity() can transition focus to MainActivity without waiting.
                floatingParams?.let { p ->
                    p.flags = p.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                    windowManager?.updateViewLayout(v, p)
                }
                windowManager?.removeView(v)
            } catch (_: Exception) {}
        }
        floatingView = null
        floatingTimerText = null
    }

    private fun floatBg(urgent: Boolean) = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        cornerRadius = 28f
        setColor(if (urgent) Color.parseColor("#DD991B1B") else Color.parseColor("#DD1E293B"))
    }

    private fun floatFmt(secs: Int) = "%02d:%02d".format(secs / 60, secs % 60)

    // ── Notification helpers ────────────────────────────────────────────────

    private fun buildNotification(): Notification {
        val timeStr = if (isPaused) "PAUSED" else floatFmt(timeRemainingSecs)
        val label = if (isUsbMode) "Time elapsed: $timeStr" else "Time remaining: $timeStr"
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PisoTab Session Active")
            .setContentText(label)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification() {
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIF_ID, buildNotification())
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "Timer", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() {
        removeFloatingView()
        isRunning = false
        isUsbMode = false
        currentSessionId = ""
        timerJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }
}
