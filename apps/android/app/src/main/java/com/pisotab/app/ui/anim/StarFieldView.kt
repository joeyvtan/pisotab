package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.math.sin
import kotlin.random.Random

class StarFieldView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private data class Star(
        val x: Float,
        val y: Float,
        val baseRadius: Float,
        val phase: Double,
        val twinkleSpeed: Double,
        val color: Int
    )

    private val stars = ArrayList<Star>(150)
    private var initialized = false
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    // Warm white, cool blue-white, pale yellow — natural star colors
    private val starColors = intArrayOf(
        Color.parseColor("#FFFFFF"),
        Color.parseColor("#CCE4FF"),
        Color.parseColor("#FFEEDD"),
        Color.parseColor("#E8E0FF"),
        Color.parseColor("#C8DFFF")
    )

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        stars.clear()
        // Large bright stars
        repeat(12) {
            stars.add(Star(
                x = Random.nextFloat() * w,
                y = Random.nextFloat() * h,
                baseRadius = Random.nextFloat() * 1.8f + 2.2f,
                phase = Random.nextDouble() * Math.PI * 2,
                twinkleSpeed = Random.nextDouble() * 0.6 + 0.25,
                color = starColors[Random.nextInt(starColors.size)]
            ))
        }
        // Medium stars
        repeat(45) {
            stars.add(Star(
                x = Random.nextFloat() * w,
                y = Random.nextFloat() * h,
                baseRadius = Random.nextFloat() * 0.9f + 1.0f,
                phase = Random.nextDouble() * Math.PI * 2,
                twinkleSpeed = Random.nextDouble() * 1.0 + 0.35,
                color = Color.WHITE
            ))
        }
        // Dim distant stars — most numerous, barely visible
        repeat(90) {
            stars.add(Star(
                x = Random.nextFloat() * w,
                y = Random.nextFloat() * h,
                baseRadius = Random.nextFloat() * 0.5f + 0.3f,
                phase = Random.nextDouble() * Math.PI * 2,
                twinkleSpeed = Random.nextDouble() * 1.5 + 0.5,
                color = Color.parseColor("#99BBDD")
            ))
        }
        initialized = true
    }

    override fun onDraw(canvas: Canvas) {
        if (!initialized) { postInvalidateOnAnimation(); return }

        val t = AnimationUtils.currentAnimationTimeMillis() / 1000.0

        for (star in stars) {
            val twinkle = (sin(t * star.twinkleSpeed + star.phase) * 0.5 + 0.5).toFloat()
            val alpha = (twinkle * 205 + 50).toInt().coerceIn(0, 255)
            val radius = star.baseRadius * (0.65f + twinkle * 0.45f)
            paint.color = star.color
            paint.alpha = alpha
            canvas.drawCircle(star.x, star.y, radius, paint)
        }

        postInvalidateOnAnimation()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        invalidate()
    }
}
