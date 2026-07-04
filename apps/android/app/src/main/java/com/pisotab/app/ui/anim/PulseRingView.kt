package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.math.*

class PulseRingView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private val RING_COUNT = 9
    private val CYCLE_MS   = 4000f

    // Vibrant gaming color stops — cyan → electric blue → indigo → purple → hot pink
    private val ringColors = intArrayOf(
        Color.parseColor("#00FFEE"),
        Color.parseColor("#00AAFF"),
        Color.parseColor("#4400FF"),
        Color.parseColor("#AA00FF"),
        Color.parseColor("#FF0088"),
    )

    private val paint     = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    override fun onDraw(canvas: Canvas) {
        val t     = AnimationUtils.currentAnimationTimeMillis()
        val phase = (t % CYCLE_MS.toLong()) / CYCLE_MS
        val cx    = width  / 2f
        val cy    = height / 2f
        val maxR  = hypot(cx, cy) * 1.1f

        // Expanding rings with gradient colour and perspective fade
        for (i in 0 until RING_COUNT) {
            val offset = (phase + i.toFloat() / RING_COUNT) % 1f
            val radius = offset * maxR
            val fade   = (1f - offset).pow(1.4f)

            val ci  = (offset * (ringColors.size - 1)).toInt().coerceIn(0, ringColors.size - 2)
            val cf  = (offset * (ringColors.size - 1)) - ci
            val col = lerpColor(ringColors[ci], ringColors[ci + 1], cf)

            // Wide translucent glow halo
            glowPaint.color       = col
            glowPaint.alpha       = (fade * 45).toInt()
            glowPaint.strokeWidth = 22f * fade + 4f
            canvas.drawCircle(cx, cy, radius, glowPaint)

            // Crisp ring
            paint.color       = col
            paint.alpha       = (fade * 230).toInt().coerceIn(0, 230)
            paint.strokeWidth = 1.8f + fade * 3f
            canvas.drawCircle(cx, cy, radius, paint)
        }

        // Counter-rotating inner arc segments — depth illusion
        val rot1 = (t / 2800f) * 360f
        for (seg in 0 until 3) {
            val r = RectF(cx - maxR * 0.17f, cy - maxR * 0.17f, cx + maxR * 0.17f, cy + maxR * 0.17f)
            paint.color = Color.parseColor("#00FFEE"); paint.alpha = 180; paint.strokeWidth = 3f
            canvas.drawArc(r, rot1 + seg * 120f, 55f, false, paint)
        }
        val rot2 = -(t / 3500f) * 360f
        for (seg in 0 until 4) {
            val r = RectF(cx - maxR * 0.09f, cy - maxR * 0.09f, cx + maxR * 0.09f, cy + maxR * 0.09f)
            paint.color = Color.parseColor("#FF0088"); paint.alpha = 210; paint.strokeWidth = 2f
            canvas.drawArc(r, rot2 + seg * 90f, 38f, false, paint)
        }

        // Pulsing core with layered glow
        val pulse = (sin(t / 480.0) * 0.5 + 0.5).toFloat()
        val coreR = 7f + pulse * 9f
        for (layer in 4 downTo 0) {
            fillPaint.color = Color.parseColor("#00FFEE")
            fillPaint.alpha = ((230 - layer * 38) * (0.4f + pulse * 0.6f)).toInt().coerceIn(0, 220)
            canvas.drawCircle(cx, cy, coreR + layer * 9f, fillPaint)
        }
        fillPaint.color = Color.WHITE; fillPaint.alpha = (180 + pulse * 75).toInt()
        canvas.drawCircle(cx, cy, coreR, fillPaint)

        postInvalidateOnAnimation()
    }

    private fun lerpColor(c1: Int, c2: Int, f: Float): Int = Color.rgb(
        (Color.red(c1)   + (Color.red(c2)   - Color.red(c1))   * f).toInt(),
        (Color.green(c1) + (Color.green(c2) - Color.green(c1)) * f).toInt(),
        (Color.blue(c1)  + (Color.blue(c2)  - Color.blue(c1))  * f).toInt()
    )

    override fun onAttachedToWindow() { super.onAttachedToWindow(); invalidate() }
}
