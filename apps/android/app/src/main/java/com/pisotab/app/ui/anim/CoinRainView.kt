package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.random.Random

class CoinRainView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private data class Coin(
        var x: Float,
        var y: Float,
        val radius: Float,
        val speedPxPerSec: Float,
        val alpha: Float
    )

    private val coins = ArrayList<Coin>(20)
    private var lastTime = 0L
    private var initialized = false

    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#F59E0B")
    }
    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#D97706")
        style = Paint.Style.STROKE
        strokeWidth = 2.5f
    }
    private val symbolPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#78350F")
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }
    private val shinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#FEF3C7")
        style = Paint.Style.FILL
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        coins.clear()
        repeat(18) {
            val r = Random.nextFloat() * 18f + 10f
            coins.add(Coin(
                x = Random.nextFloat() * w,
                y = Random.nextFloat() * h,
                radius = r,
                speedPxPerSec = Random.nextFloat() * 90f + 40f,
                alpha = Random.nextFloat() * 0.4f + 0.5f
            ))
        }
        initialized = true
    }

    override fun onDraw(canvas: Canvas) {
        if (!initialized) { postInvalidateOnAnimation(); return }

        val now = AnimationUtils.currentAnimationTimeMillis()
        val dt = if (lastTime == 0L) 0f else ((now - lastTime) / 1000f).coerceAtMost(0.08f)
        lastTime = now

        val w = width.toFloat()
        val h = height.toFloat()

        for (coin in coins) {
            coin.y += coin.speedPxPerSec * dt
            if (coin.y - coin.radius > h) {
                coin.x = Random.nextFloat() * w
                coin.y = -coin.radius * 2f
            }

            val a = (coin.alpha * 255).toInt()
            fillPaint.alpha = a
            borderPaint.alpha = a
            symbolPaint.alpha = (a * 0.6f).toInt()
            shinePaint.alpha = (a * 0.55f).toInt()
            symbolPaint.textSize = coin.radius * 1.25f

            canvas.drawCircle(coin.x, coin.y, coin.radius, fillPaint)
            // Shine highlight — small bright oval in upper-left of coin
            canvas.drawCircle(coin.x - coin.radius * 0.28f, coin.y - coin.radius * 0.28f, coin.radius * 0.28f, shinePaint)
            canvas.drawCircle(coin.x, coin.y, coin.radius, borderPaint)
            canvas.drawText("₱", coin.x, coin.y + coin.radius * 0.4f, symbolPaint)
        }

        postInvalidateOnAnimation()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        lastTime = 0L
        invalidate()
    }
}
