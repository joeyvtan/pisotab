package com.pisotab.app.data.remote

import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit interface — mirrors the backend REST API.
 */
interface ApiService {

    @POST("api/devices/{id}/heartbeat")
    suspend fun heartbeat(
        @Path("id") deviceId: String,
        @Body body: HeartbeatRequest
    ): Response<HeartbeatResponse>

    @POST("api/sessions")
    suspend fun startSession(@Body req: StartSessionRequest): SessionResponse

    @POST("api/sessions/{id}/end")
    suspend fun endSession(@Path("id") sessionId: String): Response<Unit>

    @POST("api/sessions/{id}/pause")
    suspend fun pauseSession(@Path("id") sessionId: String): Response<Unit>

    @POST("api/sessions/{id}/resume")
    suspend fun resumeSession(@Path("id") sessionId: String): Response<Unit>

    @PATCH("api/sessions/{id}/sync")
    suspend fun syncTime(@Path("id") sessionId: String, @Body body: SyncTimeRequest): Response<Unit>

    @POST("api/sessions/{id}/add-time")
    suspend fun addTime(@Path("id") sessionId: String, @Body req: AddTimeRequest): Response<Unit>

    @POST("api/coins")
    suspend fun reportCoin(@Body req: CoinRequest): CoinResponse

    @GET("api/sessions/{id}")
    suspend fun getSession(@Path("id") sessionId: String): SessionResponse

    @GET("api/pricing")
    suspend fun getPricingTiers(): List<PricingTier>

    @PATCH("api/devices/{id}/fcm-token")
    suspend fun updateFcmToken(@Path("id") deviceId: String, @Body req: FcmTokenRequest): Response<Unit>

    @POST("api/auth/login")
    suspend fun login(@Body req: LoginRequest): Response<LoginResponse>

    @GET("api/sessions")
    suspend fun getSessions(
        @Query("limit") limit: Int = 100,
        @Query("device_id") deviceId: String? = null
    ): Response<List<SessionListItem>>

    @GET("api/app/version")
    suspend fun getAppVersion(): Response<AppVersionResponse>

    @GET("api/licenses/check/{deviceId}")
    suspend fun checkLicense(@Path("deviceId") deviceId: String): Response<LicenseStatusResponse>

    @POST("api/licenses/activate")
    suspend fun activateLicense(@Body req: LicenseActivateRequest): Response<LicenseStatusResponse>

    @GET("api/licenses/available")
    suspend fun getAvailableLicenses(): Response<List<AvailableLicenseItem>>
}

// ── Request / Response DTOs ─────────────────────────────────────────────────

data class HeartbeatRequest(
    val ip_address: String?,
    val android_id: String?,
    val session_id: String?,
    val time_remaining_secs: Int?
)

data class HeartbeatResponse(
    val ok: Boolean,
    val pending_config: DeviceConfig?
)

data class DeviceConfig(
    val connection_mode: String?,
    val rate_per_min: Double?,
    val secs_per_coin: Int?,
    val coin_rates: String?,
    val kiosk_mode: Boolean?,
    val floating_timer: Boolean?,
    val deep_freeze: Boolean?,
    val deep_freeze_grace: Int?,
    val alarm_wifi: Boolean?,
    val alarm_charger: Boolean?,
    val alarm_session_only: Boolean?,
    val alarm_delay_secs: Int?
)
data class StartSessionRequest(
    val device_id: String,
    val pricing_tier_id: String?,
    val duration_mins: Int,
    val amount_paid: Double,
    val payment_method: String
)
data class SessionResponse(
    val id: String,
    val device_id: String,
    val duration_mins: Int,
    val time_remaining_secs: Int,
    val status: String,
    val amount_paid: Double
)
data class SyncTimeRequest(val time_remaining_secs: Int)
data class AddTimeRequest(val added_mins: Int, val amount_paid: Double)
data class CoinRequest(
    val device_id: String,
    val coin_value: Double,
    val pulses: Int,
    val credited_secs: Int
)
data class CoinResponse(val ok: Boolean, val action: String, val session_id: String, val credited_secs: Int)
data class FcmTokenRequest(val fcm_token: String)
data class PricingTier(
    val id: String,
    val name: String,
    val amount_pesos: Double,
    val duration_mins: Int,
    val is_active: Int
)

data class SessionListItem(
    val id: String,
    val device_id: String,
    val device_name: String?,
    val duration_mins: Int,
    val amount_paid: Double,
    val status: String,
    val payment_method: String?,
    val started_at: Long,
    val ended_at: Long?
)

data class AppVersionResponse(
    val version_code: Int,
    val version_name: String,
    val apk_url: String?
)

data class LoginRequest(val username: String, val password: String)
data class LoginResponse(val token: String)

data class LicenseStatusResponse(
    val status: String,   // "active" | "trial" | "trial_expired"
    val plan: String,
    val days_left: Int?
)
data class LicenseActivateRequest(val device_id: String, val license_key: String)
data class AvailableLicenseItem(
    val id: String,
    val key: String,
    val plan: String,
    val expires_at: Long?
)
