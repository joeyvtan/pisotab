package com.pisotab.app.util

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

/**
 * Manages the Socket.IO connection to the backend.
 * Listens for commands sent from the admin dashboard:
 *   cmd:start, cmd:pause, cmd:resume, cmd:end, cmd:add_time, cmd:lock, cmd:unlock
 */
object SocketManager {

    private const val TAG = "SocketManager"
    private var socket: Socket? = null
    private var isConnecting = false

    // Callbacks set by the service
    var onStartSession: ((sessionId: String, durationMins: Int, amountPaid: Double) -> Unit)? = null
    var onPauseSession: (() -> Unit)? = null
    var onResumeSession: (() -> Unit)? = null
    var onEndSession: ((sessionId: String) -> Unit)? = null
    var onAddTime: ((addedMins: Int) -> Unit)? = null
    var onConnectionChange: ((connected: Boolean, error: String?) -> Unit)? = null

    // Remote admin callbacks (Phase 11)
    var onApplyConfig: ((config: JSONObject) -> Unit)? = null
    var onRestartApp: (() -> Unit)? = null
    var onRestartDevice: (() -> Unit)? = null
    var onLockScreen: (() -> Unit)? = null

    fun connect(serverUrl: String, deviceId: String) {
        if (socket?.connected() == true || isConnecting) return
        isConnecting = true
        try {
            Log.d(TAG, "Connecting to $serverUrl with deviceId=$deviceId")

            val opts = IO.Options()
            opts.auth = mapOf("device_id" to deviceId)
            opts.reconnection = true
            opts.reconnectionAttempts = Int.MAX_VALUE
            opts.reconnectionDelay = 3000

            socket = IO.socket(URI.create(serverUrl), opts)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to server")
                isConnecting = false
                onConnectionChange?.invoke(true, null)
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Disconnected from server")
                onConnectionChange?.invoke(false, "Disconnected")
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val err = args.firstOrNull()?.toString() ?: "unknown"
                Log.e(TAG, "Connection error: $err")
                onConnectionChange?.invoke(false, "ConnectError: $err")
            }

            // Dashboard started a session for this device
            socket?.on("cmd:start") { args ->
                val data = args.firstOrNull() as? JSONObject ?: return@on
                val sessionId = data.optString("session_id", "")
                val durationMins = data.optInt("duration_mins", 5)
                val amountPaid = data.optDouble("amount_paid", 0.0)
                Log.d(TAG, "cmd:start — $sessionId ${durationMins}m")
                onStartSession?.invoke(sessionId, durationMins, amountPaid)
            }

            // Dashboard paused the session
            socket?.on("cmd:pause") {
                Log.d(TAG, "cmd:pause")
                onPauseSession?.invoke()
            }

            // Dashboard resumed the session
            socket?.on("cmd:resume") {
                Log.d(TAG, "cmd:resume")
                onResumeSession?.invoke()
            }

            // Dashboard ended the session
            socket?.on("cmd:end") { args ->
                val data = args.firstOrNull() as? JSONObject
                val sessionId = data?.optString("session_id", "") ?: ""
                Log.d(TAG, "cmd:end — $sessionId")
                onEndSession?.invoke(sessionId)
            }

            // Dashboard added time
            socket?.on("cmd:add_time") { args ->
                val data = args.firstOrNull() as? JSONObject ?: return@on
                val addedMins = data.optInt("added_mins", 0)
                Log.d(TAG, "cmd:add_time — +${addedMins}m")
                if (addedMins > 0) onAddTime?.invoke(addedMins)
            }

            // Remote admin — push config from dashboard
            socket?.on("cmd:apply_config") { args ->
                val data = args.firstOrNull() as? JSONObject ?: return@on
                Log.d(TAG, "cmd:apply_config received")
                onApplyConfig?.invoke(data)
            }

            socket?.on("cmd:restart_app") {
                Log.d(TAG, "cmd:restart_app received")
                onRestartApp?.invoke()
            }

            socket?.on("cmd:restart_device") {
                Log.d(TAG, "cmd:restart_device received")
                onRestartDevice?.invoke()
            }

            socket?.on("cmd:lock_screen") {
                Log.d(TAG, "cmd:lock_screen received")
                onLockScreen?.invoke()
            }

            socket?.connect()
            Log.d(TAG, "socket.connect() called")

        } catch (e: Exception) {
            val msg = "${e.javaClass.simpleName}: ${e.message}"
            Log.e(TAG, "Socket init error: $msg")
            isConnecting = false
            onConnectionChange?.invoke(false, msg)
        }
    }

    fun emitConfigAck(deviceId: String) {
        if (socket?.connected() != true) return
        val payload = JSONObject().put("device_id", deviceId)
        socket?.emit("ack:config_applied", payload)
        Log.d(TAG, "ack:config_applied sent for $deviceId")
    }

    fun disconnect() {
        isConnecting = false
        socket?.disconnect()
        socket?.off()
        socket = null
    }

    fun isConnected() = socket?.connected() == true
}
