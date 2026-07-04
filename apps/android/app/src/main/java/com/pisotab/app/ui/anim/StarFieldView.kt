package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.math.*
import kotlin.random.Random

/** Warp-speed starfield — stars accelerate outward from center like flying through hyperspace. */
class StarFieldView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private data class Star(
        val angle: Double,
        var radius: Float,
        val speed: Float,   // base px/sec at edge
        val color: Int,
        val size: Float
    )

    private val stars  = ArrayList<Star>(200)
    private val paint  = Paint(Paint.ANTI_ALIAS_FLAG)
    private var cx     = 0f; private var cy = 0f; private var maxR = 0f
    private var lastMs = 0L

    private val starColors = intArrayOf(
        Color.WHITE,
        Color.parseColor("#CCE8FF"),
        Color.parseColor("#AABBFF"),
        Color.parseColor("#FFEECC"),
        Color.parseColor("#00FFEE"),
        Color.parseColor("#FF88CC"),
    )

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        cx = w / 2f; cy = h / 2f
        maxR = hypot(cx, cy) * 1.05f
        stars.clear()
        // Seed with randomised starting radii so it looks alive immediately
        repeat(200) { stars.add(newStar(spreadRadius = true)) }
    }

    private fun newStar(spreadRadius: Boolean = false): Star {
        val r = if (spreadRadius) Random.nextFloat() * maxR else Random.nextFloat() * maxR * 0.08f
        return Star(
            angle  = Random.nextDouble() * Math.PI * 2,
            radius = r,
            speed  = Random.nextFloat() * 200f + 80f,
            color  = starColors[Random.nextInt(starColors.size)],
            size   = Random.nextFloat() * 1.6f + 0.5f
        )
    }

    override fun onDraw(canvas: Canvas) {
        val now = AnimationUtils.currentAnimationTimeMillis()
        val dt  = if (lastMs == 0L) 0.016f else ((now - lastMs) / 1000f).coerceAtMost(0.05f)
        lastMs  = now

        for (i in stars.indices) {
            val s   = stars[i]
            val frac = (s.radius / maxR).coerceIn(0f, 1f)

            // Warp acceleration: exponential speed-up as star moves outward
            val accel     = s.speed * (frac * frac * 4f + 0.04f)
            val newRadius = s.radius + accel * dt

            val oldX = cx + cos(s.angle).toFloat() * s.radius
            val oldY = cy + sin(s.angle).toFloat() * s.radius
            val newX = cx + cos(s.angle).toFloat() * newRadius.coerceAtMost(maxR)
            val newY = cy + sin(s.angle).toFloat() * newRadius.coerceAtMost(maxR)

            val alpha  = (frac * 210 + 40).toInt().coerceIn(0, 255)
            val stroke = s.size * (0.4f + frac * 2.5f)

            paint.color       = s.color
            paint.alpha       = alpha
            paint.strokeWidth = stroke
            paint.strokeCap   = Paint.Cap.ROUND
            canvas.drawLine(oldX, oldY, newX, newY, paint)

            stars[i] = if (newRadius >= maxR) newStar() else s.copy(radius = newRadius)
        }

        postInvalidateOnAnimation()
    }

    override fun onAttachedToWindow() { super.onAttachedToWindow(); lastMs = 0L; invalidate() }
}
