package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.math.abs
import kotlin.math.sin

/**
 * Retro-futuristic perspective grid — converging neon lines with a moving scan line.
 * Cyan horizontal grid, magenta vertical spokes, glowing horizon.
 */
class NeonGridView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private val paint     = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    private val CYAN    = Color.parseColor("#00FFFF")
    private val MAGENTA = Color.parseColor("#FF00FF")
    private val BG      = Color.parseColor("#03001C")

    override fun onDraw(canvas: Canvas) {
        canvas.drawColor(BG)
        val t  = AnimationUtils.currentAnimationTimeMillis()
        val w  = width.toFloat()
        val h  = height.toFloat()
        val vx = w / 2f          // vanishing-point x = centre
        val vy = h * 0.40f       // vanishing-point y = upper area

        // Subtle pulsing brightness on horizon
        val pulse = (sin(t / 900.0) * 0.5 + 0.5).toFloat()

        // ── Horizontal grid lines scrolling toward viewer ──────────────────────
        val HLINES     = 22
        val scrollFrac = (t % 2400L) / 2400f  // repeating scroll cycle

        for (i in 0..HLINES) {
            val depth = ((i.toFloat() / HLINES + scrollFrac) % 1f)
            val yPos  = vy + (h - vy) * depth * depth          // perspective compression
            if (yPos <= vy || yPos > h + 4f) continue

            val alpha  = (depth * 180).toInt().coerceIn(8, 180)
            val stroke = 0.8f + depth * 2f

            // Compute x-extent at this depth (lines start narrow at horizon, full width at bottom)
            val halfW = (w / 2f) * depth
            val x1 = vx - halfW; val x2 = vx + halfW

            glowPaint.color = CYAN; glowPaint.alpha = (alpha * 0.38f).toInt(); glowPaint.strokeWidth = stroke + 8f
            canvas.drawLine(x1, yPos, x2, yPos, glowPaint)
            paint.color = CYAN; paint.alpha = alpha; paint.strokeWidth = stroke
            canvas.drawLine(x1, yPos, x2, yPos, paint)
        }

        // ── Vertical spokes converging at vanishing point ──────────────────────
        val VLINES = 18
        for (i in 0..VLINES) {
            val xFrac   = i.toFloat() / VLINES
            val bottomX = xFrac * w
            // Fades toward edges, brightest near centre
            val edgeFade = 1f - abs(xFrac - 0.5f) * 2f
            val alpha    = (edgeFade * 160).toInt().coerceIn(15, 160)

            glowPaint.color = MAGENTA; glowPaint.alpha = (alpha * 0.30f).toInt(); glowPaint.strokeWidth = 6f
            canvas.drawLine(vx, vy, bottomX, h, glowPaint)
            paint.color = MAGENTA; paint.alpha = alpha; paint.strokeWidth = 1f
            canvas.drawLine(vx, vy, bottomX, h, paint)
        }

        // ── Glowing horizon line ───────────────────────────────────────────────
        val horizonAlpha = (140 + pulse * 80).toInt()
        glowPaint.color = CYAN; glowPaint.alpha = (horizonAlpha * 0.55f).toInt(); glowPaint.strokeWidth = 10f
        canvas.drawLine(0f, vy, w, vy, glowPaint)
        paint.color = Color.WHITE; paint.alpha = horizonAlpha; paint.strokeWidth = 1.5f
        canvas.drawLine(0f, vy, w, vy, paint)

        // Sun / orb on horizon
        val sunR = 44f + pulse * 10f
        val sunGrad = RadialGradient(vx, vy, sunR,
            intArrayOf(Color.parseColor("#FF44FF"), Color.parseColor("#FF00AA"), Color.parseColor("#00000000")),
            floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
        fillPaint.shader = sunGrad; fillPaint.alpha = 200
        canvas.drawCircle(vx, vy, sunR, fillPaint)
        fillPaint.shader = null

        // ── Moving scan line ───────────────────────────────────────────────────
        val scanY = vy + ((t % 3200L) / 3200f) * (h - vy)
        paint.color = CYAN; paint.alpha = 55; paint.strokeWidth = 2.5f
        canvas.drawLine(0f, scanY, w, scanY, paint)

        // Top half: dark fade so sky stays black
        val skyGrad = LinearGradient(0f, 0f, 0f, vy,
            intArrayOf(BG, Color.parseColor("#0A001A")),
            null, Shader.TileMode.CLAMP)
        fillPaint.shader = skyGrad; fillPaint.alpha = 200
        canvas.drawRect(0f, 0f, w, vy, fillPaint)
        fillPaint.shader = null

        postInvalidateOnAnimation()
    }

    override fun onAttachedToWindow() { super.onAttachedToWindow(); invalidate() }
}
