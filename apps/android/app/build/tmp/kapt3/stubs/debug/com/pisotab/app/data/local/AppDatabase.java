package com.pisotab.app.data.local;

/**
 * Room database — stores session state and coin events for offline-first operation.
 */
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u001e\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\b\'\u0018\u00002\u00020\u0001B\u0005\u00a2\u0006\u0002\u0010\u0002J\b\u0010\u0003\u001a\u00020\u0004H&J\b\u0010\u0005\u001a\u00020\u0006H&J\b\u0010\u0007\u001a\u00020\bH&\u00a8\u0006\t"}, d2 = {"Lcom/pisotab/app/data/local/AppDatabase;", "Landroidx/room/RoomDatabase;", "()V", "coinEventDao", "Lcom/pisotab/app/data/local/CoinEventDao;", "pendingSyncDao", "Lcom/pisotab/app/data/local/PendingSyncDao;", "sessionDao", "Lcom/pisotab/app/data/local/SessionDao;", "app_debug"})
@androidx.room.Database(entities = {com.pisotab.app.data.local.SessionEntity.class, com.pisotab.app.data.local.CoinEventEntity.class, com.pisotab.app.data.local.PendingSyncEntity.class}, version = 1, exportSchema = false)
public abstract class AppDatabase extends androidx.room.RoomDatabase {
    
    public AppDatabase() {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public abstract com.pisotab.app.data.local.SessionDao sessionDao();
    
    @org.jetbrains.annotations.NotNull()
    public abstract com.pisotab.app.data.local.CoinEventDao coinEventDao();
    
    @org.jetbrains.annotations.NotNull()
    public abstract com.pisotab.app.data.local.PendingSyncDao pendingSyncDao();
}