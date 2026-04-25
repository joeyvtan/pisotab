package com.pisotab.app.data.local;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class SessionDao_Impl implements SessionDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<SessionEntity> __insertionAdapterOfSessionEntity;

  private final SharedSQLiteStatement __preparedStmtOfUpdateTime;

  private final SharedSQLiteStatement __preparedStmtOfUpdateStatus;

  private final SharedSQLiteStatement __preparedStmtOfUpdateAmountPaid;

  private final SharedSQLiteStatement __preparedStmtOfMarkSynced;

  public SessionDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfSessionEntity = new EntityInsertionAdapter<SessionEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `sessions` (`id`,`deviceId`,`startedAt`,`durationMins`,`timeRemainingSecs`,`status`,`amountPaid`,`paymentMethod`,`syncedToServer`) VALUES (?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final SessionEntity entity) {
        if (entity.getId() == null) {
          statement.bindNull(1);
        } else {
          statement.bindString(1, entity.getId());
        }
        if (entity.getDeviceId() == null) {
          statement.bindNull(2);
        } else {
          statement.bindString(2, entity.getDeviceId());
        }
        statement.bindLong(3, entity.getStartedAt());
        statement.bindLong(4, entity.getDurationMins());
        statement.bindLong(5, entity.getTimeRemainingSecs());
        if (entity.getStatus() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getStatus());
        }
        statement.bindDouble(7, entity.getAmountPaid());
        if (entity.getPaymentMethod() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getPaymentMethod());
        }
        final int _tmp = entity.getSyncedToServer() ? 1 : 0;
        statement.bindLong(9, _tmp);
      }
    };
    this.__preparedStmtOfUpdateTime = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE sessions SET timeRemainingSecs = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfUpdateStatus = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE sessions SET status = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfUpdateAmountPaid = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE sessions SET amountPaid = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfMarkSynced = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE sessions SET syncedToServer = 1 WHERE id = ?";
        return _query;
      }
    };
  }

  @Override
  public Object upsert(final SessionEntity session, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfSessionEntity.insert(session);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object updateTime(final String id, final int secs,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfUpdateTime.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, secs);
        _argIndex = 2;
        if (id == null) {
          _stmt.bindNull(_argIndex);
        } else {
          _stmt.bindString(_argIndex, id);
        }
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfUpdateTime.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object updateStatus(final String id, final String status,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfUpdateStatus.acquire();
        int _argIndex = 1;
        if (status == null) {
          _stmt.bindNull(_argIndex);
        } else {
          _stmt.bindString(_argIndex, status);
        }
        _argIndex = 2;
        if (id == null) {
          _stmt.bindNull(_argIndex);
        } else {
          _stmt.bindString(_argIndex, id);
        }
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfUpdateStatus.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object updateAmountPaid(final String id, final double amount,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfUpdateAmountPaid.acquire();
        int _argIndex = 1;
        _stmt.bindDouble(_argIndex, amount);
        _argIndex = 2;
        if (id == null) {
          _stmt.bindNull(_argIndex);
        } else {
          _stmt.bindString(_argIndex, id);
        }
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfUpdateAmountPaid.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object markSynced(final String id, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfMarkSynced.acquire();
        int _argIndex = 1;
        if (id == null) {
          _stmt.bindNull(_argIndex);
        } else {
          _stmt.bindString(_argIndex, id);
        }
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfMarkSynced.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object getActiveSession(final Continuation<? super SessionEntity> $completion) {
    final String _sql = "SELECT * FROM sessions WHERE status IN ('active','paused') ORDER BY startedAt DESC LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<SessionEntity>() {
      @Override
      @Nullable
      public SessionEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfDeviceId = CursorUtil.getColumnIndexOrThrow(_cursor, "deviceId");
          final int _cursorIndexOfStartedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "startedAt");
          final int _cursorIndexOfDurationMins = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMins");
          final int _cursorIndexOfTimeRemainingSecs = CursorUtil.getColumnIndexOrThrow(_cursor, "timeRemainingSecs");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfAmountPaid = CursorUtil.getColumnIndexOrThrow(_cursor, "amountPaid");
          final int _cursorIndexOfPaymentMethod = CursorUtil.getColumnIndexOrThrow(_cursor, "paymentMethod");
          final int _cursorIndexOfSyncedToServer = CursorUtil.getColumnIndexOrThrow(_cursor, "syncedToServer");
          final SessionEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            if (_cursor.isNull(_cursorIndexOfId)) {
              _tmpId = null;
            } else {
              _tmpId = _cursor.getString(_cursorIndexOfId);
            }
            final String _tmpDeviceId;
            if (_cursor.isNull(_cursorIndexOfDeviceId)) {
              _tmpDeviceId = null;
            } else {
              _tmpDeviceId = _cursor.getString(_cursorIndexOfDeviceId);
            }
            final long _tmpStartedAt;
            _tmpStartedAt = _cursor.getLong(_cursorIndexOfStartedAt);
            final int _tmpDurationMins;
            _tmpDurationMins = _cursor.getInt(_cursorIndexOfDurationMins);
            final int _tmpTimeRemainingSecs;
            _tmpTimeRemainingSecs = _cursor.getInt(_cursorIndexOfTimeRemainingSecs);
            final String _tmpStatus;
            if (_cursor.isNull(_cursorIndexOfStatus)) {
              _tmpStatus = null;
            } else {
              _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            }
            final double _tmpAmountPaid;
            _tmpAmountPaid = _cursor.getDouble(_cursorIndexOfAmountPaid);
            final String _tmpPaymentMethod;
            if (_cursor.isNull(_cursorIndexOfPaymentMethod)) {
              _tmpPaymentMethod = null;
            } else {
              _tmpPaymentMethod = _cursor.getString(_cursorIndexOfPaymentMethod);
            }
            final boolean _tmpSyncedToServer;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfSyncedToServer);
            _tmpSyncedToServer = _tmp != 0;
            _result = new SessionEntity(_tmpId,_tmpDeviceId,_tmpStartedAt,_tmpDurationMins,_tmpTimeRemainingSecs,_tmpStatus,_tmpAmountPaid,_tmpPaymentMethod,_tmpSyncedToServer);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getActiveSessionById(final String id,
      final Continuation<? super SessionEntity> $completion) {
    final String _sql = "SELECT * FROM sessions WHERE id = ? AND status IN ('active','paused') LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    if (id == null) {
      _statement.bindNull(_argIndex);
    } else {
      _statement.bindString(_argIndex, id);
    }
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<SessionEntity>() {
      @Override
      @Nullable
      public SessionEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfDeviceId = CursorUtil.getColumnIndexOrThrow(_cursor, "deviceId");
          final int _cursorIndexOfStartedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "startedAt");
          final int _cursorIndexOfDurationMins = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMins");
          final int _cursorIndexOfTimeRemainingSecs = CursorUtil.getColumnIndexOrThrow(_cursor, "timeRemainingSecs");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfAmountPaid = CursorUtil.getColumnIndexOrThrow(_cursor, "amountPaid");
          final int _cursorIndexOfPaymentMethod = CursorUtil.getColumnIndexOrThrow(_cursor, "paymentMethod");
          final int _cursorIndexOfSyncedToServer = CursorUtil.getColumnIndexOrThrow(_cursor, "syncedToServer");
          final SessionEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            if (_cursor.isNull(_cursorIndexOfId)) {
              _tmpId = null;
            } else {
              _tmpId = _cursor.getString(_cursorIndexOfId);
            }
            final String _tmpDeviceId;
            if (_cursor.isNull(_cursorIndexOfDeviceId)) {
              _tmpDeviceId = null;
            } else {
              _tmpDeviceId = _cursor.getString(_cursorIndexOfDeviceId);
            }
            final long _tmpStartedAt;
            _tmpStartedAt = _cursor.getLong(_cursorIndexOfStartedAt);
            final int _tmpDurationMins;
            _tmpDurationMins = _cursor.getInt(_cursorIndexOfDurationMins);
            final int _tmpTimeRemainingSecs;
            _tmpTimeRemainingSecs = _cursor.getInt(_cursorIndexOfTimeRemainingSecs);
            final String _tmpStatus;
            if (_cursor.isNull(_cursorIndexOfStatus)) {
              _tmpStatus = null;
            } else {
              _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            }
            final double _tmpAmountPaid;
            _tmpAmountPaid = _cursor.getDouble(_cursorIndexOfAmountPaid);
            final String _tmpPaymentMethod;
            if (_cursor.isNull(_cursorIndexOfPaymentMethod)) {
              _tmpPaymentMethod = null;
            } else {
              _tmpPaymentMethod = _cursor.getString(_cursorIndexOfPaymentMethod);
            }
            final boolean _tmpSyncedToServer;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfSyncedToServer);
            _tmpSyncedToServer = _tmp != 0;
            _result = new SessionEntity(_tmpId,_tmpDeviceId,_tmpStartedAt,_tmpDurationMins,_tmpTimeRemainingSecs,_tmpStatus,_tmpAmountPaid,_tmpPaymentMethod,_tmpSyncedToServer);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getById(final String id, final Continuation<? super SessionEntity> $completion) {
    final String _sql = "SELECT * FROM sessions WHERE id = ?";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    if (id == null) {
      _statement.bindNull(_argIndex);
    } else {
      _statement.bindString(_argIndex, id);
    }
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<SessionEntity>() {
      @Override
      @Nullable
      public SessionEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfDeviceId = CursorUtil.getColumnIndexOrThrow(_cursor, "deviceId");
          final int _cursorIndexOfStartedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "startedAt");
          final int _cursorIndexOfDurationMins = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMins");
          final int _cursorIndexOfTimeRemainingSecs = CursorUtil.getColumnIndexOrThrow(_cursor, "timeRemainingSecs");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfAmountPaid = CursorUtil.getColumnIndexOrThrow(_cursor, "amountPaid");
          final int _cursorIndexOfPaymentMethod = CursorUtil.getColumnIndexOrThrow(_cursor, "paymentMethod");
          final int _cursorIndexOfSyncedToServer = CursorUtil.getColumnIndexOrThrow(_cursor, "syncedToServer");
          final SessionEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            if (_cursor.isNull(_cursorIndexOfId)) {
              _tmpId = null;
            } else {
              _tmpId = _cursor.getString(_cursorIndexOfId);
            }
            final String _tmpDeviceId;
            if (_cursor.isNull(_cursorIndexOfDeviceId)) {
              _tmpDeviceId = null;
            } else {
              _tmpDeviceId = _cursor.getString(_cursorIndexOfDeviceId);
            }
            final long _tmpStartedAt;
            _tmpStartedAt = _cursor.getLong(_cursorIndexOfStartedAt);
            final int _tmpDurationMins;
            _tmpDurationMins = _cursor.getInt(_cursorIndexOfDurationMins);
            final int _tmpTimeRemainingSecs;
            _tmpTimeRemainingSecs = _cursor.getInt(_cursorIndexOfTimeRemainingSecs);
            final String _tmpStatus;
            if (_cursor.isNull(_cursorIndexOfStatus)) {
              _tmpStatus = null;
            } else {
              _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            }
            final double _tmpAmountPaid;
            _tmpAmountPaid = _cursor.getDouble(_cursorIndexOfAmountPaid);
            final String _tmpPaymentMethod;
            if (_cursor.isNull(_cursorIndexOfPaymentMethod)) {
              _tmpPaymentMethod = null;
            } else {
              _tmpPaymentMethod = _cursor.getString(_cursorIndexOfPaymentMethod);
            }
            final boolean _tmpSyncedToServer;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfSyncedToServer);
            _tmpSyncedToServer = _tmp != 0;
            _result = new SessionEntity(_tmpId,_tmpDeviceId,_tmpStartedAt,_tmpDurationMins,_tmpTimeRemainingSecs,_tmpStatus,_tmpAmountPaid,_tmpPaymentMethod,_tmpSyncedToServer);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getRecent(final Continuation<? super List<SessionEntity>> $completion) {
    final String _sql = "SELECT * FROM sessions ORDER BY startedAt DESC LIMIT 50";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<SessionEntity>>() {
      @Override
      @NonNull
      public List<SessionEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfDeviceId = CursorUtil.getColumnIndexOrThrow(_cursor, "deviceId");
          final int _cursorIndexOfStartedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "startedAt");
          final int _cursorIndexOfDurationMins = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMins");
          final int _cursorIndexOfTimeRemainingSecs = CursorUtil.getColumnIndexOrThrow(_cursor, "timeRemainingSecs");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfAmountPaid = CursorUtil.getColumnIndexOrThrow(_cursor, "amountPaid");
          final int _cursorIndexOfPaymentMethod = CursorUtil.getColumnIndexOrThrow(_cursor, "paymentMethod");
          final int _cursorIndexOfSyncedToServer = CursorUtil.getColumnIndexOrThrow(_cursor, "syncedToServer");
          final List<SessionEntity> _result = new ArrayList<SessionEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final SessionEntity _item;
            final String _tmpId;
            if (_cursor.isNull(_cursorIndexOfId)) {
              _tmpId = null;
            } else {
              _tmpId = _cursor.getString(_cursorIndexOfId);
            }
            final String _tmpDeviceId;
            if (_cursor.isNull(_cursorIndexOfDeviceId)) {
              _tmpDeviceId = null;
            } else {
              _tmpDeviceId = _cursor.getString(_cursorIndexOfDeviceId);
            }
            final long _tmpStartedAt;
            _tmpStartedAt = _cursor.getLong(_cursorIndexOfStartedAt);
            final int _tmpDurationMins;
            _tmpDurationMins = _cursor.getInt(_cursorIndexOfDurationMins);
            final int _tmpTimeRemainingSecs;
            _tmpTimeRemainingSecs = _cursor.getInt(_cursorIndexOfTimeRemainingSecs);
            final String _tmpStatus;
            if (_cursor.isNull(_cursorIndexOfStatus)) {
              _tmpStatus = null;
            } else {
              _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            }
            final double _tmpAmountPaid;
            _tmpAmountPaid = _cursor.getDouble(_cursorIndexOfAmountPaid);
            final String _tmpPaymentMethod;
            if (_cursor.isNull(_cursorIndexOfPaymentMethod)) {
              _tmpPaymentMethod = null;
            } else {
              _tmpPaymentMethod = _cursor.getString(_cursorIndexOfPaymentMethod);
            }
            final boolean _tmpSyncedToServer;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfSyncedToServer);
            _tmpSyncedToServer = _tmp != 0;
            _item = new SessionEntity(_tmpId,_tmpDeviceId,_tmpStartedAt,_tmpDurationMins,_tmpTimeRemainingSecs,_tmpStatus,_tmpAmountPaid,_tmpPaymentMethod,_tmpSyncedToServer);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @Override
  public Object getUnsyncedSessions(final Continuation<? super List<SessionEntity>> $completion) {
    final String _sql = "SELECT * FROM sessions WHERE syncedToServer = 0 AND status IN ('active','paused')";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<SessionEntity>>() {
      @Override
      @NonNull
      public List<SessionEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfDeviceId = CursorUtil.getColumnIndexOrThrow(_cursor, "deviceId");
          final int _cursorIndexOfStartedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "startedAt");
          final int _cursorIndexOfDurationMins = CursorUtil.getColumnIndexOrThrow(_cursor, "durationMins");
          final int _cursorIndexOfTimeRemainingSecs = CursorUtil.getColumnIndexOrThrow(_cursor, "timeRemainingSecs");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfAmountPaid = CursorUtil.getColumnIndexOrThrow(_cursor, "amountPaid");
          final int _cursorIndexOfPaymentMethod = CursorUtil.getColumnIndexOrThrow(_cursor, "paymentMethod");
          final int _cursorIndexOfSyncedToServer = CursorUtil.getColumnIndexOrThrow(_cursor, "syncedToServer");
          final List<SessionEntity> _result = new ArrayList<SessionEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final SessionEntity _item;
            final String _tmpId;
            if (_cursor.isNull(_cursorIndexOfId)) {
              _tmpId = null;
            } else {
              _tmpId = _cursor.getString(_cursorIndexOfId);
            }
            final String _tmpDeviceId;
            if (_cursor.isNull(_cursorIndexOfDeviceId)) {
              _tmpDeviceId = null;
            } else {
              _tmpDeviceId = _cursor.getString(_cursorIndexOfDeviceId);
            }
            final long _tmpStartedAt;
            _tmpStartedAt = _cursor.getLong(_cursorIndexOfStartedAt);
            final int _tmpDurationMins;
            _tmpDurationMins = _cursor.getInt(_cursorIndexOfDurationMins);
            final int _tmpTimeRemainingSecs;
            _tmpTimeRemainingSecs = _cursor.getInt(_cursorIndexOfTimeRemainingSecs);
            final String _tmpStatus;
            if (_cursor.isNull(_cursorIndexOfStatus)) {
              _tmpStatus = null;
            } else {
              _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            }
            final double _tmpAmountPaid;
            _tmpAmountPaid = _cursor.getDouble(_cursorIndexOfAmountPaid);
            final String _tmpPaymentMethod;
            if (_cursor.isNull(_cursorIndexOfPaymentMethod)) {
              _tmpPaymentMethod = null;
            } else {
              _tmpPaymentMethod = _cursor.getString(_cursorIndexOfPaymentMethod);
            }
            final boolean _tmpSyncedToServer;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfSyncedToServer);
            _tmpSyncedToServer = _tmp != 0;
            _item = new SessionEntity(_tmpId,_tmpDeviceId,_tmpStartedAt,_tmpDurationMins,_tmpTimeRemainingSecs,_tmpStatus,_tmpAmountPaid,_tmpPaymentMethod,_tmpSyncedToServer);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
