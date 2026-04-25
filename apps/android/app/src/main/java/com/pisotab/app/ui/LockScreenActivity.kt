package com.pisotab.app.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.EditText
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
        WallpaperManager.applyToImageView(ivWallpaper, this, false)

        val prefs = (application as PisoTabApp).prefs
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
        SyncService.onStartSession = { sessionId, mins, amount ->
            runOnUiThread {
                startActivity(Intent(this, MainActivity::class.java).apply {
                    putExtra("session_id", sessionId)
                    putExtra("duration_mins", mins)
                    putExtra("amount_paid", amount)
                })
            }
        }
    }

    override fun onResume() {
        super.onResume()
        WallpaperManager.applyToImageView(ivWallpaper, this, false)
        KioskManager.applyImmersiveMode(window)
    }

    private fun startDeepFreezeCountdown(totalSecs: Int) {
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
                    wipeAppData()
                    finish()
                } else {
                    handler.postDelayed(this, 1_000L)
                }
            }
        }
        handler.postDelayed(tick, 1_000L)
    }

    private fun wipeAppData() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return  // API 28 required
        val prefs = (application as PisoTabApp).prefs
        val dpm = getSystemService(DevicePolicyManager::class.java) ?: return
        val admin = ComponentName(this, DeviceAdminReceiver::class.java)
        // DevicePolicyManager.clearApplicationUserData() is the public API (not hidden) for
        // Device Owner / Profile Owner apps to wipe another app's data including accounts.
        // Requires the app to be set as Device Owner via:
        //   adb shell dpm set-device-owner com.pisotab.app/.receiver.DeviceAdminReceiver
        for (pkg in prefs.allowedPackages) {
            if (pkg == packageName) continue  // never wipe PisoTab itself
            try {
                dpm.clearApplicationUserData(admin, pkg, mainExecutor) { _, _ -> }
            } catch (_: Exception) {}
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

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
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
