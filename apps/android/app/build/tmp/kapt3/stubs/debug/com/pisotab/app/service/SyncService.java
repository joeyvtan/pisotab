package com.pisotab.app.service;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000L\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\b\u0018\u0000 \"2\u00020\u0001:\u0001\"B\u0005\u00a2\u0006\u0002\u0010\u0002J\b\u0010\u0013\u001a\u00020\u0014H\u0002J\b\u0010\u0015\u001a\u00020\u0016H\u0002J\b\u0010\u0017\u001a\u00020\u0016H\u0002J\u0014\u0010\u0018\u001a\u0004\u0018\u00010\u00192\b\u0010\u001a\u001a\u0004\u0018\u00010\u001bH\u0016J\b\u0010\u001c\u001a\u00020\u0016H\u0016J\b\u0010\u001d\u001a\u00020\u0016H\u0016J\b\u0010\u001e\u001a\u00020\u0016H\u0002J\b\u0010\u001f\u001a\u00020\u0016H\u0002J\b\u0010 \u001a\u00020\u0016H\u0002J\b\u0010!\u001a\u00020\u0016H\u0002R\u0014\u0010\u0003\u001a\u00020\u00048BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\u0005\u0010\u0006R\u0014\u0010\u0007\u001a\u00020\b8BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\t\u0010\nR\u0014\u0010\u000b\u001a\u00020\f8BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\r\u0010\u000eR\u000e\u0010\u000f\u001a\u00020\u0010X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0011\u001a\u0004\u0018\u00010\u0012X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006#"}, d2 = {"Lcom/pisotab/app/service/SyncService;", "Landroid/app/Service;", "()V", "api", "Lcom/pisotab/app/data/remote/ApiService;", "getApi", "()Lcom/pisotab/app/data/remote/ApiService;", "app", "Lcom/pisotab/app/PisoTabApp;", "getApp", "()Lcom/pisotab/app/PisoTabApp;", "db", "Lcom/pisotab/app/data/local/AppDatabase;", "getDb", "()Lcom/pisotab/app/data/local/AppDatabase;", "scope", "Lkotlinx/coroutines/CoroutineScope;", "usbReceiver", "Landroid/content/BroadcastReceiver;", "buildNotif", "Landroid/app/Notification;", "connectSocket", "", "createChannel", "onBind", "Landroid/os/IBinder;", "intent", "Landroid/content/Intent;", "onCreate", "onDestroy", "registerFcmToken", "registerUsbReceiver", "startHeartbeat", "startSyncFlush", "Companion", "app_debug"})
public final class SyncService extends android.app.Service {
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.CoroutineScope scope = null;
    @org.jetbrains.annotations.Nullable()
    private android.content.BroadcastReceiver usbReceiver;
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String CHANNEL_ID = "pisotab_sync";
    public static final int NOTIF_ID = 2;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function3<? super java.lang.String, ? super java.lang.Integer, ? super java.lang.Double, kotlin.Unit> onStartSession;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onPauseSession;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onResumeSession;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function1<? super java.lang.String, kotlin.Unit> onEndSession;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function1<? super java.lang.Integer, kotlin.Unit> onAddTime;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function2<? super java.lang.Boolean, ? super java.lang.String, kotlin.Unit> onConnectionChange;
    
    /**
     * Fired when the cached license status changes — MainActivity uses this to update UI
     */
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function1<? super java.lang.String, kotlin.Unit> onLicenseStatusChange;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.service.SyncService.Companion Companion = null;
    
    public SyncService() {
        super();
    }
    
    private final com.pisotab.app.PisoTabApp getApp() {
        return null;
    }
    
    private final com.pisotab.app.data.local.AppDatabase getDb() {
        return null;
    }
    
    private final com.pisotab.app.data.remote.ApiService getApi() {
        return null;
    }
    
    @java.lang.Override()
    public void onCreate() {
    }
    
    private final void registerFcmToken() {
    }
    
    private final void connectSocket() {
    }
    
    private final void startHeartbeat() {
    }
    
    private final void startSyncFlush() {
    }
    
    private final android.app.Notification buildNotif() {
        return null;
    }
    
    private final void createChannel() {
    }
    
    private final void registerUsbReceiver() {
    }
    
    @java.lang.Override()
    public void onDestroy() {
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.Nullable()
    public android.os.IBinder onBind(@org.jetbrains.annotations.Nullable()
    android.content.Intent intent) {
        return null;
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000N\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0002\u0010\u000b\n\u0002\b\u000f\n\u0002\u0018\u0002\n\u0002\b\b\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0006\n\u0002\b\u0006\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0086T\u00a2\u0006\u0002\n\u0000R7\u0010\u0007\u001a\u001f\u0012\u0013\u0012\u00110\u0006\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(\u000b\u0012\u0004\u0012\u00020\f\u0018\u00010\bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\r\u0010\u000e\"\u0004\b\u000f\u0010\u0010RN\u0010\u0011\u001a6\u0012\u0013\u0012\u00110\u0013\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(\u0014\u0012\u0015\u0012\u0013\u0018\u00010\u0004\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(\u0015\u0012\u0004\u0012\u00020\f\u0018\u00010\u0012X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0016\u0010\u0017\"\u0004\b\u0018\u0010\u0019R7\u0010\u001a\u001a\u001f\u0012\u0013\u0012\u00110\u0004\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(\u001b\u0012\u0004\u0012\u00020\f\u0018\u00010\bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u001c\u0010\u000e\"\u0004\b\u001d\u0010\u0010R7\u0010\u001e\u001a\u001f\u0012\u0013\u0012\u00110\u0004\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(\u001f\u0012\u0004\u0012\u00020\f\u0018\u00010\bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b \u0010\u000e\"\u0004\b!\u0010\u0010R\"\u0010\"\u001a\n\u0012\u0004\u0012\u00020\f\u0018\u00010#X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b$\u0010%\"\u0004\b&\u0010\'R\"\u0010(\u001a\n\u0012\u0004\u0012\u00020\f\u0018\u00010#X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b)\u0010%\"\u0004\b*\u0010\'Ra\u0010+\u001aI\u0012\u0013\u0012\u00110\u0004\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(\u001b\u0012\u0013\u0012\u00110\u0006\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(-\u0012\u0013\u0012\u00110.\u00a2\u0006\f\b\t\u0012\b\b\n\u0012\u0004\b\b(/\u0012\u0004\u0012\u00020\f\u0018\u00010,X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b0\u00101\"\u0004\b2\u00103\u00a8\u00064"}, d2 = {"Lcom/pisotab/app/service/SyncService$Companion;", "", "()V", "CHANNEL_ID", "", "NOTIF_ID", "", "onAddTime", "Lkotlin/Function1;", "Lkotlin/ParameterName;", "name", "mins", "", "getOnAddTime", "()Lkotlin/jvm/functions/Function1;", "setOnAddTime", "(Lkotlin/jvm/functions/Function1;)V", "onConnectionChange", "Lkotlin/Function2;", "", "connected", "error", "getOnConnectionChange", "()Lkotlin/jvm/functions/Function2;", "setOnConnectionChange", "(Lkotlin/jvm/functions/Function2;)V", "onEndSession", "sessionId", "getOnEndSession", "setOnEndSession", "onLicenseStatusChange", "status", "getOnLicenseStatusChange", "setOnLicenseStatusChange", "onPauseSession", "Lkotlin/Function0;", "getOnPauseSession", "()Lkotlin/jvm/functions/Function0;", "setOnPauseSession", "(Lkotlin/jvm/functions/Function0;)V", "onResumeSession", "getOnResumeSession", "setOnResumeSession", "onStartSession", "Lkotlin/Function3;", "durationMins", "", "amountPaid", "getOnStartSession", "()Lkotlin/jvm/functions/Function3;", "setOnStartSession", "(Lkotlin/jvm/functions/Function3;)V", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function3<java.lang.String, java.lang.Integer, java.lang.Double, kotlin.Unit> getOnStartSession() {
            return null;
        }
        
        public final void setOnStartSession(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function3<? super java.lang.String, ? super java.lang.Integer, ? super java.lang.Double, kotlin.Unit> p0) {
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnPauseSession() {
            return null;
        }
        
        public final void setOnPauseSession(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnResumeSession() {
            return null;
        }
        
        public final void setOnResumeSession(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function1<java.lang.String, kotlin.Unit> getOnEndSession() {
            return null;
        }
        
        public final void setOnEndSession(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function1<? super java.lang.String, kotlin.Unit> p0) {
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function1<java.lang.Integer, kotlin.Unit> getOnAddTime() {
            return null;
        }
        
        public final void setOnAddTime(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function1<? super java.lang.Integer, kotlin.Unit> p0) {
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function2<java.lang.Boolean, java.lang.String, kotlin.Unit> getOnConnectionChange() {
            return null;
        }
        
        public final void setOnConnectionChange(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function2<? super java.lang.Boolean, ? super java.lang.String, kotlin.Unit> p0) {
        }
        
        /**
         * Fired when the cached license status changes — MainActivity uses this to update UI
         */
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function1<java.lang.String, kotlin.Unit> getOnLicenseStatusChange() {
            return null;
        }
        
        /**
         * Fired when the cached license status changes — MainActivity uses this to update UI
         */
        public final void setOnLicenseStatusChange(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function1<? super java.lang.String, kotlin.Unit> p0) {
        }
    }
}