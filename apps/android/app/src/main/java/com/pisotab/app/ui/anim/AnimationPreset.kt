package com.pisotab.app.ui.anim

import android.content.Context
import android.view.View

object AnimationPreset {
    const val NONE  = 0
    const val COINS = 1
    const val PULSE = 2
    const val STARS = 3

    val names = arrayOf("None", "Coin Rain", "Pulse Rings", "Star Field")

    fun createView(context: Context, preset: Int): View? = when (preset) {
        COINS -> CoinRainView(context)
        PULSE -> PulseRingView(context)
        STARS -> StarFieldView(context)
        else  -> null
    }
}
