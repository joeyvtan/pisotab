package com.pisotab.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.pisotab.app.PisoTabApp
import com.pisotab.app.data.local.SessionEntity
import com.pisotab.app.data.remote.AddTimeRequest
import com.pisotab.app.data.remote.StartSessionRequest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.util.UUID

sealed class SessionState {
    object Idle : SessionState()
    data class Active(val session: SessionEntity) : SessionState()
    data class Paused(val session: SessionEntity) : SessionState()
    object Expired : SessionState()
    data class Error(val message: String) : SessionState()
}

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val app = application as PisoTabApp
    private val db get() = app.database
    private val api get() = app.api
    val prefs get() = app.prefs

    private val _sessionState = MutableStateFlow<SessionState>(SessionState.Idle)
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    init {
        viewModelScope.launch {
            // prefs.activeSessionId is the fast synchronous source of truth.
            // TimerService clears it before launching MainActivity so that if the cleanup
            // coroutine hasn't finished writing "ended" to the DB yet, we still return Idle
            // instead of restarting the timer from stale DB data.
            if (prefs.activeSessionId.isEmpty()) return@launch
            // Use the exact session ID from prefs to avoid returning a stale "active" row
            // from a previous session that was never properly marked "ended" in the DB.
            val active = db.sessionDao().getActiveSessionById(prefs.activeSessionId)
            if (active != null) {
                try {
                    val serverSession = api.getSession(active.id)
                    if (serverSession.status == "ended") {
                        // Server confirmed the session is over — clean up locally
                        db.sessionDao().updateStatus(active.id, "ended")
                        prefs.activeSessionId = ""
                        _sessionState.value = SessionState.Idle
                    } else {
                        _sessionState.value = if (active.status == "paused")
                            SessionState.Paused(active) else SessionState.Active(active)
                    }
                } catch (e: HttpException) {
                    if (e.code() == 404) {
                        // Server has no record — session is truly gone, discard locally
                        db.sessionDao().updateStatus(active.id, "ended")
                        prefs.activeSessionId = ""
                        _sessionState.value = SessionState.Idle
                    } else {
                        // Server error (5xx, etc.) — trust local DB, session may still be valid
                        _sessionState.value = if (active.status == "paused")
                            SessionState.Paused(active) else SessionState.Active(active)
                    }
                } catch (_: Exception) {
                    // Network unreachable — trust local DB rather than killing an active session
                    _sessionState.value = if (active.status == "paused")
                        SessionState.Paused(active) else SessionState.Active(active)
                }
            }
        }
    }

    fun startSession(durationMins: Int, amountPaid: Double, pricingTierId: String? = null, serverSessionId: String? = null) {
        viewModelScope.launch {
            val deviceId = prefs.deviceId
            // Use server-assigned ID if provided (triggered by socket cmd:start from dashboard)
            // Otherwise generate a local ID for coin-triggered sessions
            val sessionId = if (!serverSessionId.isNullOrEmpty()) serverSessionId
                            else "local_" + UUID.randomUUID().toString().take(8)
            val entity = SessionEntity(
                id = sessionId,
                deviceId = deviceId,
                startedAt = System.currentTimeMillis() / 1000,
                durationMins = durationMins,
                timeRemainingSecs = durationMins * 60,
                status = "active",
                amountPaid = amountPaid,
                paymentMethod = if (!serverSessionId.isNullOrEmpty()) "manual" else "coin",
                syncedToServer = !serverSessionId.isNullOrEmpty()
            )
            // Set prefs and state BEFORE the suspend call to db.sessionDao().upsert().
            // syncFromDb() checks prefs.activeSessionId first — if it's empty it emits Idle
            // immediately, which would flash the lock screen during the DB write suspension.
            prefs.activeSessionId = sessionId
            _sessionState.value = SessionState.Active(entity)
            db.sessionDao().upsert(entity)

            // Only call API if this was a local/coin-triggered start (not from dashboard cmd:start)
            if (serverSessionId.isNullOrEmpty()) {
                try {
                    val response = api.startSession(
                        StartSessionRequest(deviceId, pricingTierId, durationMins, amountPaid, "coin")
                    )
                    // Mark the local placeholder row as ended so it never reappears as a stale
                    // active session on app reopen. TimerService switches to the server-assigned
                    // ID automatically via prefs.activeSessionId on the next tick.
                    db.sessionDao().updateStatus(entity.id, "ended")
                    db.sessionDao().upsert(entity.copy(id = response.id, syncedToServer = true))
                    prefs.activeSessionId = response.id
                    _sessionState.value = SessionState.Active(entity.copy(id = response.id))
                } catch (_: Exception) {
                    // Offline — local ID used until sync
                }
            }
        }
    }

    fun startUsbSession(sessionId: String) {
        viewModelScope.launch {
            val deviceId = prefs.deviceId
            val entity = SessionEntity(
                id = sessionId,
                deviceId = deviceId,
                startedAt = System.currentTimeMillis() / 1000,
                durationMins = 0,
                timeRemainingSecs = 0,
                status = "active",
                amountPaid = 0.0,
                paymentMethod = "usb",
                syncedToServer = false
            )
            // Same ordering fix as startSession() — prefs/state before suspension point
            prefs.activeSessionId = sessionId
            _sessionState.value = SessionState.Active(entity)
            db.sessionDao().upsert(entity)
            try {
                val response = api.startSession(
                    StartSessionRequest(deviceId, null, 0, 0.0, "usb")
                )
                db.sessionDao().updateStatus(entity.id, "ended")
                db.sessionDao().upsert(entity.copy(id = response.id, syncedToServer = true))
                prefs.activeSessionId = response.id
                _sessionState.value = SessionState.Active(entity.copy(id = response.id))
            } catch (_: Exception) {}
        }
    }

    fun pauseSession() {
        viewModelScope.launch {
            val state = _sessionState.value
            if (state is SessionState.Active) {
                db.sessionDao().updateStatus(state.session.id, "paused")
                _sessionState.value = SessionState.Paused(state.session.copy(status = "paused"))
                try { api.pauseSession(state.session.id) } catch (_: Exception) {}
            }
        }
    }

    fun resumeSession() {
        viewModelScope.launch {
            val state = _sessionState.value
            if (state is SessionState.Paused) {
                db.sessionDao().updateStatus(state.session.id, "active")
                _sessionState.value = SessionState.Active(state.session.copy(status = "active"))
                try { api.resumeSession(state.session.id) } catch (_: Exception) {}
            }
        }
    }

    fun endSession() {
        viewModelScope.launch {
            val id = prefs.activeSessionId
            if (id.isNotEmpty()) {
                db.sessionDao().updateStatus(id, "ended")
                try { api.endSession(id) } catch (_: Exception) {}
                prefs.activeSessionId = ""
            }
            _sessionState.value = SessionState.Idle
        }
    }

    fun addTime(addedMins: Int) {
        viewModelScope.launch {
            val state = _sessionState.value
            val session = when (state) {
                is SessionState.Active -> state.session
                is SessionState.Paused -> state.session
                else -> return@launch
            }
            val newSecs = session.timeRemainingSecs + (addedMins * 60)
            db.sessionDao().updateTime(session.id, newSecs)
            val updated = session.copy(timeRemainingSecs = newSecs)
            _sessionState.value = if (session.status == "paused")
                SessionState.Paused(updated) else SessionState.Active(updated)
            try { api.addTime(session.id, AddTimeRequest(addedMins, 0.0)) } catch (_: Exception) {}
        }
    }

    fun syncFromDb() {
        viewModelScope.launch {
            // Guard: prefs.activeSessionId is cleared synchronously by TimerService before the
            // async DB update completes. If it is empty the session is over — return Idle
            // immediately rather than reading stale "active" data from the DB and restarting
            // the timer (which would cause an infinite expiry loop with 0 remaining seconds).
            if (prefs.activeSessionId.isEmpty()) {
                _sessionState.value = SessionState.Idle
                return@launch
            }
            val active = db.sessionDao().getActiveSessionById(prefs.activeSessionId)
            if (active != null) {
                _sessionState.value = if (active.status == "paused")
                    SessionState.Paused(active) else SessionState.Active(active)
            } else {
                // DB row may not exist yet if startSession() is mid-upsert.
                // prefs.activeSessionId is set BEFORE upsert, so if the current state is
                // already Active/Paused, do NOT override it — that would flash the lock screen.
                val cur = _sessionState.value
                if (cur !is SessionState.Active && cur !is SessionState.Paused) {
                    _sessionState.value = SessionState.Idle
                }
            }
        }
    }

    /**
     * End the session ONLY if [targetSessionId] matches the current active session.
     * Used by socket cmd:end to prevent a delayed echo from the backend (which re-emits cmd:end
     * when the device itself calls api.endSession) from killing a newly started session.
     * The check runs inside the coroutine so it is serialized after any in-flight startSession.
     */
    fun endSessionById(targetSessionId: String) {
        viewModelScope.launch {
            val currentId = prefs.activeSessionId
            // Three-part guard: stale echo only when ALL are true:
            //   • targetSessionId is present (server sent an ID)
            //   • it doesn't match currentId (different session)
            //   • currentId is non-empty (a session is actually active in prefs)
            // When currentId is empty, SyncService already handled cleanup — still
            // emit Idle so the UI updates immediately without waiting for onResume.
            if (targetSessionId.isNotEmpty() && targetSessionId != currentId && currentId.isNotEmpty()) {
                return@launch  // stale cmd:end for a different active session — ignore
            }
            if (currentId.isNotEmpty()) {
                // Normal path: SyncService hasn't cleaned up yet, do it here
                db.sessionDao().updateStatus(currentId, "ended")
                try { api.endSession(currentId) } catch (_: Exception) {}
                prefs.activeSessionId = ""
            }
            // Always emit Expired — triggers LockScreenActivity regardless of how the session
            // ended (dashboard, socket cmd:end, or natural timer expiry). onResume() then calls
            // syncFromDb() which emits Idle after LockScreenActivity auto-dismisses.
            _sessionState.value = SessionState.Expired
        }
    }

    fun onTimeTick(newSecs: Int) {
        val state = _sessionState.value
        if (state is SessionState.Active) {
            val updated = state.session.copy(timeRemainingSecs = newSecs)
            _sessionState.value = if (newSecs <= 0) SessionState.Expired else SessionState.Active(updated)
        }
    }
}
