package com.pisotab.app;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000,\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0002\b\u0005\n\u0002\u0010\u0002\n\u0002\b\u0004\u0018\u0000 \u00192\u00020\u0001:\u0001\u0019B\u0005\u00a2\u0006\u0002\u0010\u0002J\u0006\u0010\u0015\u001a\u00020\u0016J\b\u0010\u0017\u001a\u00020\u0016H\u0002J\b\u0010\u0018\u001a\u00020\u0016H\u0016R\u001a\u0010\u0003\u001a\u00020\u0004X\u0086.\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0005\u0010\u0006\"\u0004\b\u0007\u0010\bR\u001a\u0010\t\u001a\u00020\nX\u0086.\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u000b\u0010\f\"\u0004\b\r\u0010\u000eR\u001a\u0010\u000f\u001a\u00020\u0010X\u0086.\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0011\u0010\u0012\"\u0004\b\u0013\u0010\u0014\u00a8\u0006\u001a"}, d2 = {"Lcom/pisotab/app/PisoTabApp;", "Landroid/app/Application;", "()V", "api", "Lcom/pisotab/app/data/remote/ApiService;", "getApi", "()Lcom/pisotab/app/data/remote/ApiService;", "setApi", "(Lcom/pisotab/app/data/remote/ApiService;)V", "database", "Lcom/pisotab/app/data/local/AppDatabase;", "getDatabase", "()Lcom/pisotab/app/data/local/AppDatabase;", "setDatabase", "(Lcom/pisotab/app/data/local/AppDatabase;)V", "prefs", "Lcom/pisotab/app/util/PrefsManager;", "getPrefs", "()Lcom/pisotab/app/util/PrefsManager;", "setPrefs", "(Lcom/pisotab/app/util/PrefsManager;)V", "initApi", "", "initDatabase", "onCreate", "Companion", "app_debug"})
public final class PisoTabApp extends android.app.Application {
    public com.pisotab.app.util.PrefsManager prefs;
    public com.pisotab.app.data.local.AppDatabase database;
    public com.pisotab.app.data.remote.ApiService api;
    public static com.pisotab.app.PisoTabApp instance;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.PisoTabApp.Companion Companion = null;
    
    public PisoTabApp() {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final com.pisotab.app.util.PrefsManager getPrefs() {
        return null;
    }
    
    public final void setPrefs(@org.jetbrains.annotations.NotNull()
    com.pisotab.app.util.PrefsManager p0) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final com.pisotab.app.data.local.AppDatabase getDatabase() {
        return null;
    }
    
    public final void setDatabase(@org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.local.AppDatabase p0) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final com.pisotab.app.data.remote.ApiService getApi() {
        return null;
    }
    
    public final void setApi(@org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.remote.ApiService p0) {
    }
    
    @java.lang.Override()
    public void onCreate() {
    }
    
    public final void initApi() {
    }
    
    private final void initDatabase() {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0014\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0005\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u001a\u0010\u0003\u001a\u00020\u0004X\u0086.\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0005\u0010\u0006\"\u0004\b\u0007\u0010\b\u00a8\u0006\t"}, d2 = {"Lcom/pisotab/app/PisoTabApp$Companion;", "", "()V", "instance", "Lcom/pisotab/app/PisoTabApp;", "getInstance", "()Lcom/pisotab/app/PisoTabApp;", "setInstance", "(Lcom/pisotab/app/PisoTabApp;)V", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        @org.jetbrains.annotations.NotNull()
        public final com.pisotab.app.PisoTabApp getInstance() {
            return null;
        }
        
        public final void setInstance(@org.jetbrains.annotations.NotNull()
        com.pisotab.app.PisoTabApp p0) {
        }
    }
}