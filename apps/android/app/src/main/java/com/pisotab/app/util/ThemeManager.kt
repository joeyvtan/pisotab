package com.pisotab.app.util

import android.app.Activity
import androidx.appcompat.app.AppCompatDelegate
import com.pisotab.app.R

object ThemeManager {
    const val THEME_ORANGE = 0
    const val THEME_BLUE   = 1
    const val THEME_GREEN  = 2

    /**
     * Call before setContentView() in every Activity.
     * Sets the night mode globally and applies the accent colour theme.
     */
    fun applyTheme(activity: Activity) {
        val prefs = PrefsManager(activity)

        // Switch the DayNight mode — this triggers values-night/ color overrides app-wide
        AppCompatDelegate.setDefaultNightMode(
            if (prefs.isDarkMode) AppCompatDelegate.MODE_NIGHT_YES
            else AppCompatDelegate.MODE_NIGHT_NO
        )

        when (prefs.themeId) {
            THEME_BLUE  -> activity.setTheme(R.style.Theme_PisoTab_Blue)
            THEME_GREEN -> activity.setTheme(R.style.Theme_PisoTab_Green)
            else        -> activity.setTheme(R.style.Theme_PisoTab)
        }
    }
}
