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
public final class PendingSyncDao_Impl implements PendingSyncDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<PendingSyncEntity> __insertionAdapterOfPendingSyncEntity;

  private final SharedSQLiteStatement __preparedStmtOfDelete;

  public PendingSyncDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfPendingSyncEntity = new EntityInsertionAdapter<PendingSyncEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR ABORT INTO `pending_sync` (`id`,`endpoint`,`method`,`body`,`createdAt`) VALUES (nullif(?, 0),?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final PendingSyncEntity entity) {
        statement.bindLong(1, entity.getId());
        if (entity.getEndpoint() == null) {
          statement.bindNull(2);
        } else {
          statement.bindString(2, entity.getEndpoint());
        }
        if (entity.getMethod() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getMethod());
        }
        if (entity.getBody() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getBody());
        }
        statement.bindLong(5, entity.getCreatedAt());
      }
    };
    this.__preparedStmtOfDelete = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM pending_sync WHERE id = ?";
        return _query;
      }
    };
  }

  @Override
  public Object insert(final PendingSyncEntity item, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfPendingSyncEntity.insert(item);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object delete(final int id, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDelete.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, id);
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
          __preparedStmtOfDelete.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object getAll(final Continuation<? super List<PendingSyncEntity>> $completion) {
    final String _sql = "SELECT * FROM pending_sync ORDER BY createdAt ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<List<PendingSyncEntity>>() {
      @Override
      @NonNull
      public List<PendingSyncEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfEndpoint = CursorUtil.getColumnIndexOrThrow(_cursor, "endpoint");
          final int _cursorIndexOfMethod = CursorUtil.getColumnIndexOrThrow(_cursor, "method");
          final int _cursorIndexOfBody = CursorUtil.getColumnIndexOrThrow(_cursor, "body");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final List<PendingSyncEntity> _result = new ArrayList<PendingSyncEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final PendingSyncEntity _item;
            final int _tmpId;
            _tmpId = _cursor.getInt(_cursorIndexOfId);
            final String _tmpEndpoint;
            if (_cursor.isNull(_cursorIndexOfEndpoint)) {
              _tmpEndpoint = null;
            } else {
              _tmpEndpoint = _cursor.getString(_cursorIndexOfEndpoint);
            }
            final String _tmpMethod;
            if (_cursor.isNull(_cursorIndexOfMethod)) {
              _tmpMethod = null;
            } else {
              _tmpMethod = _cursor.getString(_cursorIndexOfMethod);
            }
            final String _tmpBody;
            if (_cursor.isNull(_cursorIndexOfBody)) {
              _tmpBody = null;
            } else {
              _tmpBody = _cursor.getString(_cursorIndexOfBody);
            }
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            _item = new PendingSyncEntity(_tmpId,_tmpEndpoint,_tmpMethod,_tmpBody,_tmpCreatedAt);
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
