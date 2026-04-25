package com.pisotab.app.util

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log

object AppWhitelistManager {

    private const val TAG = "AppWhitelistManager"

    /**
     * Suspend all installed packages that are NOT in the whitelist.
     * Requires Device Owner. Safe to call on non-Device-Owner (silently skipped).
     *
     * Call on session start (enable=true) to hide non-whitelisted apps.
     * Call on session end (enable=false) to restore all apps.
     */
    fun enforce(context: Context, enable: Boolean) {
        val dpm = context.getSystemService(DevicePolicyManager::class.java) ?: return
        val adminComp = ComponentName(context, com.pisotab.app.receiver.DeviceAdminReceiver::class.java)

        if (!dpm.isDeviceOwnerApp(context.packageName)) {
            Log.d(TAG, "Not Device Owner — whitelist enforcement skipped")
            return
        }

        val prefs = PrefsManager(context)
        val selfPkg = context.packageName
        val allowed = prefs.allowedPackages + setOf(selfPkg)

        val allPackages = context.packageManager
            .getInstalledPackages(0)
            .map { it.packageName }

        if (enable) {
            val toSuspend = allPackages.filter { it !in allowed }.toTypedArray()
            if (toSuspend.isNotEmpty()) {
                dpm.setPackagesSuspended(adminComp, toSuspend, true)
                Log.d(TAG, "Suspended ${toSuspend.size} packages")
            }
        } else {
            dpm.setPackagesSuspended(adminComp, allPackages.toTypedArray(), false)
            Log.d(TAG, "Unsuspended all packages")
        }
    }
}
