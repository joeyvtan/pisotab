package com.pisotab.app.util

import android.content.Context
import android.net.Uri
import android.widget.ImageView
import com.pisotab.app.R

object WallpaperManager {

    const val PRESET_CUSTOM  = 0
    const val PRESET_GALAXY  = 1
    const val PRESET_CIRCUIT = 2
    const val PRESET_NEON    = 3

    val presetNames = arrayOf("Custom / Upload", "Galaxy", "Circuit Board", "Neon Grid")

    private fun presetDrawableRes(preset: Int): Int? = when (preset) {
        PRESET_GALAXY  -> R.drawable.wallpaper_galaxy
        PRESET_CIRCUIT -> R.drawable.wallpaper_circuit
        PRESET_NEON    -> R.drawable.wallpaper_neon
        else           -> null
    }

    fun getPortraitUri(context: Context): Uri? {
        val uri = PrefsManager(context).portraitWallpaperUri
        return if (uri.isNotEmpty()) Uri.parse(uri) else null
    }

    fun getLandscapeUri(context: Context): Uri? {
        val uri = PrefsManager(context).landscapeWallpaperUri
        return if (uri.isNotEmpty()) Uri.parse(uri) else null
    }

    fun applyToImageView(imageView: ImageView, context: Context, isLandscape: Boolean) {
        val prefs = PrefsManager(context)
        val drawableRes = presetDrawableRes(prefs.wallpaperPreset)
        if (drawableRes != null) {
            imageView.setImageResource(drawableRes)
            imageView.visibility = android.view.View.VISIBLE
            return
        }
        val uri = if (isLandscape) getLandscapeUri(context) else getPortraitUri(context)
        if (uri != null) {
            imageView.setImageURI(uri)
            imageView.visibility = android.view.View.VISIBLE
        } else {
            imageView.visibility = android.view.View.GONE
        }
    }
}
