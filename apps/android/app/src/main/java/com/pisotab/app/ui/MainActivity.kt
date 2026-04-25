package com.pisotab.app.ui

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.pisotab.app.R
import com.pisotab.app.service.SyncService
import com.pisotab.app.service.TimerService
import com.pisotab.app.util.KioskManager
import com.pisotab.app.util.ThemeManager
import com.pisotab.app.util.WallpaperManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private val vm: MainViewModel by viewModels()

    private lateinit var ivWallpaper: ImageView
    private lateinit var screenIdle: View
    private lateinit var screenActive: View
    private lateinit var screenLicenseExpired: View
    private lateinit var tvTimer: TextView
    private lateinit var tvStatus: TextView
    private lateinit var tvConnection: TextView
    private lateinit var btnAdmin: View
    private lateinit var alarmBanner: View
    private lateinit var tvAlarmReason: TextView
    private lateinit var rvLauncher: RecyclerView
    private lateinit var launcherAdapter: LauncherAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        ThemeManager.applyTheme(this)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        ivWallpaper          = findViewById(R.id.iv_wallpaper)
        screenIdle           = findViewById(R.id.screen_idle)
        screenActive         = findViewById(R.id.screen_active)
        screenLicenseExpired = findViewById(R.id.screen_license_expired)
        tvTimer              = findViewById(R.id.tv_timer)
        tvStatus     = findViewById(R.id.tv_status)
        tvConnection = findViewById(R.id.tv_connection)
        btnAdmin      = findViewById(R.id.btn_admin)
        alarmBanner   = findViewById(R.id.alarm_banner)
        tvAlarmReason = findViewById(R.id.tv_alarm_reason)
        rvLauncher    = findViewById(R.id.rv_launcher)

        // Set business / device name in both screens
        val bizName = vm.prefs.businessName.ifEmpty { "PisoTab" }
        val devName = vm.prefs.deviceName
        findViewById<TextView>(R.id.tv_business_name_launcher).text = bizName
        findViewById<TextView>(R.id.tv_device_name_launcher).text = devName
        findViewById<TextView>(R.id.tv_business_name_idle).text = bizName
        findViewById<TextView>(R.id.tv_device_name_idle).text = devName

        // Launcher grid
        launcherAdapter = LauncherAdapter { item ->
            val launch = packageManager.getLaunchIntentForPackage(item.packageName)
            if (launch != null) startActivity(launch)
        }
        rvLauncher.layoutManager = GridLayoutManager(this, 4)
        rvLauncher.adapter = launcherAdapter

        // Hidden corner long-press → admin PIN (works on both idle and active screens)
        btnAdmin.setOnLongClickListener { showAdminPinDialog(); true }

        com.pisotab.app.util.AntiTheftManager.onAlarmTriggered = { reason ->
            runOnUiThread {
                alarmBanner.visibility = View.VISIBLE
                tvAlarmReason.text = reason
            }
        }
        com.pisotab.app.util.AntiTheftManager.onAlarmStopped = {
            runOnUiThread { alarmBanner.visibility = View.GONE }
        }

        // Update timer display every second from TimerService
        TimerService.onTick = { secs ->
            runOnUiThread {
                tvTimer.text = formatTime(secs)
                // onTimeTick(0) sets SessionState.Expired → onExpired() → LockScreenActivity.
                // Do NOT call vm.endSession() here — that emits Idle and bypasses LockScreen.
                if (secs <= 0 && !TimerService.isUsbMode) vm.onTimeTick(secs)
            }
        }

        // Request POST_NOTIFICATIONS permission on Android 13+ (API 33).
        // Without this, NotificationManager.notify() is silently ignored — the alarm
        // notification never appears when the app is backgrounded.
        // No-op on Android 12 and below (permission is auto-granted on older APIs).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                0
            )
        }

        // Start background sync + socket service
        startForegroundService(Intent(this, SyncService::class.java))

        if (vm.prefs.isKioskModeEnabled) {
            KioskManager.startLockTask(this)
            KioskManager.disableUsbDebugging(this)
            KioskManager.disableSettings(this)
        }
        KioskManager.applyImmersiveMode(window)

        if (!vm.prefs.isConfigured) {
            startActivity(Intent(this, SetupActivity::class.java))
        }

        // Wire dashboard socket commands → ViewModel (runs on main thread via lifecycleScope)
        val tvConnectionIdle = findViewById<TextView>(R.id.tv_connection_idle)
        fun setConnectionStatus(connected: Boolean, error: String?) {
            val text  = if (connected) "● Connected" else "● ${error ?: "Disconnected"}"
            val color = if (connected) android.graphics.Color.parseColor("#22C55E")
                        else          android.graphics.Color.parseColor("#EF4444")
            tvConnection.text = text;       tvConnection.setTextColor(color)
            tvConnectionIdle.text = text;   tvConnectionIdle.setTextColor(color)
        }
        SyncService.onConnectionChange = { connected, error ->
            runOnUiThread { setConnectionStatus(connected, error) }
        }
        if (com.pisotab.app.util.SocketManager.isConnected()) {
            setConnectionStatus(true, null)
        }

        SyncService.onStartSession = { sessionId, mins, amount ->
            runOnUiThread { vm.startSession(mins, amount, serverSessionId = sessionId) }
        }
        SyncService.onPauseSession = {
            runOnUiThread { vm.pauseSession() }
        }
        SyncService.onResumeSession = {
            runOnUiThread { vm.resumeSession() }
        }
        SyncService.onEndSession = { sessionId ->
            // Use endSessionById so a delayed cmd:end echo (backend re-emits cmd:end when the
            // device calls api.endSession on expiry) cannot kill a newly started session.
            runOnUiThread { vm.endSessionById(sessionId) }
        }
        SyncService.onAddTime = { mins ->
            runOnUiThread {
                if (vm.prefs.licenseStatus == "trial_expired") return@runOnUiThread
                // Only extend the live countdown — do NOT call vm.addTime() here.
                // vm.addTime() calls api.addTime() which re-broadcasts cmd:add_time,
                // creating an infinite socket feedback loop that makes the timer
                // increase without stopping. TimerService syncs the new value to
                // the DB on its own every second.
                startService(Intent(this, TimerService::class.java).apply {
                    action = TimerService.ACTION_ADD_TIME
                    putExtra(TimerService.EXTRA_ADD_SECS, mins * 60)
                })
            }
        }
        SyncService.onLicenseStatusChange = { status ->
            runOnUiThread { applyLicenseOverlay() }
        }

        // Apply wallpaper behind both screens (portrait orientation only)
        WallpaperManager.applyToImageView(ivWallpaper, this, false)

        // Handle session passed via Intent (e.g. from LockScreenActivity on coin insert)
        handleSessionIntent(intent)

        // Observe session state changes
        lifecycleScope.launch {
            vm.sessionState.collect { state ->
                when (state) {
                    is SessionState.Idle -> {
                        showIdle()
                        startOrStopAlarm(sessionActive = false)
                        if (vm.prefs.isKioskModeEnabled) KioskManager.startLockTask(this@MainActivity)
                    }
                    is SessionState.Active -> {
                        showActive(state.session.timeRemainingSecs)
                        startOrStopAlarm(sessionActive = true)
                        // Keep nav locked. Pass allowed packages so Device Owner mode permits
                        // launching them via startActivity() without a SecurityException.
                        if (vm.prefs.isKioskModeEnabled)
                            KioskManager.startLockTask(this@MainActivity, vm.prefs.allowedPackages)
                    }
                    is SessionState.Paused -> {
                        showPaused(state.session.timeRemainingSecs)
                        startOrStopAlarm(sessionActive = true)
                        if (vm.prefs.isKioskModeEnabled)
                            KioskManager.startLockTask(this@MainActivity, vm.prefs.allowedPackages)
                    }
                    is SessionState.Expired -> {
                        onExpired()
                        startOrStopAlarm(sessionActive = false)
                        if (vm.prefs.isKioskModeEnabled) KioskManager.startLockTask(this@MainActivity)
                    }
                    is SessionState.Error -> Toast.makeText(this@MainActivity, state.message, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun startOrStopAlarm(sessionActive: Boolean) {
        try {
            val sessionOnly = vm.prefs.alarmOnlyDuringSession
            when {
                !sessionOnly  -> com.pisotab.app.util.AntiTheftManager.start(this) // always monitor
                sessionActive -> com.pisotab.app.util.AntiTheftManager.start(this) // session only + active
                else          -> com.pisotab.app.util.AntiTheftManager.stop(this)  // session only + no session
            }
        } catch (_: Exception) {}
    }

    private fun applyLicenseOverlay() {
        val expired = vm.prefs.licenseStatus == "trial_expired"
        screenLicenseExpired.visibility = if (expired) View.VISIBLE else View.GONE
    }

    private fun showIdle() {
        screenIdle.visibility   = View.VISIBLE
        screenActive.visibility = View.GONE
        applyLicenseOverlay()
        TimerService.isRunning = false
        // Only stop TimerService if the session was intentionally ended by the ViewModel
        // (prefs already cleared). If prefs is still set, this Idle emission is from the
        // initial _sessionState value firing before init/syncFromDb restores Active state.
        // Sending ACTION_END in that case would call TimerService.endSession() which
        // clears prefs.activeSessionId prematurely, making all subsequent syncFromDb()
        // calls see empty prefs and stay Idle — the "second reopen shows idle" bug.
        if (vm.prefs.activeSessionId.isEmpty()) {
            startService(Intent(this, TimerService::class.java).apply { action = TimerService.ACTION_END })
        }
    }

    private fun showActive(secs: Int) {
        screenIdle.visibility   = View.GONE
        screenActive.visibility = View.VISIBLE
        val isUsb = vm.prefs.connectionMode == "usb"
        val timerBelongsToCurrentSession =
            TimerService.isRunning &&
            (isUsb || TimerService.currentSecs > 0) &&
            TimerService.currentSessionId == vm.prefs.activeSessionId
        val displaySecs = if (timerBelongsToCurrentSession) TimerService.currentSecs else secs
        tvTimer.text  = formatTime(displaySecs)
        tvStatus.text = "Running"
        populateLauncher()
        if (timerBelongsToCurrentSession) {
            startService(Intent(this, TimerService::class.java).apply {
                action = TimerService.ACTION_RESUME
            })
        } else {
            startForegroundService(Intent(this, TimerService::class.java).apply {
                action = if (isUsb) TimerService.ACTION_START_USB else TimerService.ACTION_START
                putExtra(TimerService.EXTRA_SESSION_ID, vm.prefs.activeSessionId)
                putExtra(TimerService.EXTRA_DURATION_SECS, secs)
            })
        }
    }

    private fun showPaused(secs: Int) {
        screenIdle.visibility   = View.GONE
        screenActive.visibility = View.VISIBLE
        val displaySecs = if (TimerService.currentSecs > 0) TimerService.currentSecs else secs
        tvTimer.text  = formatTime(displaySecs)
        tvStatus.text = "PAUSED"
        startService(Intent(this, TimerService::class.java).apply {
            action = TimerService.ACTION_PAUSE
        })
    }

    private fun populateLauncher() {
        lifecycleScope.launch {
            val allowed = vm.prefs.allowedPackages
            val items = withContext(Dispatchers.IO) {
                val pm = packageManager
                val pkgs = if (allowed.isEmpty()) {
                    val intent = Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) }
                    pm.queryIntentActivities(intent, 0).map { it.activityInfo.packageName }.distinct()
                } else {
                    allowed.toList()
                }
                pkgs.filter { it != packageName }
                    .mapNotNull { pkg ->
                        try {
                            val info = pm.getApplicationInfo(pkg, 0)
                            LauncherAppItem(pkg, pm.getApplicationLabel(info).toString(), pm.getApplicationIcon(pkg))
                        } catch (_: Exception) { null }
                    }
                    .sortedBy { it.appName }
            }
            launcherAdapter.setItems(items)
        }
    }

    private fun onExpired() {
        startActivity(Intent(this, LockScreenActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        })
    }

    private fun formatTime(secs: Int): String {
        val h = secs / 3600
        val m = (secs % 3600) / 60
        val s = secs % 60
        return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
    }

    private fun showAdminPinDialog() {
        val input = EditText(this).apply { inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        AlertDialog.Builder(this)
            .setTitle("Admin PIN")
            .setView(input)
            .setPositiveButton("Unlock") { _, _ ->
                if (input.text.toString() == vm.prefs.adminPin) {
                    KioskManager.stopLockTask(this)
                    KioskManager.enableUsbDebugging(this)
                    KioskManager.enableSettings(this)
                    startActivity(Intent(this, AdminActivity::class.java))
                } else {
                    Toast.makeText(this, "Wrong PIN", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        WallpaperManager.applyToImageView(ivWallpaper, this, false)
        // Re-register callback in case LockScreenActivity overwrote it
        SyncService.onStartSession = { sessionId, mins, amount ->
            if (vm.prefs.licenseStatus != "trial_expired") {
                runOnUiThread { vm.startSession(mins, amount, serverSessionId = sessionId) }
            }
        }
        KioskManager.applyImmersiveMode(window)
        // Re-read DB state on every resume — if the timer expired while onTick was null
        // (MainActivity was backgrounded), the ViewModel state may still be Active even
        // though TimerService already wrote "ended" to the DB. syncFromDb() corrects this
        // before we decide whether to re-lock or re-evaluate the alarm.
        vm.syncFromDb()
        val sessionActive = vm.sessionState.value.let { it is SessionState.Active || it is SessionState.Paused }
        if (vm.prefs.isKioskModeEnabled) {
            val allowed = if (sessionActive) vm.prefs.allowedPackages else emptySet()
            KioskManager.startLockTask(this, allowed)
        }
        // Re-evaluate alarm state — prefs may have changed in SetupActivity while session state
        // didn't change, so the collector would not have re-fired on its own.
        startOrStopAlarm(sessionActive)
        // Restore alarm banner if the alarm triggered while the app was backgrounded.
        // onAlarmTriggered already fired once (updating the View while invisible); it will
        // not fire again. Check isAlarming() directly to re-apply the correct banner state.
        if (com.pisotab.app.util.AntiTheftManager.isAlarming()) {
            alarmBanner.visibility = android.view.View.VISIBLE
            tvAlarmReason.text = com.pisotab.app.util.AntiTheftManager.lastAlarmReason()
        } else {
            alarmBanner.visibility = android.view.View.GONE
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleSessionIntent(intent)
    }

    private fun handleSessionIntent(intent: Intent) {
        if (vm.prefs.licenseStatus == "trial_expired") return
        val usbSessionId = intent.getStringExtra("usb_session_id")
        if (!usbSessionId.isNullOrEmpty()) {
            vm.startUsbSession(usbSessionId)
            return
        }
        val sessionId = intent.getStringExtra("session_id") ?: return
        val mins = intent.getIntExtra("duration_mins", 0)
        val amount = intent.getDoubleExtra("amount_paid", 0.0)
        if (sessionId.isNotEmpty() && mins > 0) {
            vm.startSession(mins, amount, serverSessionId = sessionId)
        }
    }

    override fun onDestroy() {
        TimerService.onTick = null
        SyncService.onConnectionChange = null
        SyncService.onStartSession = null
        SyncService.onPauseSession = null
        SyncService.onResumeSession = null
        SyncService.onEndSession = null
        SyncService.onAddTime = null
        SyncService.onLicenseStatusChange = null
        // Do NOT stop AntiTheftManager here — monitoring must persist when the customer
        // presses Back during an active session and MainActivity is destroyed.
        // SyncService (always alive) manages the full shutdown when the session ends.
        super.onDestroy()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // Only intercept hardware keys when locked (no active session).
        // During a session, the customer can freely use Back/Home/Recents.
        val sessionActive = vm.sessionState.value.let { it is SessionState.Active || it is SessionState.Paused }
        if (vm.prefs.isKioskModeEnabled && !sessionActive && KioskManager.interceptKey(keyCode)) return true
        return super.onKeyDown(keyCode, event)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) KioskManager.applyImmersiveMode(window)
    }
}
