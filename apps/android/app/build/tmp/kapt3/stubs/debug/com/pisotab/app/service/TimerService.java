package com.pisotab.app.service;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0084\u0001\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u000e\u0018\u0000 @2\u00020\u0001:\u0001@B\u0005\u00a2\u0006\u0002\u0010\u0002J\b\u0010$\u001a\u00020%H\u0002J\b\u0010&\u001a\u00020\'H\u0002J\b\u0010(\u001a\u00020\'H\u0002J\b\u0010)\u001a\u00020\'H\u0002J\u0010\u0010*\u001a\u00020+2\u0006\u0010,\u001a\u00020\u0016H\u0002J\u0010\u0010-\u001a\u00020\u001b2\u0006\u0010.\u001a\u00020\u001dH\u0002J\n\u0010/\u001a\u0004\u0018\u00010\u001bH\u0002J\u0014\u00100\u001a\u0004\u0018\u0001012\b\u00102\u001a\u0004\u0018\u000103H\u0016J\b\u00104\u001a\u00020\'H\u0016J\b\u00105\u001a\u00020\'H\u0016J\b\u00106\u001a\u00020\'H\u0002J\"\u00107\u001a\u00020\u001d2\b\u00102\u001a\u0004\u0018\u0001032\u0006\u00108\u001a\u00020\u001d2\u0006\u00109\u001a\u00020\u001dH\u0016J\b\u0010:\u001a\u00020\'H\u0002J\b\u0010;\u001a\u00020\'H\u0002J\b\u0010<\u001a\u00020\'H\u0002J\b\u0010=\u001a\u00020\'H\u0002J\b\u0010>\u001a\u00020\'H\u0002J\b\u0010?\u001a\u00020\'H\u0002R\u0014\u0010\u0003\u001a\u00020\u00048BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\u0005\u0010\u0006R\u0014\u0010\u0007\u001a\u00020\b8BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\t\u0010\nR\u0014\u0010\u000b\u001a\u00020\f8BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\r\u0010\u000eR\u0010\u0010\u000f\u001a\u0004\u0018\u00010\u0010X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0011\u001a\u0004\u0018\u00010\u0012X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0013\u001a\u0004\u0018\u00010\u0014X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0015\u001a\u00020\u0016X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0017\u001a\u00020\u0016X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0018\u001a\u00020\u0019X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u001a\u001a\u00020\u001bX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u001c\u001a\u00020\u001dX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u001e\u001a\u00020\u001dX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u001f\u001a\u0004\u0018\u00010 X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010!\u001a\u0004\u0018\u00010 X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\"\u001a\u0004\u0018\u00010#X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006A"}, d2 = {"Lcom/pisotab/app/service/TimerService;", "Landroid/app/Service;", "()V", "api", "Lcom/pisotab/app/data/remote/ApiService;", "getApi", "()Lcom/pisotab/app/data/remote/ApiService;", "app", "Lcom/pisotab/app/PisoTabApp;", "getApp", "()Lcom/pisotab/app/PisoTabApp;", "db", "Lcom/pisotab/app/data/local/AppDatabase;", "getDb", "()Lcom/pisotab/app/data/local/AppDatabase;", "floatingParams", "Landroid/view/WindowManager$LayoutParams;", "floatingTimerText", "Landroid/widget/TextView;", "floatingView", "Landroid/view/View;", "hasBeepedAt10", "", "isPaused", "scope", "Lkotlinx/coroutines/CoroutineScope;", "sessionId", "", "syncCounter", "", "timeRemainingSecs", "timerJob", "Lkotlinx/coroutines/Job;", "whitelistJob", "windowManager", "Landroid/view/WindowManager;", "buildNotification", "Landroid/app/Notification;", "createFloatingView", "", "createNotificationChannel", "endSession", "floatBg", "Landroid/graphics/drawable/GradientDrawable;", "urgent", "floatFmt", "secs", "getForegroundApp", "onBind", "Landroid/os/IBinder;", "intent", "Landroid/content/Intent;", "onCreate", "onDestroy", "onSessionExpired", "onStartCommand", "flags", "startId", "removeFloatingView", "startTimer", "startUsbTimer", "startWhitelistEnforcement", "updateFloatingView", "updateNotification", "Companion", "app_debug"})
public final class TimerService extends android.app.Service {
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_START = "ACTION_START";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_START_USB = "ACTION_START_USB";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_PAUSE = "ACTION_PAUSE";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_RESUME = "ACTION_RESUME";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_END = "ACTION_END";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String ACTION_ADD_TIME = "ACTION_ADD_TIME";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String EXTRA_SESSION_ID = "session_id";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String EXTRA_DURATION_SECS = "duration_secs";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String EXTRA_ADD_SECS = "add_secs";
    @org.jetbrains.annotations.NotNull()
    public static final java.lang.String CHANNEL_ID = "pisotab_timer";
    public static final int NOTIF_ID = 1;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function1<? super java.lang.Integer, kotlin.Unit> onTick;
    private static boolean isRunning = false;
    private static boolean isUsbMode = false;
    private static int currentSecs = 0;
    @org.jetbrains.annotations.NotNull()
    private static java.lang.String currentSessionId = "";
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.CoroutineScope scope = null;
    @org.jetbrains.annotations.Nullable()
    private kotlinx.coroutines.Job timerJob;
    @org.jetbrains.annotations.Nullable()
    private kotlinx.coroutines.Job whitelistJob;
    private int timeRemainingSecs = 0;
    @org.jetbrains.annotations.NotNull()
    private java.lang.String sessionId = "";
    private boolean isPaused = false;
    private int syncCounter = 0;
    @org.jetbrains.annotations.Nullable()
    private android.view.WindowManager windowManager;
    @org.jetbrains.annotations.Nullable()
    private android.view.View floatingView;
    @org.jetbrains.annotations.Nullable()
    private android.widget.TextView floatingTimerText;
    @org.jetbrains.annotations.Nullable()
    private android.view.WindowManager.LayoutParams floatingParams;
    private boolean hasBeepedAt10 = false;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.service.TimerService.Companion Companion = null;
    
    public TimerService() {
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
    
    @java.lang.Override()
    public int onStartCommand(@org.jetbrains.annotations.Nullable()
    android.content.Intent intent, int flags, int startId) {
        return 0;
    }
    
    private final void startTimer() {
    }
    
    private final void startUsbTimer() {
    }
    
    private final void startWhitelistEnforcement() {
    }
    
    private final java.lang.String getForegroundApp() {
        return null;
    }
    
    private final void onSessionExpired() {
    }
    
    private final void endSession() {
    }
    
    private final void createFloatingView() {
    }
    
    private final void updateFloatingView() {
    }
    
    private final void removeFloatingView() {
    }
    
    private final android.graphics.drawable.GradientDrawable floatBg(boolean urgent) {
        return null;
    }
    
    private final java.lang.String floatFmt(int secs) {
        return null;
    }
    
    private final android.app.Notification buildNotification() {
        return null;
    }
    
    private final void updateNotification() {
    }
    
    private final void createNotificationChannel() {
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.Nullable()
    public android.os.IBinder onBind(@org.jetbrains.annotations.Nullable()
    android.content.Intent intent) {
        return null;
    }
    
    @java.lang.Override()
    public void onDestroy() {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00008\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\n\n\u0002\u0010\b\n\u0002\b\u000b\n\u0002\u0010\u000b\n\u0002\b\u0006\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\b\u0005\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\t\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000b\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\f\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\r\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000e\u001a\u00020\u000fX\u0086T\u00a2\u0006\u0002\n\u0000R\u001a\u0010\u0010\u001a\u00020\u000fX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0011\u0010\u0012\"\u0004\b\u0013\u0010\u0014R\u001a\u0010\u0015\u001a\u00020\u0004X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0016\u0010\u0017\"\u0004\b\u0018\u0010\u0019R\u001a\u0010\u001a\u001a\u00020\u001bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u001a\u0010\u001c\"\u0004\b\u001d\u0010\u001eR\u001a\u0010\u001f\u001a\u00020\u001bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u001f\u0010\u001c\"\u0004\b \u0010\u001eR7\u0010!\u001a\u001f\u0012\u0013\u0012\u00110\u000f\u00a2\u0006\f\b#\u0012\b\b$\u0012\u0004\b\b(%\u0012\u0004\u0012\u00020&\u0018\u00010\"X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\'\u0010(\"\u0004\b)\u0010*\u00a8\u0006+"}, d2 = {"Lcom/pisotab/app/service/TimerService$Companion;", "", "()V", "ACTION_ADD_TIME", "", "ACTION_END", "ACTION_PAUSE", "ACTION_RESUME", "ACTION_START", "ACTION_START_USB", "CHANNEL_ID", "EXTRA_ADD_SECS", "EXTRA_DURATION_SECS", "EXTRA_SESSION_ID", "NOTIF_ID", "", "currentSecs", "getCurrentSecs", "()I", "setCurrentSecs", "(I)V", "currentSessionId", "getCurrentSessionId", "()Ljava/lang/String;", "setCurrentSessionId", "(Ljava/lang/String;)V", "isRunning", "", "()Z", "setRunning", "(Z)V", "isUsbMode", "setUsbMode", "onTick", "Lkotlin/Function1;", "Lkotlin/ParameterName;", "name", "secs", "", "getOnTick", "()Lkotlin/jvm/functions/Function1;", "setOnTick", "(Lkotlin/jvm/functions/Function1;)V", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        @org.jetbrains.annotations.Nullable()
        public final kotlin.jvm.functions.Function1<java.lang.Integer, kotlin.Unit> getOnTick() {
            return null;
        }
        
        public final void setOnTick(@org.jetbrains.annotations.Nullable()
        kotlin.jvm.functions.Function1<? super java.lang.Integer, kotlin.Unit> p0) {
        }
        
        public final boolean isRunning() {
            return false;
        }
        
        public final void setRunning(boolean p0) {
        }
        
        public final boolean isUsbMode() {
            return false;
        }
        
        public final void setUsbMode(boolean p0) {
        }
        
        public final int getCurrentSecs() {
            return 0;
        }
        
        public final void setCurrentSecs(int p0) {
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.lang.String getCurrentSessionId() {
            return null;
        }
        
        public final void setCurrentSessionId(@org.jetbrains.annotations.NotNull()
        java.lang.String p0) {
        }
    }
}