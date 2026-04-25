package com.pisotab.app.ui;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000`\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\b\n\u0002\b\u0003\n\u0002\u0010\u000e\n\u0002\b\u0007\n\u0002\u0010\u0006\n\u0002\b\u0006\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u000e\u0010\u001a\u001a\u00020\u001b2\u0006\u0010\u001c\u001a\u00020\u001dJ\u0006\u0010\u001e\u001a\u00020\u001bJ\u000e\u0010\u001f\u001a\u00020\u001b2\u0006\u0010 \u001a\u00020!J\u000e\u0010\"\u001a\u00020\u001b2\u0006\u0010#\u001a\u00020\u001dJ\u0006\u0010$\u001a\u00020\u001bJ\u0006\u0010%\u001a\u00020\u001bJ.\u0010&\u001a\u00020\u001b2\u0006\u0010\'\u001a\u00020\u001d2\u0006\u0010(\u001a\u00020)2\n\b\u0002\u0010*\u001a\u0004\u0018\u00010!2\n\b\u0002\u0010+\u001a\u0004\u0018\u00010!J\u000e\u0010,\u001a\u00020\u001b2\u0006\u0010-\u001a\u00020!J\u0006\u0010.\u001a\u00020\u001bR\u0014\u0010\u0005\u001a\b\u0012\u0004\u0012\u00020\u00070\u0006X\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0014\u0010\b\u001a\u00020\t8BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\n\u0010\u000bR\u000e\u0010\f\u001a\u00020\rX\u0082\u0004\u00a2\u0006\u0002\n\u0000R\u0014\u0010\u000e\u001a\u00020\u000f8BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\u0010\u0010\u0011R\u0011\u0010\u0012\u001a\u00020\u00138F\u00a2\u0006\u0006\u001a\u0004\b\u0014\u0010\u0015R\u0017\u0010\u0016\u001a\b\u0012\u0004\u0012\u00020\u00070\u0017\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0018\u0010\u0019\u00a8\u0006/"}, d2 = {"Lcom/pisotab/app/ui/MainViewModel;", "Landroidx/lifecycle/AndroidViewModel;", "application", "Landroid/app/Application;", "(Landroid/app/Application;)V", "_sessionState", "Lkotlinx/coroutines/flow/MutableStateFlow;", "Lcom/pisotab/app/ui/SessionState;", "api", "Lcom/pisotab/app/data/remote/ApiService;", "getApi", "()Lcom/pisotab/app/data/remote/ApiService;", "app", "Lcom/pisotab/app/PisoTabApp;", "db", "Lcom/pisotab/app/data/local/AppDatabase;", "getDb", "()Lcom/pisotab/app/data/local/AppDatabase;", "prefs", "Lcom/pisotab/app/util/PrefsManager;", "getPrefs", "()Lcom/pisotab/app/util/PrefsManager;", "sessionState", "Lkotlinx/coroutines/flow/StateFlow;", "getSessionState", "()Lkotlinx/coroutines/flow/StateFlow;", "addTime", "", "addedMins", "", "endSession", "endSessionById", "targetSessionId", "", "onTimeTick", "newSecs", "pauseSession", "resumeSession", "startSession", "durationMins", "amountPaid", "", "pricingTierId", "serverSessionId", "startUsbSession", "sessionId", "syncFromDb", "app_debug"})
public final class MainViewModel extends androidx.lifecycle.AndroidViewModel {
    @org.jetbrains.annotations.NotNull()
    private final com.pisotab.app.PisoTabApp app = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.MutableStateFlow<com.pisotab.app.ui.SessionState> _sessionState = null;
    @org.jetbrains.annotations.NotNull()
    private final kotlinx.coroutines.flow.StateFlow<com.pisotab.app.ui.SessionState> sessionState = null;
    
    public MainViewModel(@org.jetbrains.annotations.NotNull()
    android.app.Application application) {
        super(null);
    }
    
    private final com.pisotab.app.data.local.AppDatabase getDb() {
        return null;
    }
    
    private final com.pisotab.app.data.remote.ApiService getApi() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final com.pisotab.app.util.PrefsManager getPrefs() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.StateFlow<com.pisotab.app.ui.SessionState> getSessionState() {
        return null;
    }
    
    public final void startSession(int durationMins, double amountPaid, @org.jetbrains.annotations.Nullable()
    java.lang.String pricingTierId, @org.jetbrains.annotations.Nullable()
    java.lang.String serverSessionId) {
    }
    
    public final void startUsbSession(@org.jetbrains.annotations.NotNull()
    java.lang.String sessionId) {
    }
    
    public final void pauseSession() {
    }
    
    public final void resumeSession() {
    }
    
    public final void endSession() {
    }
    
    public final void addTime(int addedMins) {
    }
    
    public final void syncFromDb() {
    }
    
    /**
     * End the session ONLY if [targetSessionId] matches the current active session.
     * Used by socket cmd:end to prevent a delayed echo from the backend (which re-emits cmd:end
     * when the device itself calls api.endSession) from killing a newly started session.
     * The check runs inside the coroutine so it is serialized after any in-flight startSession.
     */
    public final void endSessionById(@org.jetbrains.annotations.NotNull()
    java.lang.String targetSessionId) {
    }
    
    public final void onTimeTick(int newSecs) {
    }
}