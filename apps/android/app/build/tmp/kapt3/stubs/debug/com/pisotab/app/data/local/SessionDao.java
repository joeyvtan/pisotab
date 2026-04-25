package com.pisotab.app.data.local;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000:\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0003\n\u0002\u0010\u000e\n\u0002\b\u0003\n\u0002\u0010 \n\u0002\b\u0002\n\u0002\u0010\u0002\n\u0002\b\u0002\n\u0002\u0010\u0006\n\u0002\b\u0006\n\u0002\u0010\b\n\u0002\b\u0005\bg\u0018\u00002\u00020\u0001J\u0010\u0010\u0002\u001a\u0004\u0018\u00010\u0003H\u00a7@\u00a2\u0006\u0002\u0010\u0004J\u0018\u0010\u0005\u001a\u0004\u0018\u00010\u00032\u0006\u0010\u0006\u001a\u00020\u0007H\u00a7@\u00a2\u0006\u0002\u0010\bJ\u0018\u0010\t\u001a\u0004\u0018\u00010\u00032\u0006\u0010\u0006\u001a\u00020\u0007H\u00a7@\u00a2\u0006\u0002\u0010\bJ\u0014\u0010\n\u001a\b\u0012\u0004\u0012\u00020\u00030\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0004J\u0014\u0010\f\u001a\b\u0012\u0004\u0012\u00020\u00030\u000bH\u00a7@\u00a2\u0006\u0002\u0010\u0004J\u0016\u0010\r\u001a\u00020\u000e2\u0006\u0010\u0006\u001a\u00020\u0007H\u00a7@\u00a2\u0006\u0002\u0010\bJ\u001e\u0010\u000f\u001a\u00020\u000e2\u0006\u0010\u0006\u001a\u00020\u00072\u0006\u0010\u0010\u001a\u00020\u0011H\u00a7@\u00a2\u0006\u0002\u0010\u0012J\u001e\u0010\u0013\u001a\u00020\u000e2\u0006\u0010\u0006\u001a\u00020\u00072\u0006\u0010\u0014\u001a\u00020\u0007H\u00a7@\u00a2\u0006\u0002\u0010\u0015J\u001e\u0010\u0016\u001a\u00020\u000e2\u0006\u0010\u0006\u001a\u00020\u00072\u0006\u0010\u0017\u001a\u00020\u0018H\u00a7@\u00a2\u0006\u0002\u0010\u0019J\u0016\u0010\u001a\u001a\u00020\u000e2\u0006\u0010\u001b\u001a\u00020\u0003H\u00a7@\u00a2\u0006\u0002\u0010\u001c\u00a8\u0006\u001d"}, d2 = {"Lcom/pisotab/app/data/local/SessionDao;", "", "getActiveSession", "Lcom/pisotab/app/data/local/SessionEntity;", "(Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getActiveSessionById", "id", "", "(Ljava/lang/String;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getById", "getRecent", "", "getUnsyncedSessions", "markSynced", "", "updateAmountPaid", "amount", "", "(Ljava/lang/String;DLkotlin/coroutines/Continuation;)Ljava/lang/Object;", "updateStatus", "status", "(Ljava/lang/String;Ljava/lang/String;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "updateTime", "secs", "", "(Ljava/lang/String;ILkotlin/coroutines/Continuation;)Ljava/lang/Object;", "upsert", "session", "(Lcom/pisotab/app/data/local/SessionEntity;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "app_debug"})
@androidx.room.Dao()
public abstract interface SessionDao {
    
    @androidx.room.Query(value = "SELECT * FROM sessions WHERE status IN (\'active\',\'paused\') ORDER BY startedAt DESC LIMIT 1")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getActiveSession(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.pisotab.app.data.local.SessionEntity> $completion);
    
    @androidx.room.Query(value = "SELECT * FROM sessions WHERE id = :id AND status IN (\'active\',\'paused\') LIMIT 1")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getActiveSessionById(@org.jetbrains.annotations.NotNull()
    java.lang.String id, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.pisotab.app.data.local.SessionEntity> $completion);
    
    @androidx.room.Query(value = "SELECT * FROM sessions WHERE id = :id")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getById(@org.jetbrains.annotations.NotNull()
    java.lang.String id, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.pisotab.app.data.local.SessionEntity> $completion);
    
    @androidx.room.Insert(onConflict = 1)
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object upsert(@org.jetbrains.annotations.NotNull()
    com.pisotab.app.data.local.SessionEntity session, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
    
    @androidx.room.Query(value = "UPDATE sessions SET timeRemainingSecs = :secs WHERE id = :id")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object updateTime(@org.jetbrains.annotations.NotNull()
    java.lang.String id, int secs, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
    
    @androidx.room.Query(value = "UPDATE sessions SET status = :status WHERE id = :id")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object updateStatus(@org.jetbrains.annotations.NotNull()
    java.lang.String id, @org.jetbrains.annotations.NotNull()
    java.lang.String status, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
    
    @androidx.room.Query(value = "UPDATE sessions SET amountPaid = :amount WHERE id = :id")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object updateAmountPaid(@org.jetbrains.annotations.NotNull()
    java.lang.String id, double amount, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
    
    @androidx.room.Query(value = "SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 50")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getRecent(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super java.util.List<com.pisotab.app.data.local.SessionEntity>> $completion);
    
    @androidx.room.Query(value = "SELECT * FROM sessions WHERE syncedToServer = 0 AND status IN (\'active\',\'paused\')")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getUnsyncedSessions(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super java.util.List<com.pisotab.app.data.local.SessionEntity>> $completion);
    
    @androidx.room.Query(value = "UPDATE sessions SET syncedToServer = 1 WHERE id = :id")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object markSynced(@org.jetbrains.annotations.NotNull()
    java.lang.String id, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super kotlin.Unit> $completion);
}