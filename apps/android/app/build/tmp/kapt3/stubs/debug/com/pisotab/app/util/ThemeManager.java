package com.pisotab.app.util;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000 \n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0003\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u000e\u0010\u0007\u001a\u00020\b2\u0006\u0010\t\u001a\u00020\nR\u000e\u0010\u0003\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u000b"}, d2 = {"Lcom/pisotab/app/util/ThemeManager;", "", "()V", "THEME_BLUE", "", "THEME_GREEN", "THEME_ORANGE", "applyTheme", "", "activity", "Landroid/app/Activity;", "app_debug"})
public final class ThemeManager {
    public static final int THEME_ORANGE = 0;
    public static final int THEME_BLUE = 1;
    public static final int THEME_GREEN = 2;
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.ThemeManager INSTANCE = null;
    
    private ThemeManager() {
        super();
    }
    
    /**
     * Call before setContentView() in every Activity.
     * Sets the night mode globally and applies the accent colour theme.
     */
    public final void applyTheme(@org.jetbrains.annotations.NotNull()
    android.app.Activity activity) {
    }
}