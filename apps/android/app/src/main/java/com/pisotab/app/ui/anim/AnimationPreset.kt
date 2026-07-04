package com.pisotab.app.ui.anim

import android.content.Context
import android.view.View

object AnimationPreset {
    const val NONE    = 0
    const val COINS   = 1
    const val PULSE   = 2
    const val STARS   = 3
    const val CIRCUIT = 4
    const val NEON    = 5

    val names = arrayOf("None", "Coin Rain", "Pulse Rings", "Star Field", "Circuit Board", "Neon Grid")

    fun createView(context: Context, preset: Int): View? = when (preset) {
        COINS   -> CoinRainView(context)
        PULSE   -> PulseRingView(context)
        STARS   -> StarFieldView(context)
        CIRCUIT -> CircuitBoardView(context)
        NEON    -> NeonGridView(context)
        else    -> null
    }
}
