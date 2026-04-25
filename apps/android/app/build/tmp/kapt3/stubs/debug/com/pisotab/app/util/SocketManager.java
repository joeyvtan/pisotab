package com.pisotab.app.util;

/**
 * Manages the Socket.IO connection to the backend.
 * Listens for commands sent from the admin dashboard:
 *  cmd:start, cmd:pause, cmd:resume, cmd:end, cmd:add_time, cmd:lock, cmd:unlock
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000^\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\u000b\n\u0000\n\u0002\u0018\u0002\n\u0002\u0010\b\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\b\u0005\n\u0002\u0018\u0002\n\u0002\b\u0004\n\u0002\u0018\u0002\n\u0002\b\u000b\n\u0002\u0018\u0002\n\u0002\b\u0011\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u0006\n\u0002\b\u0006\n\u0002\u0018\u0002\n\u0002\b\u0007\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u0016\u0010@\u001a\u00020\r2\u0006\u0010A\u001a\u00020\u00042\u0006\u0010B\u001a\u00020\u0004J\u0006\u0010C\u001a\u00020\rJ\u000e\u0010D\u001a\u00020\r2\u0006\u0010B\u001a\u00020\u0004J\u0006\u0010E\u001a\u00020\u0006R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082\u000e\u00a2\u0006\u0002\n\u0000R7\u0010\u0007\u001a\u001f\u0012\u0013\u0012\u00110\t\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b(\f\u0012\u0004\u0012\u00020\r\u0018\u00010\bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u000e\u0010\u000f\"\u0004\b\u0010\u0010\u0011R7\u0010\u0012\u001a\u001f\u0012\u0013\u0012\u00110\u0013\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b(\u0014\u0012\u0004\u0012\u00020\r\u0018\u00010\bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u0015\u0010\u000f\"\u0004\b\u0016\u0010\u0011RN\u0010\u0017\u001a6\u0012\u0013\u0012\u00110\u0006\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b(\u0019\u0012\u0015\u0012\u0013\u0018\u00010\u0004\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b(\u001a\u0012\u0004\u0012\u00020\r\u0018\u00010\u0018X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b\u001b\u0010\u001c\"\u0004\b\u001d\u0010\u001eR7\u0010\u001f\u001a\u001f\u0012\u0013\u0012\u00110\u0004\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b( \u0012\u0004\u0012\u00020\r\u0018\u00010\bX\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b!\u0010\u000f\"\u0004\b\"\u0010\u0011R\"\u0010#\u001a\n\u0012\u0004\u0012\u00020\r\u0018\u00010$X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b%\u0010&\"\u0004\b\'\u0010(R\"\u0010)\u001a\n\u0012\u0004\u0012\u00020\r\u0018\u00010$X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b*\u0010&\"\u0004\b+\u0010(R\"\u0010,\u001a\n\u0012\u0004\u0012\u00020\r\u0018\u00010$X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b-\u0010&\"\u0004\b.\u0010(R\"\u0010/\u001a\n\u0012\u0004\u0012\u00020\r\u0018\u00010$X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b0\u0010&\"\u0004\b1\u0010(R\"\u00102\u001a\n\u0012\u0004\u0012\u00020\r\u0018\u00010$X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b3\u0010&\"\u0004\b4\u0010(Ra\u00105\u001aI\u0012\u0013\u0012\u00110\u0004\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b( \u0012\u0013\u0012\u00110\t\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b(7\u0012\u0013\u0012\u001108\u00a2\u0006\f\b\n\u0012\b\b\u000b\u0012\u0004\b\b(9\u0012\u0004\u0012\u00020\r\u0018\u000106X\u0086\u000e\u00a2\u0006\u000e\n\u0000\u001a\u0004\b:\u0010;\"\u0004\b<\u0010=R\u0010\u0010>\u001a\u0004\u0018\u00010?X\u0082\u000e\u00a2\u0006\u0002\n\u0000\u00a8\u0006F"}, d2 = {"Lcom/pisotab/app/util/SocketManager;", "", "()V", "TAG", "", "isConnecting", "", "onAddTime", "Lkotlin/Function1;", "", "Lkotlin/ParameterName;", "name", "addedMins", "", "getOnAddTime", "()Lkotlin/jvm/functions/Function1;", "setOnAddTime", "(Lkotlin/jvm/functions/Function1;)V", "onApplyConfig", "Lorg/json/JSONObject;", "config", "getOnApplyConfig", "setOnApplyConfig", "onConnectionChange", "Lkotlin/Function2;", "connected", "error", "getOnConnectionChange", "()Lkotlin/jvm/functions/Function2;", "setOnConnectionChange", "(Lkotlin/jvm/functions/Function2;)V", "onEndSession", "sessionId", "getOnEndSession", "setOnEndSession", "onLockScreen", "Lkotlin/Function0;", "getOnLockScreen", "()Lkotlin/jvm/functions/Function0;", "setOnLockScreen", "(Lkotlin/jvm/functions/Function0;)V", "onPauseSession", "getOnPauseSession", "setOnPauseSession", "onRestartApp", "getOnRestartApp", "setOnRestartApp", "onRestartDevice", "getOnRestartDevice", "setOnRestartDevice", "onResumeSession", "getOnResumeSession", "setOnResumeSession", "onStartSession", "Lkotlin/Function3;", "durationMins", "", "amountPaid", "getOnStartSession", "()Lkotlin/jvm/functions/Function3;", "setOnStartSession", "(Lkotlin/jvm/functions/Function3;)V", "socket", "Lio/socket/client/Socket;", "connect", "serverUrl", "deviceId", "disconnect", "emitConfigAck", "isConnected", "app_debug"})
public final class SocketManager {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String TAG = "SocketManager";
    @org.jetbrains.annotations.Nullable()
    private static io.socket.client.Socket socket;
    private static boolean isConnecting = false;
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
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function1<? super org.json.JSONObject, kotlin.Unit> onApplyConfig;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onRestartApp;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onRestartDevice;
    @org.jetbrains.annotations.Nullable()
    private static kotlin.jvm.functions.Function0<kotlin.Unit> onLockScreen;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.SocketManager INSTANCE = null;
    
    private SocketManager() {
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
    
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function1<org.json.JSONObject, kotlin.Unit> getOnApplyConfig() {
        return null;
    }
    
    public final void setOnApplyConfig(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function1<? super org.json.JSONObject, kotlin.Unit> p0) {
    }
    
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnRestartApp() {
        return null;
    }
    
    public final void setOnRestartApp(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
    }
    
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnRestartDevice() {
        return null;
    }
    
    public final void setOnRestartDevice(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
    }
    
    @org.jetbrains.annotations.Nullable()
    public final kotlin.jvm.functions.Function0<kotlin.Unit> getOnLockScreen() {
        return null;
    }
    
    public final void setOnLockScreen(@org.jetbrains.annotations.Nullable()
    kotlin.jvm.functions.Function0<kotlin.Unit> p0) {
    }
    
    public final void connect(@org.jetbrains.annotations.NotNull()
    java.lang.String serverUrl, @org.jetbrains.annotations.NotNull()
    java.lang.String deviceId) {
    }
    
    public final void emitConfigAck(@org.jetbrains.annotations.NotNull()
    java.lang.String deviceId) {
    }
    
    public final void disconnect() {
    }
    
    public final boolean isConnected() {
        return false;
    }
}