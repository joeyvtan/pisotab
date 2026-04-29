package com.pisotab.app.util

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

class PrefsManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("pisotab_prefs", Context.MODE_PRIVATE)

    // ── Backend auth ──────────────────────────────────────────────────────────

    /** JWT token returned by POST /api/auth/login — included in every admin API call */
    var backendToken: String
        get() = prefs.getString("backend_token", "") ?: ""
        set(v) = prefs.edit { putString("backend_token", v) }

    /** Backend username used to obtain the JWT (default matches seeded admin) */
    var backendUsername: String
        get() = prefs.getString("backend_username", "admin") ?: "admin"
        set(v) = prefs.edit { putString("backend_username", v) }

    /** Backend password used to obtain the JWT (default matches seeded admin) */
    var backendPassword: String
        get() = prefs.getString("backend_password", "admin123") ?: "admin123"
        set(v) = prefs.edit { putString("backend_password", v) }

    // ── Connection ────────────────────────────────────────────────────────────

    var serverUrl: String
        get() = prefs.getString("server_url", "https://api.jjtpisotab.com") ?: "https://api.jjtpisotab.com"
        set(v) = prefs.edit { putString("server_url", v) }

    var deviceId: String
        get() = prefs.getString("device_id", "") ?: ""
        set(v) = prefs.edit { putString("device_id", v) }

    var deviceName: String
        get() = prefs.getString("device_name", "Phone 01") ?: "Phone 01"
        set(v) = prefs.edit { putString("device_name", v) }

    var activeSessionId: String
        get() = prefs.getString("active_session_id", "") ?: ""
        set(v) = prefs.edit { putString("active_session_id", v) }

    val isConfigured: Boolean
        get() = deviceId.isNotEmpty() && serverUrl.isNotEmpty()

    // ── Security ──────────────────────────────────────────────────────────────

    var adminPin: String
        get() = prefs.getString("admin_pin", "1234") ?: "1234"
        set(v) = prefs.edit { putString("admin_pin", v) }

    var isKioskModeEnabled: Boolean
        get() = prefs.getBoolean("kiosk_mode", false)
        set(v) = prefs.edit { putBoolean("kiosk_mode", v) }

    // ── Coin / Timer config ───────────────────────────────────────────────────

    /** Connection mode: "esp32" (MQTT), "usb", or "manual" */
    var connectionMode: String
        get() = prefs.getString("connection_mode", "esp32") ?: "esp32"
        set(v) = prefs.edit { putString("connection_mode", v) }

    /** Philippine Peso per minute rate used when computing session duration */
    var timerRatePerMinute: Float
        get() = prefs.getFloat("timer_rate_per_min", 1.0f)
        set(v) = prefs.edit { putFloat("timer_rate_per_min", v) }

    /** Seconds of rental time credited per coin pulse */
    var timerSecondsPerCoin: Int
        get() = prefs.getInt("timer_secs_per_coin", 300)
        set(v) = prefs.edit { putInt("timer_secs_per_coin", v) }

    /** JSON array of coin→minute rates, e.g. [{"coin":1.0,"minutes":5}] */
    var coinRates: String
        get() = prefs.getString("coin_rates", "[]") ?: "[]"
        set(v) = prefs.edit { putString("coin_rates", v) }

    // ── Anti-theft ────────────────────────────────────────────────────────────

    var alarmOnWifiDisconnect: Boolean
        get() = prefs.getBoolean("alarm_wifi", false)
        set(v) = prefs.edit { putBoolean("alarm_wifi", v) }

    var alarmOnChargerDisconnect: Boolean
        get() = prefs.getBoolean("alarm_charger", false)
        set(v) = prefs.edit { putBoolean("alarm_charger", v) }

    var alarmOnlyDuringSession: Boolean
        get() = prefs.getBoolean("alarm_session_only", true)
        set(v) = prefs.edit { putBoolean("alarm_session_only", v) }

    var alarmDelaySeconds: Int
        get() = prefs.getInt("alarm_delay_secs", 30)
        set(v) = prefs.edit { putInt("alarm_delay_secs", v) }

    var alarmSoundType: Int
        get() = prefs.getInt("alarm_sound_type", android.media.RingtoneManager.TYPE_ALARM)
        set(v) = prefs.edit { putInt("alarm_sound_type", v) }

    var alarmSoundUri: String
        get() = prefs.getString("alarm_sound_uri", "") ?: ""
        set(v) = prefs.edit { putString("alarm_sound_uri", v) }

    // ── Floating timer overlay ─────────────────────────────────────────────────

    var floatingTimerEnabled: Boolean
        get() = prefs.getBoolean("floating_timer", false)
        set(v) = prefs.edit { putBoolean("floating_timer", v) }

    // ── Appearance ────────────────────────────────────────────────────────────

    /** Business name shown in sidebar header and lock screen */
    var businessName: String
        get() = prefs.getString("business_name", "JJT PisoTab") ?: "JJT PisoTab"
        set(v) = prefs.edit { putString("business_name", v) }

    /** Dark mode enabled — true = dark (default), false = light */
    var isDarkMode: Boolean
        get() = prefs.getBoolean("dark_mode", true)
        set(v) = prefs.edit { putBoolean("dark_mode", v) }

    /** 0 = Orange (default), 1 = Blue, 2 = Green */
    var themeId: Int
        get() = prefs.getInt("theme_id", 0)
        set(v) = prefs.edit { putInt("theme_id", v) }

    /** Hex accent color override, empty = use theme default */
    var accentColor: String
        get() = prefs.getString("accent_color", "") ?: ""
        set(v) = prefs.edit { putString("accent_color", v) }

    /** URI to portrait wallpaper image stored in app private storage */
    var portraitWallpaperUri: String
        get() = prefs.getString("portrait_wallpaper_uri", "") ?: ""
        set(v) = prefs.edit { putString("portrait_wallpaper_uri", v) }

    /** URI to landscape wallpaper image stored in app private storage */
    var landscapeWallpaperUri: String
        get() = prefs.getString("landscape_wallpaper_uri", "") ?: ""
        set(v) = prefs.edit { putString("landscape_wallpaper_uri", v) }

    /** URI to audio file played when lock screen opens */
    var lockScreenAudioUri: String
        get() = prefs.getString("lock_screen_audio_uri", "") ?: ""
        set(v) = prefs.edit { putString("lock_screen_audio_uri", v) }

    /** Animated background preset for idle + lock screens: 0=None, 1=CoinRain, 2=Pulse, 3=Stars */
    var animationPreset: Int
        get() = prefs.getInt("animation_preset", 0)
        set(v) = prefs.edit { putInt("animation_preset", v) }

    /** Built-in wallpaper preset: 0=Custom (use URI), 1=Galaxy, 2=Circuit, 3=Neon Grid */
    var wallpaperPreset: Int
        get() = prefs.getInt("wallpaper_preset", 0)
        set(v) = prefs.edit { putInt("wallpaper_preset", v) }

    // ── Allowed Apps whitelist ────────────────────────────────────────────────

    /** Package names that remain accessible during an active session */
    var allowedPackages: Set<String>
        get() = prefs.getStringSet("allowed_packages", emptySet()) ?: emptySet()
        set(v) = prefs.edit { putStringSet("allowed_packages", v) }

    // ── License ───────────────────────────────────────────────────────────────

    /** License key entered by admin and activated against the backend */
    var licenseKey: String
        get() = prefs.getString("license_key", "") ?: ""
        set(v) = prefs.edit { putString("license_key", v) }

    /** Last known license status cached from API: "active" | "trial" | "trial_expired" | "" */
    var licenseStatus: String
        get() = prefs.getString("license_status", "") ?: ""
        set(v) = prefs.edit { putString("license_status", v) }

    // ── Deep Freeze ───────────────────────────────────────────────────────────

    /** Wipe app data for non-whitelisted apps after session ends */
    var deepFreezeEnabled: Boolean
        get() = prefs.getBoolean("deep_freeze", false)
        set(v) = prefs.edit { putBoolean("deep_freeze", v) }

    /** Seconds to wait (with countdown on screen) before wiping */
    var deepFreezeGracePeriodSecs: Int
        get() = prefs.getInt("deep_freeze_grace", 30)
        set(v) = prefs.edit { putInt("deep_freeze_grace", v) }
}
