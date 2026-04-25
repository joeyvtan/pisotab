package com.pisotab.app.util;

/**
 * Applies a remote config payload (from the dashboard PATCH /api/devices/:id/config)
 * into local SharedPreferences so all app components pick up the new settings immediately.
 *
 * Called from SyncService both on heartbeat response (pending_config) and
 * on the cmd:apply_config socket event.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000$\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nR\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u000b"}, d2 = {"Lcom/pisotab/app/util/RemoteConfigManager;", "", "()V", "TAG", "", "applyConfig", "", "config", "Lorg/json/JSONObject;", "prefs", "Lcom/pisotab/app/util/PrefsManager;", "app_debug"})
public final class RemoteConfigManager {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "RemoteConfigManager";
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.RemoteConfigManager INSTANCE = null;
    
    private RemoteConfigManager() {
        super();
    }
    
    public final void applyConfig(@org.jetbrains.annotations.NotNull()
    org.json.JSONObject config, @org.jetbrains.annotations.NotNull()
    com.pisotab.app.util.PrefsManager prefs) {
    }
}