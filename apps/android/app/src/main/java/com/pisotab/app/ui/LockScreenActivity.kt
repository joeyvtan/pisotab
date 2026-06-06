package com.pisotab.app.ui

import android.accounts.AccountManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.Surface
import android.view.TextureView
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
    private lateinit var tvLockVideo: TextureView
    private var mediaPlayer: MediaPlayer? = null
    // true while the TextureView video is active — prevents onResume from restoring wallpaper
    private var videoActive = false

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
        tvLockVideo = findViewById(R.id.tv_lock_video)

        val prefs = (application as PisoTabApp).prefs
        val videoUri = prefs.lockScreenVideoUri

        // Video only plays on the Insert Coin screen, NOT during Deep Freeze countdown.
        // Deep Freeze needs a clean, static UI so the countdown numbers are clearly visible.
        if (videoUri.isNotEmpty() && !prefs.deepFreezeEnabled) {
            val delaySecs = prefs.lockScreenVideoDelaySecs
            val withSound = prefs.lockScreenVideoSound
            if (delaySecs > 0) {
                // Show wallpaper + animation for the configured delay, then switch to video
                WallpaperManager.applyToImageView(ivWallpaper, this, false)
                showAnimationLayer(flAnimLock, prefs.animationPreset)
                handler.postDelayed({ startLockVideo(videoUri, withSound) }, delaySecs * 1000L)
            } else {
                startLockVideo(videoUri, withSound)
            }
        } else {
            WallpaperManager.applyToImageView(ivWallpaper, this, false)
            showAnimationLayer(flAnimLock, prefs.animationPreset)
        }

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
        SyncService.onStartSession = { sessionId, durationSecs, amount ->
            runOnUiThread {
                startActivity(Intent(this, MainActivity::class.java).apply {
                    putExtra("session_id", sessionId)
                    putExtra("duration_mins", durationSecs / 60)
                    putExtra("duration_secs", durationSecs)
                    putExtra("amount_paid", amount)
                })
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Skip wallpaper refresh while the lock screen video is active to avoid
        // un-hiding ivWallpaper and adding unnecessary image loads on every resume.
        if (!videoActive) WallpaperManager.applyToImageView(ivWallpaper, this, false)
        KioskManager.applyImmersiveMode(window)
    }

    // Activates the TextureView + MediaPlayer for the lock screen video.
    // Called either immediately (delay=0) or via a handler.postDelayed when delay>0.
    private fun startLockVideo(videoUri: String, withSound: Boolean) {
        if (isFinishing) return
        videoActive = true
        ivWallpaper.visibility = View.GONE
        flAnimLock.visibility  = View.GONE

        // The listener MUST be set before visibility changes to VISIBLE.
        // Reason: when the window is already rendering (common for the delay>0 path, where
        // the window has been drawing the animation for several seconds), the SurfaceTexture
        // can be allocated in the same render pass that processes the GONE→VISIBLE change.
        // If the listener is set after setVisibility, that allocation fires onSurfaceTextureAvailable
        // with no listener attached — it will NEVER fire again for this listener instance.
        val stListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(st: SurfaceTexture, w: Int, h: Int) {
                attachMediaPlayer(st, videoUri, withSound)
            }
            override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, w: Int, h: Int) {}
            override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
                mediaPlayer?.release()
                mediaPlayer = null
                return true
            }
            override fun onSurfaceTextureUpdated(st: SurfaceTexture) {}
        }
        tvLockVideo.surfaceTextureListener = stListener
        tvLockVideo.visibility = View.VISIBLE

        // Safety: if the SurfaceTexture was already available when the listener was set
        // (e.g., the view was briefly VISIBLE earlier, or the render thread was very fast),
        // onSurfaceTextureAvailable will NOT be called automatically — invoke it manually.
        if (tvLockVideo.isAvailable) {
            attachMediaPlayer(tvLockVideo.surfaceTexture!!, videoUri, withSound)
        }
    }

    private fun attachMediaPlayer(st: SurfaceTexture, videoUri: String, withSound: Boolean) {
        try {
            mediaPlayer = MediaPlayer().apply {
                // setDataSource(context, uri) is the most robust path — it handles both
                // seekable and non-seekable content providers via internal fallback logic,
                // covering Downloads, OEM file managers, and Google Drive equally.
                setDataSource(this@LockScreenActivity, android.net.Uri.parse(videoUri))
                setSurface(Surface(st))
                isLooping = true
                val vol = if (withSound) 1f else 0f
                setVolume(vol, vol)
                setOnErrorListener { _, what, extra ->
                    android.util.Log.e("LockVideo", "MediaPlayer error what=$what extra=$extra")
                    runOnUiThread { fallbackToStaticBackground() }
                    true
                }
                setOnPreparedListener { start() }
                prepareAsync()
            }
        } catch (e: Exception) {
            android.util.Log.e("LockVideo", "MediaPlayer setup failed: ${e.message}")
            runOnUiThread { fallbackToStaticBackground() }
        }
    }

    private fun fallbackToStaticBackground() {
        videoActive = false
        tvLockVideo.visibility = View.GONE
        val prefs = (application as PisoTabApp).prefs
        WallpaperManager.applyToImageView(ivWallpaper, this, false)
        showAnimationLayer(flAnimLock, prefs.animationPreset)
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
                    // finish() is called inside wipeAppData() after all async clears complete.
                    wipeAppData()
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
        mediaPlayer?.release()
        mediaPlayer = null
        SyncService.onStartSession = null
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
