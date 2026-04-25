package com.pisotab.app.util

import android.app.Activity
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.UserManager
import android.provider.Settings
import android.view.KeyEvent
import android.view.View
import com.pisotab.app.receiver.DeviceAdminReceiver

/**
 * Kiosk lockdown helper.
 *
 * Uses lock task mode (Android 5+) to prevent users from leaving the app.
 * When the app is set as Device Owner, it can lock without a PIN prompt.
 * Without Device Owner, the user sees a standard "pinned app" UI.
 */
object KioskManager {

    /**
     * Enter lock task / screen pinning mode.
     * allowedPackages: whitelisted app packages to include in the Device Owner lock task list
     * so those apps can be launched from within the locked task without a SecurityException.
     * On non-Device-Owner devices this is a no-op and screen pinning allows any startActivity.
     */
    fun startLockTask(activity: Activity, allowedPackages: Set<String> = emptySet()) {
        try {
            val packages = (setOf(activity.packageName) + allowedPackages).toTypedArray()
            setLockTaskPackages(activity, *packages)
            activity.startLockTask()
        } catch (_: Exception) {}
    }

    fun stopLockTask(activity: Activity) {
        try {
            activity.stopLockTask()
        } catch (_: Exception) {}
    }

    fun isInLockTaskMode(context: Context): Boolean {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        return am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
    }

    /**
     * Hides the status and navigation bars for a true fullscreen kiosk experience.
     */
    fun applyImmersiveMode(window: android.view.Window) {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )
    }

    /**
     * If Device Owner, enable lock task whitelist.
     */
    fun setLockTaskPackages(context: Context, vararg packageNames: String) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComp = ComponentName(context, DeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            dpm.setLockTaskPackages(adminComp, packageNames)
        }
    }

    /**
     * Disable the system Settings app and block key configuration changes while kiosk is active.
     * Prevents customers from changing WiFi, enabling hotspot, or factory resetting the device.
     *
     * Two layers of protection:
     *   1. setPackagesSuspended — suspends the Settings app OS-wide so it cannot be launched
     *      from anywhere (home screen, recent apps, Quick Settings deep-links, etc.)
     *   2. User restrictions — block specific OS-level actions even through Quick Settings tiles
     *      or other entry points that bypass the Settings app itself.
     *
     * Only effective when the app is Device Owner.
     * Reversed by enableSettings() when admin enters the PIN.
     */
    fun disableSettings(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComp = ComponentName(context, DeviceAdminReceiver::class.java)
        if (!dpm.isDeviceOwnerApp(context.packageName)) return

        // Suspend the Settings app — resolved at runtime to handle manufacturer variants
        // (e.g. com.android.settings on AOSP, com.samsung.android.settings on Samsung, etc.)
        try {
            val settingsPkg = resolveSettingsPackage(context)
            dpm.setPackagesSuspended(adminComp, arrayOf(settingsPkg), true)
        } catch (_: Exception) {}

        // Belt-and-suspenders: user restrictions block these even via Quick Settings tiles
        dpm.addUserRestriction(adminComp, UserManager.DISALLOW_CONFIG_WIFI)
        dpm.addUserRestriction(adminComp, UserManager.DISALLOW_CONFIG_TETHERING)
        dpm.addUserRestriction(adminComp, UserManager.DISALLOW_FACTORY_RESET)
        // Prevent booting into safe mode, which would bypass kiosk enforcement
        dpm.addUserRestriction(adminComp, UserManager.DISALLOW_SAFE_BOOT)
    }

    fun enableSettings(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComp = ComponentName(context, DeviceAdminReceiver::class.java)
        if (!dpm.isDeviceOwnerApp(context.packageName)) return

        try {
            val settingsPkg = resolveSettingsPackage(context)
            dpm.setPackagesSuspended(adminComp, arrayOf(settingsPkg), false)
        } catch (_: Exception) {}

        dpm.clearUserRestriction(adminComp, UserManager.DISALLOW_CONFIG_WIFI)
        dpm.clearUserRestriction(adminComp, UserManager.DISALLOW_CONFIG_TETHERING)
        dpm.clearUserRestriction(adminComp, UserManager.DISALLOW_FACTORY_RESET)
        dpm.clearUserRestriction(adminComp, UserManager.DISALLOW_SAFE_BOOT)
    }

    /**
     * Resolve the Settings app package name at runtime.
     * Manufacturer ROMs (Samsung, Xiaomi, Realme, etc.) may ship their own Settings APK
     * under a different package name. Using the intent avoids hardcoding.
     */
    private fun resolveSettingsPackage(context: Context): String {
        val intent = Intent(Settings.ACTION_SETTINGS)
        val info = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        return info?.activityInfo?.packageName ?: "com.android.settings"
    }

    fun disableUsbDebugging(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComp = ComponentName(context, DeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            dpm.addUserRestriction(adminComp, android.os.UserManager.DISALLOW_DEBUGGING_FEATURES)
            dpm.addUserRestriction(adminComp, android.os.UserManager.DISALLOW_USB_FILE_TRANSFER)
            try { dpm.setGlobalSetting(adminComp, "adb_enabled", "0") } catch (_: Exception) {}
        }
    }

    fun enableUsbDebugging(context: Context) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComp = ComponentName(context, DeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(context.packageName)) {
            dpm.clearUserRestriction(adminComp, android.os.UserManager.DISALLOW_DEBUGGING_FEATURES)
            dpm.clearUserRestriction(adminComp, android.os.UserManager.DISALLOW_USB_FILE_TRANSFER)
            try { dpm.setGlobalSetting(adminComp, "adb_enabled", "1") } catch (_: Exception) {}
        }
    }

    /**
     * Intercept hardware back/home buttons when in kiosk mode.
     * Return true if the key was consumed.
     */
    fun interceptKey(keyCode: Int): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_APP_SWITCH,
            KeyEvent.KEYCODE_BACK -> true
            else -> false
        }
    }
}
