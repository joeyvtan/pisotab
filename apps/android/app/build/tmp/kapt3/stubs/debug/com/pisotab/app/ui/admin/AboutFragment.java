package com.pisotab.app.ui.admin;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000P\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0006\n\u0002\u0010\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\t\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0002\b\u0002\u0018\u00002\u00020\u0001B\u0005\u00a2\u0006\u0002\u0010\u0002J\u0010\u0010\r\u001a\u00020\u000e2\u0006\u0010\u000f\u001a\u00020\u0010H\u0002J\b\u0010\u0011\u001a\u00020\u000eH\u0002J\b\u0010\u0012\u001a\u00020\u000eH\u0002J$\u0010\u0013\u001a\u00020\u00142\u0006\u0010\u0015\u001a\u00020\u00162\b\u0010\u0017\u001a\u0004\u0018\u00010\u00182\b\u0010\u0019\u001a\u0004\u0018\u00010\u001aH\u0016J\b\u0010\u001b\u001a\u00020\u000eH\u0016J\u001a\u0010\u001c\u001a\u00020\u000e2\u0006\u0010\u001d\u001a\u00020\u00142\b\u0010\u0019\u001a\u0004\u0018\u00010\u001aH\u0016J\u0018\u0010\u001e\u001a\u00020\u000e2\u0006\u0010\u001f\u001a\u00020\u00102\u0006\u0010 \u001a\u00020\u0010H\u0002J\b\u0010!\u001a\u00020\u000eH\u0002J\u0016\u0010\"\u001a\u00020\u000e2\f\u0010#\u001a\b\u0012\u0004\u0012\u00020%0$H\u0002J\b\u0010&\u001a\u00020\u000eH\u0002R\u000e\u0010\u0003\u001a\u00020\u0004X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0005\u001a\u00020\u0004X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u0006\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\b\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\t\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\n\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\u000b\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000R\u000e\u0010\f\u001a\u00020\u0007X\u0082.\u00a2\u0006\u0002\n\u0000\u00a8\u0006\'"}, d2 = {"Lcom/pisotab/app/ui/admin/AboutFragment;", "Landroidx/fragment/app/Fragment;", "()V", "btnActivateLicense", "Landroid/widget/Button;", "btnCheckUpdate", "tvAndroidVersion", "Landroid/widget/TextView;", "tvAppVersion", "tvDeviceModel", "tvDeviceOwner", "tvLicenseStatus", "tvUpdateStatus", "activateLicense", "", "key", "", "checkForUpdates", "loadLicenseStatus", "onCreateView", "Landroid/view/View;", "inflater", "Landroid/view/LayoutInflater;", "container", "Landroid/view/ViewGroup;", "savedInstanceState", "Landroid/os/Bundle;", "onResume", "onViewCreated", "view", "promptDownload", "url", "version", "showActivateLicenseDialog", "showKeyPickerDialog", "keys", "", "Lcom/pisotab/app/data/remote/AvailableLicenseItem;", "showManualKeyDialog", "app_debug"})
public final class AboutFragment extends androidx.fragment.app.Fragment {
    private android.widget.TextView tvAppVersion;
    private android.widget.TextView tvLicenseStatus;
    private android.widget.TextView tvDeviceModel;
    private android.widget.TextView tvAndroidVersion;
    private android.widget.TextView tvDeviceOwner;
    private android.widget.TextView tvUpdateStatus;
    private android.widget.Button btnCheckUpdate;
    private android.widget.Button btnActivateLicense;
    
    public AboutFragment() {
        super();
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public android.view.View onCreateView(@org.jetbrains.annotations.NotNull()
    android.view.LayoutInflater inflater, @org.jetbrains.annotations.Nullable()
    android.view.ViewGroup container, @org.jetbrains.annotations.Nullable()
    android.os.Bundle savedInstanceState) {
        return null;
    }
    
    @java.lang.Override()
    public void onViewCreated(@org.jetbrains.annotations.NotNull()
    android.view.View view, @org.jetbrains.annotations.Nullable()
    android.os.Bundle savedInstanceState) {
    }
    
    @java.lang.Override()
    public void onResume() {
    }
    
    private final void loadLicenseStatus() {
    }
    
    private final void showActivateLicenseDialog() {
    }
    
    private final void showKeyPickerDialog(java.util.List<com.pisotab.app.data.remote.AvailableLicenseItem> keys) {
    }
    
    private final void showManualKeyDialog() {
    }
    
    private final void activateLicense(java.lang.String key) {
    }
    
    private final void checkForUpdates() {
    }
    
    private final void promptDownload(java.lang.String url, java.lang.String version) {
    }
}