package com.pisotab.app.util;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000@\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0004\n\u0002\u0010\u0011\n\u0002\u0010\u000e\n\u0002\b\u0004\n\u0002\u0010\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000b\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0005\b\u00c6\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002J\u001e\u0010\u000e\u001a\u00020\u000f2\u0006\u0010\u0010\u001a\u00020\u00112\u0006\u0010\u0012\u001a\u00020\u00132\u0006\u0010\u0014\u001a\u00020\u0015J\u0010\u0010\u0016\u001a\u0004\u0018\u00010\u00172\u0006\u0010\u0012\u001a\u00020\u0013J\u0010\u0010\u0018\u001a\u0004\u0018\u00010\u00172\u0006\u0010\u0012\u001a\u00020\u0013J\u0017\u0010\u0019\u001a\u0004\u0018\u00010\u00042\u0006\u0010\u001a\u001a\u00020\u0004H\u0002\u00a2\u0006\u0002\u0010\u001bR\u000e\u0010\u0003\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0007\u001a\u00020\u0004X\u0086T\u00a2\u0006\u0002\n\u0000R\u0019\u0010\b\u001a\b\u0012\u0004\u0012\u00020\n0\t\u00a2\u0006\n\n\u0002\u0010\r\u001a\u0004\b\u000b\u0010\f\u00a8\u0006\u001c"}, d2 = {"Lcom/pisotab/app/util/WallpaperManager;", "", "()V", "PRESET_CIRCUIT", "", "PRESET_CUSTOM", "PRESET_GALAXY", "PRESET_NEON", "presetNames", "", "", "getPresetNames", "()[Ljava/lang/String;", "[Ljava/lang/String;", "applyToImageView", "", "imageView", "Landroid/widget/ImageView;", "context", "Landroid/content/Context;", "isLandscape", "", "getLandscapeUri", "Landroid/net/Uri;", "getPortraitUri", "presetDrawableRes", "preset", "(I)Ljava/lang/Integer;", "app_debug"})
public final class WallpaperManager {
    public static final int PRESET_CUSTOM = 0;
    public static final int PRESET_GALAXY = 1;
    public static final int PRESET_CIRCUIT = 2;
    public static final int PRESET_NEON = 3;
    @org.jetbrains.annotations.NotNull()
    private static final java.lang.String[] presetNames = {"Custom / Upload", "Galaxy", "Circuit Board", "Neon Grid"};
    @org.jetbrains.annotations.NotNull()
    public static final com.pisotab.app.util.WallpaperManager INSTANCE = null;
    
    private WallpaperManager() {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String[] getPresetNames() {
        return null;
    }
    
    private final java.lang.Integer presetDrawableRes(int preset) {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final android.net.Uri getPortraitUri(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final android.net.Uri getLandscapeUri(@org.jetbrains.annotations.NotNull()
    android.content.Context context) {
        return null;
    }
    
    public final void applyToImageView(@org.jetbrains.annotations.NotNull()
    android.widget.ImageView imageView, @org.jetbrains.annotations.NotNull()
    android.content.Context context, boolean isLandscape) {
    }
}