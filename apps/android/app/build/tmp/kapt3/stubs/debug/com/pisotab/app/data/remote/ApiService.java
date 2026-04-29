package com.pisotab.app.data.remote;

/**
 * Retrofit interface — mirrors the backend REST API.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u00a0\u0001\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\u0018\u0002\n\u0002\b\u0006\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\bf\u0018\u00002\u00020\u0001J\u001e\u0010\u0002\u001a\b\u0012\u0004\u0012\u00020\u00040\u00032\b\b\u0001\u0010\u0005\u001a\u00020\u0006H\u00a7@\u00a2\u0006\u0002\u0010\u0007J(\u0010\b\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\n\u001a\u00020\u000b2\b\b\u0001\u0010\u0005\u001a\u00020\fH\u00a7@\u00a2\u0006\u0002\u0010\rJ\u001e\u0010\u000e\u001a\b\u0012\u0004\u0012\u00020\u00040\u00032\b\b\u0001\u0010\u000f\u001a\u00020\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0010J\u001e\u0010\u0011\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\n\u001a\u00020\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0010J\u0014\u0010\u0012\u001a\b\u0012\u0004\u0012\u00020\u00130\u0003H\u00a7@\u00a2\u0006\u0002\u0010\u0014J\u001a\u0010\u0015\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00170\u00160\u0003H\u00a7@\u00a2\u0006\u0002\u0010\u0014J\u0014\u0010\u0018\u001a\b\u0012\u0004\u0012\u00020\u00190\u0016H\u00a7@\u00a2\u0006\u0002\u0010\u0014J\u0018\u0010\u001a\u001a\u00020\u001b2\b\b\u0001\u0010\n\u001a\u00020\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0010J0\u0010\u001c\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u001d0\u00160\u00032\b\b\u0003\u0010\u001e\u001a\u00020\u001f2\n\b\u0003\u0010\u000f\u001a\u0004\u0018\u00010\u000bH\u00a7@\u00a2\u0006\u0002\u0010 J(\u0010!\u001a\b\u0012\u0004\u0012\u00020\"0\u00032\b\b\u0001\u0010\u000f\u001a\u00020\u000b2\b\b\u0001\u0010#\u001a\u00020$H\u00a7@\u00a2\u0006\u0002\u0010%J\u001e\u0010&\u001a\b\u0012\u0004\u0012\u00020\'0\u00032\b\b\u0001\u0010\u0005\u001a\u00020(H\u00a7@\u00a2\u0006\u0002\u0010)J\u001e\u0010*\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\n\u001a\u00020\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0010J\u0018\u0010+\u001a\u00020,2\b\b\u0001\u0010\u0005\u001a\u00020-H\u00a7@\u00a2\u0006\u0002\u0010.J\u001e\u0010/\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\n\u001a\u00020\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0010J\u0018\u00100\u001a\u00020\u001b2\b\b\u0001\u0010\u0005\u001a\u000201H\u00a7@\u00a2\u0006\u0002\u00102J(\u00103\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\n\u001a\u00020\u000b2\b\b\u0001\u0010#\u001a\u000204H\u00a7@\u00a2\u0006\u0002\u00105J(\u00106\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\u000f\u001a\u00020\u000b2\b\b\u0001\u0010#\u001a\u000207H\u00a7@\u00a2\u0006\u0002\u00108J(\u00109\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\u000f\u001a\u00020\u000b2\b\b\u0001\u0010\u0005\u001a\u00020:H\u00a7@\u00a2\u0006\u0002\u0010;\u00a8\u0006<"}, d2 = {"Lcom/pisotab/app/data/remote/ApiService;", "", "activateLicense", "Lretrofit2/Response;", "Lcom/pisotab/app/data/remote/LicenseStatusResponse;", "req", "Lcom/pisotab/app/data/remote/LicenseActivateRequest;", "(Lcom/pisotab/app/data/remote/LicenseActivateRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "addTime", "", "sessionId", "", "Lcom/pisotab/app/data/remote/AddTimeRequest;", "(Ljava/lang/String;Lcom/pisotab/app/data/remote/AddTimeRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "checkLicense", "deviceId", "(Ljava/lang/String;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "endSession", "getAppVersion", "Lcom/pisotab/app/data/remote/AppVersionResponse;", "(Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getAvailableLicenses", "", "Lcom/pisotab/app/data/remote/AvailableLicenseItem;", "getPricingTiers", "Lcom/pisotab/app/data/remote/PricingTier;", "getSession", "Lcom/pisotab/app/data/remote/SessionResponse;", "getSessions", "Lcom/pisotab/app/data/remote/SessionListItem;", "limit", "", "(ILjava/lang/String;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "heartbeat", "Lcom/pisotab/app/data/remote/HeartbeatResponse;", "body", "Lcom/pisotab/app/data/remote/HeartbeatRequest;", "(Ljava/lang/String;Lcom/pisotab/app/data/remote/HeartbeatRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "login", "Lcom/pisotab/app/data/remote/LoginResponse;", "Lcom/pisotab/app/data/remote/LoginRequest;", "(Lcom/pisotab/app/data/remote/LoginRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "pauseSession", "reportCoin", "Lcom/pisotab/app/data/remote/CoinResponse;", "Lcom/pisotab/app/data/remote/CoinRequest;", "(Lcom/pisotab/app/data/remote/CoinRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "resumeSession", "startSession", "Lcom/pisotab/app/data/remote/StartSessionRequest;", "(Lcom/pisotab/app/data/remote/StartSessionRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "syncTime", "Lcom/pisotab/app/data/remote/SyncTimeRequest;", "(Ljava/lang/String;Lcom/pisotab/app/data/remote/SyncTimeRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "updateDeviceConfig", "Lcom/pisotab/app/data/remote/DeviceConfigRequest;", "(Ljava/lang/String;Lcom/pisotab/app/data/remote/DeviceConfigRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "updateFcmToken", "Lcom/pisotab/app/data/remote/FcmTokenRequest;", "(Ljava/lang/String;Lcom/pisotab/app/data/remote/FcmTokenRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "app_debug"})
public abstract interface ApiService {
    
    @retrofit2.http.POST(value = "api/devices/{id}/heartbeat")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object heartbeat(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String deviceId, @retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.HeartbeatRequest body, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.pisotab.app.data.remote.HeartbeatResponse>> $completion);
    
    @retrofit2.http.POST(value = "api/sessions")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object startSession(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.StartSessionRequest req, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.pisotab.app.data.remote.SessionResponse> $completion);
    
    @retrofit2.http.POST(value = "api/sessions/{id}/end")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object endSession(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String sessionId, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    @retrofit2.http.POST(value = "api/sessions/{id}/pause")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object pauseSession(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String sessionId, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    @retrofit2.http.POST(value = "api/sessions/{id}/resume")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object resumeSession(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String sessionId, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    @retrofit2.http.PATCH(value = "api/sessions/{id}/sync")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object syncTime(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String sessionId, @retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.SyncTimeRequest body, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    @retrofit2.http.POST(value = "api/sessions/{id}/add-time")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object addTime(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String sessionId, @retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.AddTimeRequest req, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    @retrofit2.http.POST(value = "api/coins")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object reportCoin(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.CoinRequest req, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.pisotab.app.data.remote.CoinResponse> $completion);
    
    @retrofit2.http.GET(value = "api/sessions/{id}")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getSession(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String sessionId, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.pisotab.app.data.remote.SessionResponse> $completion);
    
    @retrofit2.http.GET(value = "api/pricing")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getPricingTiers(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super java.util.List<com.pisotab.app.data.remote.PricingTier>> $completion);
    
    @retrofit2.http.PATCH(value = "api/devices/{id}/fcm-token")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object updateFcmToken(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String deviceId, @retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.FcmTokenRequest req, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    @retrofit2.http.POST(value = "api/auth/login")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object login(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.LoginRequest req, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.pisotab.app.data.remote.LoginResponse>> $completion);
    
    @retrofit2.http.GET(value = "api/sessions")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getSessions(@retrofit2.http.Query(value = "limit")
    int limit, @retrofit2.http.Query(value = "device_id")
    @org.jetbrains.annotations.Nullable()
    java.lang.String deviceId, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<java.util.List<com.pisotab.app.data.remote.SessionListItem>>> $completion);
    
    @retrofit2.http.GET(value = "api/app/version")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getAppVersion(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.pisotab.app.data.remote.AppVersionResponse>> $completion);
    
    @retrofit2.http.GET(value = "api/licenses/check/{deviceId}")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object checkLicense(@retrofit2.http.Path(value = "deviceId")
    @org.jetbrains.annotations.NotNull()
    java.lang.String deviceId, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.pisotab.app.data.remote.LicenseStatusResponse>> $completion);
    
    @retrofit2.http.POST(value = "api/licenses/activate")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object activateLicense(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.LicenseActivateRequest req, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.pisotab.app.data.remote.LicenseStatusResponse>> $completion);
    
    @retrofit2.http.GET(value = "api/licenses/available")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getAvailableLicenses(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<java.util.List<com.pisotab.app.data.remote.AvailableLicenseItem>>> $completion);
    
    @retrofit2.http.PATCH(value = "api/devices/{id}/config")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object updateDeviceConfig(@retrofit2.http.Path(value = "id")
    @org.jetbrains.annotations.NotNull()
    java.lang.String deviceId, @retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.DeviceConfigRequest body, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<kotlin.Unit>> $completion);
    
    /**
     * Retrofit interface — mirrors the backend REST API.
     */
    @kotlin.Metadata(mv = {1, 9, 0}, k = 3, xi = 48)
    public static final class DefaultImpls {
    }
}