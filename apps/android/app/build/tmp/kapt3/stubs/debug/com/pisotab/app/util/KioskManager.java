package com.pisotab.app.util;

/**
 * Kiosk lockdown helper.
 *
 * Uses lock task mode (Android 5+) to prevent users from leaving the app.
 * When the app is set as Device Owner, it can lock without a PIN prompt.
 * Without Device Owner, the user sees a standard "pinned app" UI.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000N\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0004\n\u0002\u0010\u000b\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010\u0011\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\"\n\u0002\b\u0002\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u000e\u0010\u0003\u001a\u00020\u00042\u0006\u0010\u0005\u001a\u00020\u0006J\u000e\u0010\u0007\u001a\u00020\u00042\u0006\u0010\b\u001a\u00020\tJ\u000e\u0010\n\u001a\u00020\u00042\u0006\u0010\b\u001a\u00020\tJ\u000e\u0010\u000b\u001a\u00020\u00042\u0006\u0010\b\u001a\u00020\tJ\u000e\u0010\f\u001a\u00020\u00042\u0006\u0010\b\u001a\u00020\tJ\u000e\u0010\r\u001a\u00020\u000e2\u0006\u0010\u000f\u001a\u00020\u0010J\u000e\u0010\u0011\u001a\u00020\u000e2\u0006\u0010\b\u001a\u00020\tJ\u0010\u0010\u0012\u001a\u00020\u00132\u0006\u0010\b\u001a\u00020\tH\u0002J\'\u0010\u0014\u001a\u00020\u00042\u0006\u0010\b\u001a\u00020\t2\u0012\u0010\u0015\u001a\n\u0012\u0006\b\u0001\u0012\u00020\u00130\u0016\"\u00020\u0013\u00a2\u0006\u0002\u0010\u0017J\u001e\u0010\u0018\u001a\u00020\u00042\u0006\u0010\u0019\u001a\u00020\u001a2\u000e\b\u0002\u0010\u001b\u001a\b\u0012\u0004\u0012\u00020\u00130\u001cJ\u000e\u0010\u001d\u001a\u00020\u00042\u0006\u0010\u0019\u001a\u00020\u001a\u00a8\u0006\u001e"}, d2 = {"Lcom/pisotab/app/util/KioskManager;", "", "()V", "applyImmersiveMode", "", "window", "Landroid/view/Window;", "disableSettings", "context", "Landroid/content/Context;", "disableUsbDebugging", "enableSettings", "enableUsbDebugging", "interceptKey", "", "keyCode", "", "isInLockTaskMode", "resolveSettingsPackage", "", "setLockTaskPackages", "packageNames", "", "(Landroid/content/Context;[Ljava/lang/String;)V", "startLockTask", "activity", "Landroid/app/Activity;", "allowedPackages", "", "stopLockTask", "app_debug"})
public final class KioskManager {
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.KioskManager INSTANCE = null;
    
    private KioskManager() {
        super();
    }
    
    /**
     * Enter lock task / screen pinning mode.
     * allowedPackages: whitelisted app packages to include in the Device Owner lock task list
     * so those apps can be launched from within the locked task without a SecurityException.
     * On non-Device-Owner devices this is a no-op and screen pinning allows any startActivity.
     */
    public final void startLockTask(@org.jetbrains.annotations.NotNull()
    android.app.Activity activity, @org.jetbrains.annotations.NotNull()
    java.util.Set<java.lang.String> allowedPackages) {
    }
    
    public final void stopLockTask(@org.jetbrains.annotations.NotNull()
    android.app.Activity activity) {
    }
    
    public final boolean isInLockTaskMode(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return false;
    }
    
    /**
     * Hides the status and navigation bars for a true fullscreen kiosk experience.
     */
    public final void applyImmersiveMode(@org.jetbrains.annotations.NotNull()
    android.view.Window window) {
    }
    
    /**
     * If Device Owner, enable lock task whitelist.
     */
    public final void setLockTaskPackages(@org.jetbrains.annotations.NotNull()
    android.content.Context context, @org.jetbrains.annotations.NotNull()
    java.lang.String... packageNames) {
    }
    
    /**
     * Disable the system Settings app and block key configuration changes while kiosk is active.
     * Prevents customers from changing WiFi, enabling hotspot, or factory resetting the device.
     *
     * Two layers of protection:
     *  1. setPackagesSuspended — suspends the Settings app OS-wide so it cannot be launched
     *     from anywhere (home screen, recent apps, Quick Settings deep-links, etc.)
     *  2. User restrictions — block specific OS-level actions even through Quick Settings tiles
     *     or other entry points that bypass the Settings app itself.
     *
     * Only effective when the app is Device Owner.
     * Reversed by enableSettings() when admin enters the PIN.
     */
    public final void disableSettings(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    public final void enableSettings(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    /**
     * Resolve the Settings app package name at runtime.
     * Manufacturer ROMs (Samsung, Xiaomi, Realme, etc.) may ship their own Settings APK
     * under a different package name. Using the intent avoids hardcoding.
     */
    private final java.lang.String resolveSettingsPackage(android.content.Context context) {
        return null;
    }
    
    public final void disableUsbDebugging(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    public final void enableUsbDebugging(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
    }
    
    /**
     * Intercept hardware back/home buttons when in kiosk mode.
     * Return true if the key was consumed.
     */
    public final boolean interceptKey(int keyCode) {
        return false;
    }
}