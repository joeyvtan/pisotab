package com.pisotab.app.ui

import android.accounts.AccountManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import com.pisotab.app.receiver.DeviceAdminReceiver
import com.pisotab.app.service.SyncService
import com.pisotab.app.util.KioskManager
import com.pisotab.app.util.ThemeManager
import com.pisotab.app.util.WallpaperManager

class LockScreenActivity : AppCompatActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val autoDismiss = Runnable { finish() }
    private lateinit var ivWallpaper: ImageView
    private lateinit var flAnimLock: FrameLayout
    // Kept so onDestroy() can check via referential equality whether SyncService still holds
    // our lambda. MainActivity.onResume() runs before our onDestroy() (Android interleaved
    // lifecycle), so if it has already registered its own callback we must NOT null it —
    // that was what silently dropped every subsequent coin insertion after the first session.
    private var myStartSessionCallback: ((String, Int, Double) -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        ThemeManager.applyTheme(this)
        super.onCreate(savedInstanceState)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
        setContentView(R.layout.activity_lock_screen)
        KioskManager.applyImmersiveMode(window)

        ivWallpaper = findViewById(R.id.iv_wallpaper_lock)
        flAnimLock  = findViewById(R.id.fl_animation_lock)

        val prefs = (application as PisoTabApp).prefs
        WallpaperManager.applyToImageView(ivWallpaper, this, false)
        showAnimationLayer(flAnimLock, prefs.animationPreset)

        if (prefs.deepFreezeEnabled) {
            // Replace default 30s dismiss with a visible countdown that wipes app data at 0
            startDeepFreezeCountdown(prefs.deepFreezeGracePeriodSecs)
        } else {
            // Default: auto-dismiss to idle screen after 30 seconds
            handler.postDelayed(autoDismiss, 30_000L)
        }

        // Hidden admin long-press button
        findViewById<View>(R.id.btn_admin_lock).setOnLongClickListener {
            showAdminPinDialog()
            true
        }

        // When a new session starts (coin or dashboard), forward to MainActivity.
        // MainActivity is singleTask — starting it automatically clears LockScreenActivity
        // from above it in the task and calls onNewIntent() with the session extras.
        // Do NOT call finish() or use FLAG_ACTIVITY_CLEAR_TOP: singleTask handles this, and
        // calling finish() on an activity already cleared by singleTask causes the OS to
        // interpret the double-removal as a full task close on some Android versions.
        myStartSessionCallback = { sessionId, durationSecs, amount ->
            runOnUiThread {
                startActivity(Intent(this, MainActivity::class.java).apply {
                    putExtra("session_id", sessionId)
                    putExtra("duration_mins", durationSecs / 60)
                    putExtra("duration_secs", durationSecs)
                    putExtra("amount_paid", amount)
                })
            }
        }
        SyncService.onStartSession = myStartSessionCallback
    }

    override fun onResume() {
        super.onResume()
        WallpaperManager.applyToImageView(ivWallpaper, this, false)
        KioskManager.applyImmersiveMode(window)
    }

    private fun startDeepFreezeCountdown(totalSecs: Int) {
        // skip_wipe=true when the session expired while a game was in the foreground.
        // The countdown still shows (session is over), but app data is not wiped so
        // in-progress game state is preserved. Wipe only when device was on lock/idle screen.
        val skipWipe = intent.getBooleanExtra("skip_wipe", false)

        val tvLabel     = findViewById<TextView>(R.id.tv_deep_freeze_label)
        val tvCountdown = findViewById<TextView>(R.id.tv_deep_freeze_countdown)
        tvLabel.visibility     = View.VISIBLE
        tvCountdown.visibility = View.VISIBLE

        var secsLeft = totalSecs
        tvCountdown.text = secsLeft.toString()

        val tick = object : Runnable {
            override fun run() {
                if (isFinishing) return
                secsLeft--
                tvCountdown.text = secsLeft.toString()
                if (secsLeft <= 0) {
                    if (skipWipe) {
                        // Game was active — skip wipe, just return to idle
                        finish()
                    } else {
                        // Device was idle/on lock screen — wipe app data as configured.
                        // finish() is called inside wipeAppData() after all async clears complete.
                        wipeAppData()
                    }
                } else {
                    handler.postDelayed(this, 1_000L)
                }
            }
        }
        handler.postDelayed(tick, 1_000L)
    }

    private fun wipeAppData() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            android.util.Log.w("DeepFreeze", "clearApplicationUserData requires Android 9+ (API 28)")
            finish()
            return
        }
        val dpm = getSystemService(DevicePolicyManager::class.java) ?: run { finish(); return }
        if (!dpm.isDeviceOwnerApp(packageName)) {
            android.util.Log.e("DeepFreeze", "Deep freeze requires Device Owner. Run:\n" +
                "  adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver")
            android.widget.Toast.makeText(
                this,
                "Deep Freeze requires Device Owner setup.\nSee admin settings for instructions.",
                android.widget.Toast.LENGTH_LONG
            ).show()
            finish()
            return
        }
        val prefs = (application as PisoTabApp).prefs
        val admin = ComponentName(this, DeviceAdminReceiver::class.java)

        // Build the list of packages to wipe.
        // If allowedPackages is configured, wipe exactly those.
        // Otherwise fall back to ALL non-system user-installed apps.
        // getInstalledApplications() is used (not queryIntentActivities) because on Android 11+
        // queryIntentActivities() may return an incomplete list when <queries> coverage is partial.
        val pkgsToWipe: Set<String> = if (prefs.allowedPackages.isNotEmpty()) {
            prefs.allowedPackages
        } else {
            packageManager.getInstalledApplications(0)
                .filter { it.flags and ApplicationInfo.FLAG_SYSTEM == 0 }
                .map { it.packageName }
                .toSet()
        }

        val targets = pkgsToWipe.filter { it != packageName }
        if (targets.isEmpty()) {
            android.util.Log.w("DeepFreeze", "No packages to wipe — finishing immediately")
            finish()
            return
        }

        // Step 1: Remove AccountManager accounts for all target packages.
        // Apps like Facebook that offer Sign-in with Google store auth tokens in the system
        // AccountManager (not in app data). clearApplicationUserData() does not touch these,
        // so GMS can silently re-authenticate the app on next launch. Removing the accounts
        // first severs this auth link before the data wipe.
        removeAccountsForPackages(targets)

        // Step 2: clearApplicationUserData() is async.
        // finish() must NOT be called until ALL callbacks complete — calling it early lets the
        // user open Facebook in the gap before data is actually cleared.
        // pendingWipes counts outstanding callbacks; finish() fires when it hits 0.
        // Safety timeout (12s) ensures finish() fires even if some callbacks never arrive.
        var pendingWipes = targets.size
        handler.postDelayed({
            if (!isFinishing) {
                android.util.Log.w("DeepFreeze", "Safety timeout reached — finishing")
                finish()
            }
        }, 12_000L)

        for (pkg in targets) {
            try {
                dpm.clearApplicationUserData(admin, pkg, mainExecutor) { clearedPkg, succeeded ->
                    if (!succeeded) android.util.Log.w("DeepFreeze", "Failed to wipe: $clearedPkg")
                    else android.util.Log.i("DeepFreeze", "Wiped: $clearedPkg")
                    pendingWipes--
                    if (pendingWipes <= 0 && !isFinishing) finish()
                }
            } catch (e: Exception) {
                android.util.Log.e("DeepFreeze", "Exception wiping $pkg: ${e.message}")
                pendingWipes--
                if (pendingWipes <= 0 && !isFinishing) finish()
            }
        }
    }

    private fun removeAccountsForPackages(packages: List<String>) {
        try {
            val am = AccountManager.get(this)
            val allAccounts = am.accounts
            for (account in allAccounts) {
                // Resolve which package "owns" this account type by looking up the authenticator
                val authenticatorPkg = am.authenticatorTypes
                    .firstOrNull { it.type == account.type }
                    ?.packageName ?: continue
                if (authenticatorPkg in packages) {
                    try {
                        @Suppress("DEPRECATION")
                        am.removeAccount(account, null, null)
                        android.util.Log.i("DeepFreeze", "Removed account ${account.name} (${account.type})")
                    } catch (e: Exception) {
                        android.util.Log.w("DeepFreeze", "Failed to remove account ${account.name}: ${e.message}")
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("DeepFreeze", "AccountManager cleanup failed: ${e.message}")
        }
    }

    private fun showAdminPinDialog() {
        val prefs = (application as PisoTabApp).prefs
        val input = EditText(this).apply { inputType = android.text.InputType.TYPE_CLASS_NUMBER }
        AlertDialog.Builder(this)
            .setTitle("Admin PIN")
            .setView(input)
            .setPositiveButton("Unlock") { _, _ ->
                if (input.text.toString() == prefs.adminPin) {
                    KioskManager.stopLockTask(this)
                    KioskManager.enableUsbDebugging(this)
                    startActivity(Intent(this, SetupActivity::class.java))
                    finish()
                } else {
                    android.widget.Toast.makeText(this, "Wrong PIN", android.widget.Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showAnimationLayer(fl: FrameLayout, preset: Int) {
        val animView = com.pisotab.app.ui.anim.AnimationPreset.createView(this, preset)
        if (animView != null) {
            fl.addView(animView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        } else {
            fl.visibility = View.GONE
        }
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        // Only null if we are still the registered handler. Android's interleaved lifecycle
        // runs MainActivity.onResume() BEFORE our onDestroy() when we auto-dismiss or are
        // cleared by singleTask. If MainActivity has already re-registered its own lambda,
        // clobbering it here would silently drop every subsequent coin insertion.
        if (SyncService.onStartSession === myStartSessionCallback) {
            SyncService.onStartSession = null
        }
        myStartSessionCallback = null
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) KioskManager.applyImmersiveMode(window)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?) = true

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() { /* blocked */ }
}
