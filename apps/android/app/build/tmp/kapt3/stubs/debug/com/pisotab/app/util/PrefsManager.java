package com.pisotab.app.util;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000B\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u000b\n\u0002\u0010\b\n\u0002\b\u0005\n\u0002\u0010\u000b\n\u0002\b\u0011\n\u0002\u0010\"\n\u0002\b;\n\u0002\u0018\u0002\n\u0002\b\u0006\n\u0002\u0010\u0007\n\u0002\b\t\u0018\u00002\u00020\u0001B\r\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004R$\u0010\u0007\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\b\u0010\t\"\u0004\b\n\u0010\u000bR$\u0010\f\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\r\u0010\t\"\u0004\b\u000e\u0010\u000bR$\u0010\u000f\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\u0010\u0010\t\"\u0004\b\u0011\u0010\u000bR$\u0010\u0013\u001a\u00020\u00122\u0006\u0010\u0005\u001a\u00020\u00128F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\u0014\u0010\u0015\"\u0004\b\u0016\u0010\u0017R$\u0010\u0019\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\u001a\u0010\u001b\"\u0004\b\u001c\u0010\u001dR$\u0010\u001e\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\u001f\u0010\u001b\"\u0004\b \u0010\u001dR$\u0010!\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b\"\u0010\u001b\"\u0004\b#\u0010\u001dR$\u0010$\u001a\u00020\u00122\u0006\u0010\u0005\u001a\u00020\u00128F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b%\u0010\u0015\"\u0004\b&\u0010\u0017R$\u0010\'\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b(\u0010\t\"\u0004\b)\u0010\u000bR0\u0010+\u001a\b\u0012\u0004\u0012\u00020\u00060*2\f\u0010\u0005\u001a\b\u0012\u0004\u0012\u00020\u00060*8F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b,\u0010-\"\u0004\b.\u0010/R$\u00100\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b1\u0010\t\"\u0004\b2\u0010\u000bR$\u00103\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b4\u0010\t\"\u0004\b5\u0010\u000bR$\u00106\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b7\u0010\t\"\u0004\b8\u0010\u000bR$\u00109\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b:\u0010\t\"\u0004\b;\u0010\u000bR$\u0010<\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b=\u0010\t\"\u0004\b>\u0010\u000bR$\u0010?\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b@\u0010\t\"\u0004\bA\u0010\u000bR$\u0010B\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bC\u0010\u001b\"\u0004\bD\u0010\u001dR$\u0010E\u001a\u00020\u00122\u0006\u0010\u0005\u001a\u00020\u00128F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bF\u0010\u0015\"\u0004\bG\u0010\u0017R$\u0010H\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bI\u0010\t\"\u0004\bJ\u0010\u000bR$\u0010K\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bL\u0010\t\"\u0004\bM\u0010\u000bR$\u0010N\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bO\u0010\u001b\"\u0004\bP\u0010\u001dR\u0011\u0010Q\u001a\u00020\u00188F\u00a2\u0006\u0006\u001a\u0004\bQ\u0010\u001bR$\u0010R\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bR\u0010\u001b\"\u0004\bS\u0010\u001dR$\u0010T\u001a\u00020\u00182\u0006\u0010\u0005\u001a\u00020\u00188F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bT\u0010\u001b\"\u0004\bU\u0010\u001dR$\u0010V\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bW\u0010\t\"\u0004\bX\u0010\u000bR$\u0010Y\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bZ\u0010\t\"\u0004\b[\u0010\u000bR$\u0010\\\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b]\u0010\t\"\u0004\b^\u0010\u000bR$\u0010_\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\b`\u0010\t\"\u0004\ba\u0010\u000bR$\u0010b\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bc\u0010\t\"\u0004\bd\u0010\u000bR\u000e\u0010e\u001a\u00020fX\u0082\u0004\u00a2\u0006\u0002\n\u0000R$\u0010g\u001a\u00020\u00062\u0006\u0010\u0005\u001a\u00020\u00068F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bh\u0010\t\"\u0004\bi\u0010\u000bR$\u0010j\u001a\u00020\u00122\u0006\u0010\u0005\u001a\u00020\u00128F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bk\u0010\u0015\"\u0004\bl\u0010\u0017R$\u0010n\u001a\u00020m2\u0006\u0010\u0005\u001a\u00020m8F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bo\u0010p\"\u0004\bq\u0010rR$\u0010s\u001a\u00020\u00122\u0006\u0010\u0005\u001a\u00020\u00128F@FX\u0086\u000e\u00a2\u0006\f\u001a\u0004\bt\u0010\u0015\"\u0004\bu\u0010\u0017\u00a8\u0006v"}, d2 = {"Lcom/pisotab/app/util/PrefsManager;", "", "context", "Landroid/content/Context;", "(Landroid/content/Context;)V", "v", "", "accentColor", "getAccentColor", "()Ljava/lang/String;", "setAccentColor", "(Ljava/lang/String;)V", "activeSessionId", "getActiveSessionId", "setActiveSessionId", "adminPin", "getAdminPin", "setAdminPin", "", "alarmDelaySeconds", "getAlarmDelaySeconds", "()I", "setAlarmDelaySeconds", "(I)V", "", "alarmOnChargerDisconnect", "getAlarmOnChargerDisconnect", "()Z", "setAlarmOnChargerDisconnect", "(Z)V", "alarmOnWifiDisconnect", "getAlarmOnWifiDisconnect", "setAlarmOnWifiDisconnect", "alarmOnlyDuringSession", "getAlarmOnlyDuringSession", "setAlarmOnlyDuringSession", "alarmSoundType", "getAlarmSoundType", "setAlarmSoundType", "alarmSoundUri", "getAlarmSoundUri", "setAlarmSoundUri", "", "allowedPackages", "getAllowedPackages", "()Ljava/util/Set;", "setAllowedPackages", "(Ljava/util/Set;)V", "backendPassword", "getBackendPassword", "setBackendPassword", "backendToken", "getBackendToken", "setBackendToken", "backendUsername", "getBackendUsername", "setBackendUsername", "businessName", "getBusinessName", "setBusinessName", "coinRates", "getCoinRates", "setCoinRates", "connectionMode", "getConnectionMode", "setConnectionMode", "deepFreezeEnabled", "getDeepFreezeEnabled", "setDeepFreezeEnabled", "deepFreezeGracePeriodSecs", "getDeepFreezeGracePeriodSecs", "setDeepFreezeGracePeriodSecs", "deviceId", "getDeviceId", "setDeviceId", "deviceName", "getDeviceName", "setDeviceName", "floatingTimerEnabled", "getFloatingTimerEnabled", "setFloatingTimerEnabled", "isConfigured", "isDarkMode", "setDarkMode", "isKioskModeEnabled", "setKioskModeEnabled", "landscapeWallpaperUri", "getLandscapeWallpaperUri", "setLandscapeWallpaperUri", "licenseKey", "getLicenseKey", "setLicenseKey", "licenseStatus", "getLicenseStatus", "setLicenseStatus", "lockScreenAudioUri", "getLockScreenAudioUri", "setLockScreenAudioUri", "portraitWallpaperUri", "getPortraitWallpaperUri", "setPortraitWallpaperUri", "prefs", "Landroid/content/SharedPreferences;", "serverUrl", "getServerUrl", "setServerUrl", "themeId", "getThemeId", "setThemeId", "", "timerRatePerMinute", "getTimerRatePerMinute", "()F", "setTimerRatePerMinute", "(F)V", "timerSecondsPerCoin", "getTimerSecondsPerCoin", "setTimerSecondsPerCoin", "app_debug"})
public final class PrefsManager {
    @org.jetbrains.annotations.NotNull()
    private final android.content.SharedPreferences prefs = null;
    
    public PrefsManager(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getBackendToken() {
        return null;
    }
    
    public final void setBackendToken(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getBackendUsername() {
        return null;
    }
    
    public final void setBackendUsername(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getBackendPassword() {
        return null;
    }
    
    public final void setBackendPassword(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getServerUrl() {
        return null;
    }
    
    public final void setServerUrl(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getDeviceId() {
        return null;
    }
    
    public final void setDeviceId(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getDeviceName() {
        return null;
    }
    
    public final void setDeviceName(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getActiveSessionId() {
        return null;
    }
    
    public final void setActiveSessionId(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final boolean isConfigured() {
        return false;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getAdminPin() {
        return null;
    }
    
    public final void setAdminPin(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final boolean isKioskModeEnabled() {
        return false;
    }
    
    public final void setKioskModeEnabled(boolean v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getConnectionMode() {
        return null;
    }
    
    public final void setConnectionMode(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final float getTimerRatePerMinute() {
        return 0.0F;
    }
    
    public final void setTimerRatePerMinute(float v) {
    }
    
    public final int getTimerSecondsPerCoin() {
        return 0;
    }
    
    public final void setTimerSecondsPerCoin(int v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getCoinRates() {
        return null;
    }
    
    public final void setCoinRates(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final boolean getAlarmOnWifiDisconnect() {
        return false;
    }
    
    public final void setAlarmOnWifiDisconnect(boolean v) {
    }
    
    public final boolean getAlarmOnChargerDisconnect() {
        return false;
    }
    
    public final void setAlarmOnChargerDisconnect(boolean v) {
    }
    
    public final boolean getAlarmOnlyDuringSession() {
        return false;
    }
    
    public final void setAlarmOnlyDuringSession(boolean v) {
    }
    
    public final int getAlarmDelaySeconds() {
        return 0;
    }
    
    public final void setAlarmDelaySeconds(int v) {
    }
    
    public final int getAlarmSoundType() {
        return 0;
    }
    
    public final void setAlarmSoundType(int v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getAlarmSoundUri() {
        return null;
    }
    
    public final void setAlarmSoundUri(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final boolean getFloatingTimerEnabled() {
        return false;
    }
    
    public final void setFloatingTimerEnabled(boolean v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getBusinessName() {
        return null;
    }
    
    public final void setBusinessName(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final boolean isDarkMode() {
        return false;
    }
    
    public final void setDarkMode(boolean v) {
    }
    
    public final int getThemeId() {
        return 0;
    }
    
    public final void setThemeId(int v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getAccentColor() {
        return null;
    }
    
    public final void setAccentColor(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getPortraitWallpaperUri() {
        return null;
    }
    
    public final void setPortraitWallpaperUri(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getLandscapeWallpaperUri() {
        return null;
    }
    
    public final void setLandscapeWallpaperUri(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getLockScreenAudioUri() {
        return null;
    }
    
    public final void setLockScreenAudioUri(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.util.Set<java.lang.String> getAllowedPackages() {
        return null;
    }
    
    public final void setAllowedPackages(@org.jetbrains.annotations.NotNull()
    java.util.Set<java.lang.String> v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getLicenseKey() {
        return null;
    }
    
    public final void setLicenseKey(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getLicenseStatus() {
        return null;
    }
    
    public final void setLicenseStatus(@org.jetbrains.annotations.NotNull()
    java.lang.String v) {
    }
    
    public final boolean getDeepFreezeEnabled() {
        return false;
    }
    
    public final void setDeepFreezeEnabled(boolean v) {
    }
    
    public final int getDeepFreezeGracePeriodSecs() {
        return 0;
    }
    
    public final void setDeepFreezeGracePeriodSecs(int v) {
    }
}