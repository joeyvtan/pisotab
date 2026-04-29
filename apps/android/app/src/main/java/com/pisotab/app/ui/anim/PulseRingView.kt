package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.math.hypot

class PulseRingView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private val RING_COUNT = 6
    private val CYCLE_MS = 3800f

    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2.5f
        color = Color.parseColor("#F97316")
    }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 8f
        color = Color.parseColor("#F97316")
    }
    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.parseColor("#FED7AA")
    }
    private val dotRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 2f
        color = Color.parseColor("#F97316")
        alpha = 200
    }

    override fun onDraw(canvas: Canvas) {
        val t = AnimationUtils.currentAnimationTimeMillis()
        val phase = (t % CYCLE_MS.toLong()) / CYCLE_MS

        val cx = width / 2f
        val cy = height / 2f
        val maxR = hypot(cx, cy) * 1.05f

        for (i in 0 until RING_COUNT) {
            val offset = (phase + i.toFloat() / RING_COUNT) % 1f
            val radius = offset * maxR
            // Quadratic fade: strong near center, zero at edge
            val fade = (1f - offset) * (1f - offset)
            val alpha = (fade * 210).toInt().coerceIn(0, 210)

            glowPaint.alpha = (fade * 55).toInt().coerceIn(0, 55)
            ringPaint.alpha = alpha

            canvas.drawCircle(cx, cy, radius, glowPaint)
            canvas.drawCircle(cx, cy, radius, ringPaint)
        }

        // Pulsing central dot — brightens at phase=0
        val dotPulse = (1f - phase).coerceAtLeast(0.4f)
        dotPaint.alpha = (dotPulse * 220).toInt()
        dotRingPaint.alpha = (dotPulse * 180).toInt()
        val dotRadius = 8f + dotPulse * 4f
        canvas.drawCircle(cx, cy, dotRadius, dotPaint)
        canvas.drawCircle(cx, cy, dotRadius + 4f, dotRingPaint)

        postInvalidateOnAnimation()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        invalidate()
    }
}
