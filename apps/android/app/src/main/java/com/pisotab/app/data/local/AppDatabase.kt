package com.pisotab.app.data.local

import androidx.room.*

/**
 * Room database — stores session state and coin events for offline-first operation.
 */
@Database(
    entities = [SessionEntity::class, CoinEventEntity::class, PendingSyncEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
    abstract fun coinEventDao(): CoinEventDao
    abstract fun pendingSyncDao(): PendingSyncDao
}

// ── Session entity ─────────────────────────────────────────────────────────

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey val id: String,
    val deviceId: String,
    val startedAt: Long,
    val durationMins: Int,
    var timeRemainingSecs: Int,
    var status: String,           // "active" | "paused" | "ended"
    val amountPaid: Double,
    val paymentMethod: String,
    val syncedToServer: Boolean = false
)

@Dao
interface SessionDao {
    @Query("SELECT * FROM sessions WHERE status IN ('active','paused') ORDER BY startedAt DESC LIMIT 1")
    suspend fun getActiveSession(): SessionEntity?

    @Query("SELECT * FROM sessions WHERE id = :id AND status IN ('active','paused') LIMIT 1")
    suspend fun getActiveSessionById(id: String): SessionEntity?

    @Query("SELECT * FROM sessions WHERE id = :id")
    suspend fun getById(id: String): SessionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(session: SessionEntity)

    @Query("UPDATE sessions SET timeRemainingSecs = :secs WHERE id = :id")
    suspend fun updateTime(id: String, secs: Int)

    @Query("UPDATE sessions SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: String, status: String)

    @Query("UPDATE sessions SET amountPaid = :amount WHERE id = :id")
    suspend fun updateAmountPaid(id: String, amount: Double)

    @Query("SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 50")
    suspend fun getRecent(): List<SessionEntity>

    // Returns sessions that were created offline and never POSTed to the server.
    // Checked by SyncService every 15s; retried until server acknowledges them.
    @Query("SELECT * FROM sessions WHERE syncedToServer = 0 AND status IN ('active','paused')")
    suspend fun getUnsyncedSessions(): List<SessionEntity>

    @Query("UPDATE sessions SET syncedToServer = 1 WHERE id = :id")
    suspend fun markSynced(id: String)
}

// ── Coin event entity ───────────────────────────────────────────────────────

@Entity(tableName = "coin_events")
data class CoinEventEntity(
    @PrimaryKey val id: String,
    val deviceId: String,
    val coinValue: Double,
    val pulses: Int,
    val creditedSecs: Int,
    val createdAt: Long,
    val synced: Boolean = false
)

@Dao
interface CoinEventDao {
    @Insert
    suspend fun insert(event: CoinEventEntity)

    @Query("SELECT * FROM coin_events WHERE synced = 0")
    suspend fun getUnsynced(): List<CoinEventEntity>

    @Query("UPDATE coin_events SET synced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)
}

// ── Pending sync queue ──────────────────────────────────────────────────────

@Entity(tableName = "pending_sync")
data class PendingSyncEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val endpoint: String,   // e.g., "/api/coins"
    val method: String,     // "POST"
    val body: String,       // JSON string
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface PendingSyncDao {
    @Insert
    suspend fun insert(item: PendingSyncEntity)

    @Query("SELECT * FROM pending_sync ORDER BY createdAt ASC")
    suspend fun getAll(): List<PendingSyncEntity>

    @Query("DELETE FROM pending_sync WHERE id = :id")
    suspend fun delete(id: Int)
}
