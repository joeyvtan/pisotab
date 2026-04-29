package com.pisotab.app.data.local;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
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
public final class CoinEventDao_Impl implements CoinEventDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<CoinEventEntity> __insertionAdapterOfCoinEventEntity;

  private final SharedSQLiteStatement __preparedStmtOfMarkSynced;

  public CoinEventDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfCoinEventEntity = new EntityInsertionAdapter<CoinEventEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR ABORT INTO `coin_events` (`id`,`deviceId`,`coinValue`,`pulses`,`creditedSecs`,`createdAt`,`synced`) VALUES (?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final CoinEventEntity entity) {
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
        statement.bindDouble(3, entity.getCoinValue());
        statement.bindLong(4, entity.getPulses());
        statement.bindLong(5, entity.getCreditedSecs());
        statement.bindLong(6, entity.getCreatedAt());
        final int _tmp = entity.getSynced() ? 1 : 0;
        statement.bindLong(7, _tmp);
      }
    };
    this.__preparedStmtOfMarkSynced = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE coin_events SET synced = 1 WHERE id = ?";
        return _query;
      }
    };
  }

  @Override
  public Object insert(final CoinEventEntity event, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfCoinEventEntity.insert(event);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
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
  public Object getUnsynced(final Continuation<? super List<CoinEventEntity>> $completion) {
    final String _sql = "SELECT * FROM coin_events WHERE synced = 0";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<CoinEventEntity>>() {
      @Override
      @NonNull
      public List<CoinEventEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfDeviceId = CursorUtil.getColumnIndexOrThrow(_cursor, "deviceId");
          final int _cursorIndexOfCoinValue = CursorUtil.getColumnIndexOrThrow(_cursor, "coinValue");
          final int _cursorIndexOfPulses = CursorUtil.getColumnIndexOrThrow(_cursor, "pulses");
          final int _cursorIndexOfCreditedSecs = CursorUtil.getColumnIndexOrThrow(_cursor, "creditedSecs");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfSynced = CursorUtil.getColumnIndexOrThrow(_cursor, "synced");
          final List<CoinEventEntity> _result = new ArrayList<CoinEventEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final CoinEventEntity _item;
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
            final double _tmpCoinValue;
            _tmpCoinValue = _cursor.getDouble(_cursorIndexOfCoinValue);
            final int _tmpPulses;
            _tmpPulses = _cursor.getInt(_cursorIndexOfPulses);
            final int _tmpCreditedSecs;
            _tmpCreditedSecs = _cursor.getInt(_cursorIndexOfCreditedSecs);
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            final boolean _tmpSynced;
            final int _tmp;
            _tmp = _cursor.getInt(_cursorIndexOfSynced);
            _tmpSynced = _tmp != 0;
            _item = new CoinEventEntity(_tmpId,_tmpDeviceId,_tmpCoinValue,_tmpPulses,_tmpCreditedSecs,_tmpCreatedAt,_tmpSynced);
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
