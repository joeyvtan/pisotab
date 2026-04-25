package com.pisotab.app.util

import android.content.Context
import android.net.Uri
import android.widget.ImageView

object WallpaperManager {

    fun getPortraitUri(context: Context): Uri? {
        val uri = PrefsManager(context).portraitWallpaperUri
        return if (uri.isNotEmpty()) Uri.parse(uri) else null
    }

    fun getLandscapeUri(context: Context): Uri? {
        val uri = PrefsManager(context).landscapeWallpaperUri
        return if (uri.isNotEmpty()) Uri.parse(uri) else null
    }

    fun applyToImageView(imageView: ImageView, context: Context, isLandscape: Boolean) {
        val uri = if (isLandscape) getLandscapeUri(context) else getPortraitUri(context)
        if (uri != null) {
            imageView.setImageURI(uri)
            imageView.visibility = android.view.View.VISIBLE
        } else {
            imageView.visibility = android.view.View.GONE
        }
    }
}
