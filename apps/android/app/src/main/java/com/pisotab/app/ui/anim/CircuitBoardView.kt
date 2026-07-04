package com.pisotab.app.ui.anim

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.AnimationUtils
import kotlin.math.sin
import kotlin.random.Random

/** Animated glowing PCB circuit board with data-packet pulses flowing along traces. */
class CircuitBoardView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private val TRACE_COLOR = Color.parseColor("#00FF88")
    private val DIM_TRACE   = Color.parseColor("#003A1C")
    private val BG_COLOR    = Color.parseColor("#000D08")

    private data class Trace(val x1: Float, val y1: Float, val x2: Float, val y2: Float)
    private data class Node(val x: Float, val y: Float, val phase: Float)
    private data class Packet(var traceIdx: Int, var progress: Float, val speed: Float)

    private val traces  = ArrayList<Trace>()
    private val nodes   = ArrayList<Node>()
    private val packets = ArrayList<Packet>()
    private val paint   = Paint(Paint.ANTI_ALIAS_FLAG)

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        buildCircuit(w.toFloat(), h.toFloat())
    }

    private fun buildCircuit(w: Float, h: Float) {
        traces.clear(); nodes.clear(); packets.clear()
        val cols = 8; val rows = 13
        val cw = w / cols; val ch = h / rows

        val pts = Array(rows + 1) { r ->
            Array(cols + 1) { c ->
                PointF(c * cw + (if (c in 1 until cols) Random.nextFloat() * cw * 0.25f else 0f),
                       r * ch + (if (r in 1 until rows) Random.nextFloat() * ch * 0.25f else 0f))
            }
        }

        // Horizontal traces — skip ~30% for irregular organic look
        for (r in 0..rows) for (c in 0 until cols) {
            if (Random.nextFloat() > 0.30f)
                traces.add(Trace(pts[r][c].x, pts[r][c].y, pts[r][c + 1].x, pts[r][c + 1].y))
        }
        // Vertical traces
        for (r in 0 until rows) for (c in 0..cols) {
            if (Random.nextFloat() > 0.30f)
                traces.add(Trace(pts[r][c].x, pts[r][c].y, pts[r + 1][c].x, pts[r + 1][c].y))
        }
        // Nodes at every intersection
        for (r in 0..rows) for (c in 0..cols) {
            nodes.add(Node(pts[r][c].x, pts[r][c].y, Random.nextFloat() * Math.PI.toFloat() * 2))
        }
        // Seed data packets (use progress spread so packets don't all start at 0)
        repeat(22) {
            if (traces.isNotEmpty())
                packets.add(Packet(Random.nextInt(traces.size), Random.nextFloat(), Random.nextFloat() * 0.5f + 0.15f))
        }
    }

    override fun onDraw(canvas: Canvas) {
        canvas.drawColor(BG_COLOR)
        val t = AnimationUtils.currentAnimationTimeMillis() / 1000f

        // Dim base traces
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 1f; paint.color = DIM_TRACE; paint.alpha = 255
        for (tr in traces) canvas.drawLine(tr.x1, tr.y1, tr.x2, tr.y2, paint)

        // Advance and draw each data packet + its illuminated trace
        paint.strokeWidth = 1.8f
        for (pk in packets) {
            if (traces.isEmpty()) break
            val tr = traces[pk.traceIdx]
            val x  = tr.x1 + (tr.x2 - tr.x1) * pk.progress
            val y  = tr.y1 + (tr.y2 - tr.y1) * pk.progress

            // Light up the trace this packet is travelling on
            paint.color = TRACE_COLOR; paint.alpha = 90
            canvas.drawLine(tr.x1, tr.y1, tr.x2, tr.y2, paint)

            // Outer glow of packet
            paint.style = Paint.Style.FILL
            paint.color = TRACE_COLOR; paint.alpha = 110
            canvas.drawCircle(x, y, 9f, paint)
            // Bright core
            paint.color = Color.WHITE; paint.alpha = 240
            canvas.drawCircle(x, y, 3f, paint)
            paint.style = Paint.Style.STROKE

            // Advance — treat as approx 60fps (0.016s per frame)
            pk.progress += pk.speed * 0.016f
            if (pk.progress >= 1f) {
                pk.traceIdx = Random.nextInt(traces.size)
                pk.progress = 0f
            }
        }

        // Pulsing nodes
        paint.style = Paint.Style.FILL
        for (nd in nodes) {
            val pulse = (sin((t * 1.8 + nd.phase).toDouble()) * 0.5 + 0.5).toFloat()
            paint.color = TRACE_COLOR; paint.alpha = (55 + pulse * 190).toInt()
            canvas.drawCircle(nd.x, nd.y, 1.8f + pulse * 2.5f, paint)
        }

        postInvalidateOnAnimation()
    }

    override fun onAttachedToWindow() { super.onAttachedToWindow(); invalidate() }
}
