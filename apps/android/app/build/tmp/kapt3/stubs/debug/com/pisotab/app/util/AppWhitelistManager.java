package com.pisotab.app.util;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000$\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000b\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010\u0005\u001a\u00020\u00062\u0006\u0010\u0007\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nR\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u000b"}, d2 = {"Lcom/pisotab/app/util/AppWhitelistManager;", "", "()V", "TAG", "", "enforce", "", "context", "Landroid/content/Context;", "enable", "", "app_debug"})
public final class AppWhitelistManager {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "AppWhitelistManager";
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.AppWhitelistManager INSTANCE = null;
    
    private AppWhitelistManager() {
        super();
    }
    
    /**
     * Suspend all installed packages that are NOT in the whitelist.
     * Requires Device Owner. Safe to call on non-Device-Owner (silently skipped).
     *
     * Call on session start (enable=true) to hide non-whitelisted apps.
     * Call on session end (enable=false) to restore all apps.
     */
    public final void enforce(@org.jetbrains.annotations.NotNull()
    android.content.Context context, boolean enable) {
    }
}