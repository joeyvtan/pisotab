package com.pisotab.app.service;

/**
 * Receives Firebase Cloud Messaging events.
 *
 * Responsibilities:
 *  1. onNewToken — sends the refreshed FCM token to the backend so it can push to this device.
 *  2. onMessageReceived — shows a local notification when a session event arrives via FCM
 *     (backup delivery path when Socket.IO is temporarily disconnected).
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000*\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0002\b\u0005\u0018\u0000 \u00112\u00020\u0001:\u0001\u0011B\u0005\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\u0007\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nH\u0016J\u0010\u0010\u000b\u001a\u00020\b2\u0006\u0010\f\u001a\u00020\rH\u0016J\u0018\u0010\u000e\u001a\u00020\b2\u0006\u0010\u000f\u001a\u00020\r2\u0006\u0010\u0010\u001a\u00020\rH\u0002R\u0014\u0010\u0003\u001a\u00020\u00048BX\u0082\u0004\u00a2\u0006\u0006\u001a\u0004\b\u0005\u0010\u0006\u00a8\u0006\u0012"}, d2 = {"Lcom/pisotab/app/service/PisoTabFirebaseService;", "Lcom/google/firebase/messaging/FirebaseMessagingService;", "()V", "app", "Lcom/pisotab/app/PisoTabApp;", "getApp", "()Lcom/pisotab/app/PisoTabApp;", "onMessageReceived", "", "message", "Lcom/google/firebase/messaging/RemoteMessage;", "onNewToken", "token", "", "showNotification", "title", "body", "Companion", "app_debug"})
public final class PisoTabFirebaseService extends com.google.firebase.messaging.FirebaseMessagingService {
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String FCM_CHANNEL_ID = "pisotab_fcm";
    private static final int FCM_NOTIF_ID = 100;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.service.PisoTabFirebaseService.Companion Companion = null;
    
    public PisoTabFirebaseService() {
        super();
    }
    
    private final com.pisotab.app.PisoTabApp getApp() {
        return null;
    }
    
    /**
     * Called by Firebase when the registration token is created or rotated.
     * Send the new token to the backend so push messages reach this device.
     */
    @java.lang.Override()
    public void onNewToken(@org.jetbrains.annotations.NotNull()
    java.lang.String token) {
    }
    
    /**
     * Called when a message arrives while the app is in the foreground, OR
     * as a data-only message while backgrounded/killed (no auto-shown notification).
     * Shows a local notification so the admin or customer sees the alert.
     */
    @java.lang.Override()
    public void onMessageReceived(@org.jetbrains.annotations.NotNull()
    com.google.firebase.messaging.RemoteMessage message) {
    }
    
    private final void showNotification(java.lang.String title, java.lang.String body) {
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0018\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0000\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0006X\u0082T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0007"}, d2 = {"Lcom/pisotab/app/service/PisoTabFirebaseService$Companion;", "", "()V", "FCM_CHANNEL_ID", "", "FCM_NOTIF_ID", "", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
    }
}