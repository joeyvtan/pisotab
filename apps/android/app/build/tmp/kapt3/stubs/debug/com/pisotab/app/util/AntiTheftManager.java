package com.pisotab.app.util;

/**
 * Monitors charger and WiFi during an active session.
 * Triggers a loud alarm if either is disconnected (possible theft).
 * All behavior is controlled via PrefsManager settings.
 *
 * Uses applicationContext for all long-lived operations so monitoring
 * continues even after MainActivity is destroyed (customer presses Back).
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000d\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\u0010\u0002\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0007\n\u0002\u0018\u0002\n\u0002\b\f\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\b\u0010(\u001a\u00020\u0018H\u0002J\u0006\u0010\u000f\u001a\u00020\u0010J\u0006\u0010\u0011\u001a\u00020\u0004J\u0018\u0010)\u001a\u00020\u00182\u0006\u0010*\u001a\u00020\b2\u0006\u0010!\u001a\u00020\u0004H\u0002J\u000e\u0010+\u001a\u00020\u00182\u0006\u0010,\u001a\u00020\bJ\u000e\u0010-\u001a\u00020\u00182\u0006\u0010,\u001a\u00020\bJ\u0006\u0010.\u001a\u00020\u0018J\u0010\u0010/\u001a\u00020\u00182\u0006\u0010!\u001a\u00020\u0004H\u0002J\b\u00100\u001a\u00020\u0018H\u0002J\b\u00101\u001a\u00020\u0018H\u0002J\b\u00102\u001a\u00020\u0018H\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082T\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0007\u001a\u0004\u0018\u00010\bX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\t\u001a\u0004\u0018\u00010\nX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u000b\u001a\u0004\u0018\u00010\fX\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\r\u001a\u00020\u000eX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000f\u001a\u00020\u0010X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0011\u001a\u00020\u0004X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0012\u001a\u0004\u0018\u00010\u0013X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\u0010\u0010\u0014\u001a\u0004\u0018\u00010\u0015X\u0082\u000e\u00a2\u0006\u0002\n\u0000R\"\u0010\u0016\u001a\n\u0012\u0004\u0012\u00020\u0018\u0018\u00010\u0017X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0019\u0010\u001a\"\u0004\b\u001b\u0010\u001cR7\u0010\u001d\u001a\u001f\u0012\u0013\u0012\u00110\u0004\u00a2\u0006\f\b\u001f\u0012\b\b \u0012\u0004\b\b(!\u0012\u0004\u0012\u00020\u0018\u0018\u00010\u001eX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\"\u0010#\"\u0004\b$\u0010%R\u0010\u0010&\u001a\u0004\u0018\u00010\'X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u00063"}, d2 = {"Lcom/pisotab/app/util/AntiTheftManager;", "", "()V", "ALARM_CHANNEL_ID", "", "ALARM_NOTIF_ID", "", "appContext", "Landroid/content/Context;", "chargerReceiver", "Landroid/content/BroadcastReceiver;", "connectivityManager", "Landroid/net/ConnectivityManager;", "handler", "Landroid/os/Handler;", "isAlarming", "", "lastAlarmReason", "mediaPlayer", "Landroid/media/MediaPlayer;", "networkCallback", "Landroid/net/ConnectivityManager$NetworkCallback;", "onAlarmStopped", "Lkotlin/Function0;", "", "getOnAlarmStopped", "()Lkotlin/jvm/functions/Function0;", "setOnAlarmStopped", "(Lkotlin/jvm/functions/Function0;)V", "onAlarmTriggered", "Lkotlin/Function1;", "Lkotlin/ParameterName;", "name", "reason", "getOnAlarmTriggered", "()Lkotlin/jvm/functions/Function1;", "setOnAlarmTriggered", "(Lkotlin/jvm/functions/Function1;)V", "wifiLostRunnable", "Ljava/lang/Runnable;", "createAlarmChannel", "postAlarmNotification", "ctx", "start", "context", "stop", "stopAlarm", "triggerAlarm", "unregisterReceivers", "watchCharger", "watchWifi", "app_debug"})
public final class AntiTheftManager {
    @org.jetbrains.annotations.Nullable()
    private static android.media.MediaPlayer mediaPlayer;
    @org.jetbrains.annotations.Nullable()
    private static android.net.ConnectivityManager connectivityManager;
    @org.jetbrains.annotations.Nullable()
    private static android.net.ConnectivityManager.NetworkCallback networkCallback;
    @org.jetbrains.annotations.Nullable()
    private static android.content.BroadcastReceiver chargerReceiver;
    @org.jetbrains.annotations.NotNull()
    private static final android.os.Handler handler = null;
    @org.jetbrains.annotations.Nullable()
    private static java.lang.Runnable wifiLostRunnable;
    @org.jetbrains.annotations.Nullable()
    private static android.content.Context appContext;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function1<? super java.lang.String, kotlin.Unit> onAlarmTriggered;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onAlarmStopped;
    private static boolean isAlarming = false;
    @org.jetbrains.annotations.NotNull()
    private static java.lang.String lastAlarmReason = "";
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String ALARM_CHANNEL_ID = "pisotab_alarm";
    private static final int ALARM_NOTIF_ID = 99;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.AntiTheftManager INSTANCE = null;
    
    private AntiTheftManager() {
        super();
    }
    
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function1<java.lang.String, kotlin.Unit> getOnAlarmTriggered() {
        return null;
    }
    
    public final void setOnAlarmTriggered(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function1<? super java.lang.String, kotlin.Unit> p0) {
    }
    
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnAlarmStopped() {
        return null;
    }
    
    public final void setOnAlarmStopped(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
    }
    
    public final void start(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String lastAlarmReason() {
        return null;
    }
    
    private final void createAlarmChannel() {
    }
    
    public final void stop(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    private final void unregisterReceivers() {
    }
    
    private final void watchCharger() {
    }
    
    private final void watchWifi() {
    }
    
    private final void triggerAlarm(java.lang.String reason) {
    }
    
    private final void postAlarmNotification(android.content.Context ctx, java.lang.String reason) {
    }
    
    public final void stopAlarm() {
    }
    
    public final boolean isAlarming() {
        return false;
    }
}