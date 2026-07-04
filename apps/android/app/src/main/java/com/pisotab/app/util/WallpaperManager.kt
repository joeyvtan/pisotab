package com.pisotab.app.util

import android.net.Uri
import android.widget.ImageView
import com.pisotab.app.R

object WallpaperManager {

    const val PRESET_CUSTOM = 0
    const val PRESET_GALAXY = 1
    const val PRESET_CYBER  = 2
    const val PRESET_LAVA   = 3

    fun applyToImageView(imageView: ImageView, context: android.content.Context, isLandscape: Boolean) {
        val prefs = PrefsManager(context)
        val builtIn = when (prefs.wallpaperPreset) {
            PRESET_GALAXY -> R.drawable.wallpaper_galaxy
            PRESET_CYBER  -> R.drawable.wallpaper_cyber
            PRESET_LAVA   -> R.drawable.wallpaper_lava
            else          -> 0
        }
        if (builtIn != 0) {
            imageView.setImageResource(builtIn)
            imageView.visibility = android.view.View.VISIBLE
            return
        }
        // Custom: single wallpaper URI (portrait URI used for both orientations)
        val uriStr = prefs.portraitWallpaperUri
        if (uriStr.isNotEmpty()) {
            imageView.setImageURI(Uri.parse(uriStr))
            imageView.visibility = android.view.View.VISIBLE
        } else {
            imageView.visibility = android.view.View.GONE
        }
    }
}
