package com.pisotab.app.data.local;

import androidx.annotation.NonNull;
import androidx.room.DatabaseConfiguration;
import androidx.room.InvalidationTracker;
import androidx.room.RoomDatabase;
import androidx.room.RoomOpenHelper;
import androidx.room.migration.AutoMigrationSpec;
import androidx.room.migration.Migration;
import androidx.room.util.DBUtil;
import androidx.room.util.TableInfo;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.sqlite.db.SupportSQLiteOpenHelper;
import java.lang.Class;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.processing.Generated;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class AppDatabase_Impl extends AppDatabase {
  private volatile SessionDao _sessionDao;

  private volatile CoinEventDao _coinEventDao;

  private volatile PendingSyncDao _pendingSyncDao;

  @Override
  @NonNull
  protected SupportSQLiteOpenHelper createOpenHelper(@NonNull final DatabaseConfiguration config) {
    final SupportSQLiteOpenHelper.Callback _openCallback = new RoomOpenHelper(config, new RoomOpenHelper.Delegate(1) {
      @Override
      public void createAllTables(@NonNull final SupportSQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS `sessions` (`id` TEXT NOT NULL, `deviceId` TEXT NOT NULL, `startedAt` INTEGER NOT NULL, `durationMins` INTEGER NOT NULL, `timeRemainingSecs` INTEGER NOT NULL, `status` TEXT NOT NULL, `amountPaid` REAL NOT NULL, `paymentMethod` TEXT NOT NULL, `syncedToServer` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `coin_events` (`id` TEXT NOT NULL, `deviceId` TEXT NOT NULL, `coinValue` REAL NOT NULL, `pulses` INTEGER NOT NULL, `creditedSecs` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL, `synced` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `pending_sync` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `endpoint` TEXT NOT NULL, `method` TEXT NOT NULL, `body` TEXT NOT NULL, `createdAt` INTEGER NOT NULL)");
        db.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)");
        db.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, 'bae4007df6b70579259fe72d09edacd8')");
      }

      @Override
      public void dropAllTables(@NonNull final SupportSQLiteDatabase db) {
        db.execSQL("DROP TABLE IF EXISTS `sessions`");
        db.execSQL("DROP TABLE IF EXISTS `coin_events`");
        db.execSQL("DROP TABLE IF EXISTS `pending_sync`");
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onDestructiveMigration(db);
          }
        }
      }

      @Override
      public void onCreate(@NonNull final SupportSQLiteDatabase db) {
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onCreate(db);
          }
        }
      }

      @Override
      public void onOpen(@NonNull final SupportSQLiteDatabase db) {
        mDatabase = db;
        internalInitInvalidationTracker(db);
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onOpen(db);
          }
        }
      }

      @Override
      public void onPreMigrate(@NonNull final SupportSQLiteDatabase db) {
        DBUtil.dropFtsSyncTriggers(db);
      }

      @Override
      public void onPostMigrate(@NonNull final SupportSQLiteDatabase db) {
      }

      @Override
      @NonNull
      public RoomOpenHelper.ValidationResult onValidateSchema(
          @NonNull final SupportSQLiteDatabase db) {
        final HashMap<String, TableInfo.Column> _columnsSessions = new HashMap<String, TableInfo.Column>(9);
        _columnsSessions.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("deviceId", new TableInfo.Column("deviceId", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("startedAt", new TableInfo.Column("startedAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("durationMins", new TableInfo.Column("durationMins", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("timeRemainingSecs", new TableInfo.Column("timeRemainingSecs", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("status", new TableInfo.Column("status", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("amountPaid", new TableInfo.Column("amountPaid", "REAL", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("paymentMethod", new TableInfo.Column("paymentMethod", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsSessions.put("syncedToServer", new TableInfo.Column("syncedToServer", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysSessions = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesSessions = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoSessions = new TableInfo("sessions", _columnsSessions, _foreignKeysSessions, _indicesSessions);
        final TableInfo _existingSessions = TableInfo.read(db, "sessions");
        if (!_infoSessions.equals(_existingSessions)) {
          return new RoomOpenHelper.ValidationResult(false, "sessions(com.pisotab.app.data.local.SessionEntity).\n"
                  + " Expected:\n" + _infoSessions + "\n"
                  + " Found:\n" + _existingSessions);
        }
        final HashMap<String, TableInfo.Column> _columnsCoinEvents = new HashMap<String, TableInfo.Column>(7);
        _columnsCoinEvents.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsCoinEvents.put("deviceId", new TableInfo.Column("deviceId", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsCoinEvents.put("coinValue", new TableInfo.Column("coinValue", "REAL", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsCoinEvents.put("pulses", new TableInfo.Column("pulses", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsCoinEvents.put("creditedSecs", new TableInfo.Column("creditedSecs", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsCoinEvents.put("createdAt", new TableInfo.Column("createdAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsCoinEvents.put("synced", new TableInfo.Column("synced", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysCoinEvents = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesCoinEvents = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoCoinEvents = new TableInfo("coin_events", _columnsCoinEvents, _foreignKeysCoinEvents, _indicesCoinEvents);
        final TableInfo _existingCoinEvents = TableInfo.read(db, "coin_events");
        if (!_infoCoinEvents.equals(_existingCoinEvents)) {
          return new RoomOpenHelper.ValidationResult(false, "coin_events(com.pisotab.app.data.local.CoinEventEntity).\n"
                  + " Expected:\n" + _infoCoinEvents + "\n"
                  + " Found:\n" + _existingCoinEvents);
        }
        final HashMap<String, TableInfo.Column> _columnsPendingSync = new HashMap<String, TableInfo.Column>(5);
        _columnsPendingSync.put("id", new TableInfo.Column("id", "INTEGER", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsPendingSync.put("endpoint", new TableInfo.Column("endpoint", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsPendingSync.put("method", new TableInfo.Column("method", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsPendingSync.put("body", new TableInfo.Column("body", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsPendingSync.put("createdAt", new TableInfo.Column("createdAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysPendingSync = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesPendingSync = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoPendingSync = new TableInfo("pending_sync", _columnsPendingSync, _foreignKeysPendingSync, _indicesPendingSync);
        final TableInfo _existingPendingSync = TableInfo.read(db, "pending_sync");
        if (!_infoPendingSync.equals(_existingPendingSync)) {
          return new RoomOpenHelper.ValidationResult(false, "pending_sync(com.pisotab.app.data.local.PendingSyncEntity).\n"
                  + " Expected:\n" + _infoPendingSync + "\n"
                  + " Found:\n" + _existingPendingSync);
        }
        return new RoomOpenHelper.ValidationResult(true, null);
      }
    }, "bae4007df6b70579259fe72d09edacd8", "50149004c866f802545b25e04abf1890");
    final SupportSQLiteOpenHelper.Configuration _sqliteConfig = SupportSQLiteOpenHelper.Configuration.builder(config.context).name(config.name).callback(_openCallback).build();
    final SupportSQLiteOpenHelper _helper = config.sqliteOpenHelperFactory.create(_sqliteConfig);
    return _helper;
  }

  @Override
  @NonNull
  protected InvalidationTracker createInvalidationTracker() {
    final HashMap<String, String> _shadowTablesMap = new HashMap<String, String>(0);
    final HashMap<String, Set<String>> _viewTables = new HashMap<String, Set<String>>(0);
    return new InvalidationTracker(this, _shadowTablesMap, _viewTables, "sessions","coin_events","pending_sync");
  }

  @Override
  public void clearAllTables() {
    super.assertNotMainThread();
    final SupportSQLiteDatabase _db = super.getOpenHelper().getWritableDatabase();
    try {
      super.beginTransaction();
      _db.execSQL("DELETE FROM `sessions`");
      _db.execSQL("DELETE FROM `coin_events`");
      _db.execSQL("DELETE FROM `pending_sync`");
      super.setTransactionSuccessful();
    } finally {
      super.endTransaction();
      _db.query("PRAGMA wal_checkpoint(FULL)").close();
      if (!_db.inTransaction()) {
        _db.execSQL("VACUUM");
      }
    }
  }

  @Override
  @NonNull
  protected Map<Class<?>, List<Class<?>>> getRequiredTypeConverters() {
    final HashMap<Class<?>, List<Class<?>>> _typeConvertersMap = new HashMap<Class<?>, List<Class<?>>>();
    _typeConvertersMap.put(SessionDao.class, SessionDao_Impl.getRequiredConverters());
    _typeConvertersMap.put(CoinEventDao.class, CoinEventDao_Impl.getRequiredConverters());
    _typeConvertersMap.put(PendingSyncDao.class, PendingSyncDao_Impl.getRequiredConverters());
    return _typeConvertersMap;
  }

  @Override
  @NonNull
  public Set<Class<? extends AutoMigrationSpec>> getRequiredAutoMigrationSpecs() {
    final HashSet<Class<? extends AutoMigrationSpec>> _autoMigrationSpecsSet = new HashSet<Class<? extends AutoMigrationSpec>>();
    return _autoMigrationSpecsSet;
  }

  @Override
  @NonNull
  public List<Migration> getAutoMigrations(
      @NonNull final Map<Class<? extends AutoMigrationSpec>, AutoMigrationSpec> autoMigrationSpecs) {
    final List<Migration> _autoMigrations = new ArrayList<Migration>();
    return _autoMigrations;
  }

  @Override
  public SessionDao sessionDao() {
    if (_sessionDao != null) {
      return _sessionDao;
    } else {
      synchronized(this) {
        if(_sessionDao == null) {
          _sessionDao = new SessionDao_Impl(this);
        }
        return _sessionDao;
      }
    }
  }

  @Override
  public CoinEventDao coinEventDao() {
    if (_coinEventDao != null) {
      return _coinEventDao;
    } else {
      synchronized(this) {
        if(_coinEventDao == null) {
          _coinEventDao = new CoinEventDao_Impl(this);
        }
        return _coinEventDao;
      }
    }
  }

  @Override
  public PendingSyncDao pendingSyncDao() {
    if (_pendingSyncDao != null) {
      return _pendingSyncDao;
    } else {
      synchronized(this) {
        if(_pendingSyncDao == null) {
          _pendingSyncDao = new PendingSyncDao_Impl(this);
        }
        return _pendingSyncDao;
      }
    }
  }
}
