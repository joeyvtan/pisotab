package com.pisotab.app.util;

/**
 * Applies a remote config payload (from the dashboard PATCH /api/devices/:id/config)
 * into local SharedPreferences so all app components pick up the new settings immediately.
 *
 * Called from SyncService both on heartbeat response (pending_config) and
 * on the cmd:apply_config socket event.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000*\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0018\u0002\n\u0002\u0010\u0002\n\u0002\b\u0006\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010\f\u001a\u00020\u00072\u0006\u0010\r\u001a\u00020\u000e2\u0006\u0010\u000f\u001a\u00020\u0010R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\"\u0010\u0005\u001a\n\u0012\u0004\u0012\u00020\u0007\u0018\u00010\u0006X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\b\u0010\t\"\u0004\b\n\u0010\u000b\u00a8\u0006\u0011"}, d2 = {"Lcom/pisotab/app/util/RemoteConfigManager;", "", "()V", "TAG", "", "onConfigChanged", "Lkotlin/Function0;", "", "getOnConfigChanged", "()Lkotlin/jvm/functions/Function0;", "setOnConfigChanged", "(Lkotlin/jvm/functions/Function0;)V", "applyConfig", "config", "Lorg/json/JSONObject;", "prefs", "Lcom/pisotab/app/util/PrefsManager;", "app_debug"})
public final class RemoteConfigManager {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "RemoteConfigManager";
    
    /**
     * Notified on the main thread after prefs are updated from a remote config push.
     */
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onConfigChanged;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.RemoteConfigManager INSTANCE = null;
    
    private RemoteConfigManager() {
        super();
    }
    
    /**
     * Notified on the main thread after prefs are updated from a remote config push.
     */
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnConfigChanged() {
        return null;
    }
    
    /**
     * Notified on the main thread after prefs are updated from a remote config push.
     */
    public final void setOnConfigChanged(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
    }
    
    public final void applyConfig(@org.jetbrains.annotations.NotNull()
    org.json.JSONObject config, @org.jetbrains.annotations.NotNull()
    com.pisotab.app.util.PrefsManager prefs) {
    }
}