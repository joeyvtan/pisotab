package com.pisotab.app.data.remote;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000(\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0010\b\n\u0000\n\u0002\u0010\u0006\n\u0002\b\u0011\n\u0002\u0010\u000b\n\u0002\b\u0004\b\u0086\b\u0018\u00002\u00020\u0001B/\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u0012\b\u0010\u0004\u001a\u0004\u0018\u00010\u0003\u0012\u0006\u0010\u0005\u001a\u00020\u0006\u0012\u0006\u0010\u0007\u001a\u00020\b\u0012\u0006\u0010\t\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\nJ\t\u0010\u0013\u001a\u00020\u0003H\u00c6\u0003J\u000b\u0010\u0014\u001a\u0004\u0018\u00010\u0003H\u00c6\u0003J\t\u0010\u0015\u001a\u00020\u0006H\u00c6\u0003J\t\u0010\u0016\u001a\u00020\bH\u00c6\u0003J\t\u0010\u0017\u001a\u00020\u0003H\u00c6\u0003J=\u0010\u0018\u001a\u00020\u00002\b\b\u0002\u0010\u0002\u001a\u00020\u00032\n\b\u0002\u0010\u0004\u001a\u0004\u0018\u00010\u00032\b\b\u0002\u0010\u0005\u001a\u00020\u00062\b\b\u0002\u0010\u0007\u001a\u00020\b2\b\b\u0002\u0010\t\u001a\u00020\u0003H\u00c6\u0001J\u0013\u0010\u0019\u001a\u00020\u001a2\b\u0010\u001b\u001a\u0004\u0018\u00010\u0001H\u00d6\u0003J\t\u0010\u001c\u001a\u00020\u0006H\u00d6\u0001J\t\u0010\u001d\u001a\u00020\u0003H\u00d6\u0001R\u0011\u0010\u0007\u001a\u00020\b\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000b\u0010\fR\u0011\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\r\u0010\u000eR\u0011\u0010\u0005\u001a\u00020\u0006\u00a2\u0006\b\n\u0000\u001a\u0004\b\u000f\u0010\u0010R\u0011\u0010\t\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0011\u0010\u000eR\u0013\u0010\u0004\u001a\u0004\u0018\u00010\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0012\u0010\u000e\u00a8\u0006\u001e"}, d2 = {"Lcom/pisotab/app/data/remote/StartSessionRequest;", "", "device_id", "", "pricing_tier_id", "duration_mins", "", "amount_paid", "", "payment_method", "(Ljava/lang/String;Ljava/lang/String;IDLjava/lang/String;)V", "getAmount_paid", "()D", "getDevice_id", "()Ljava/lang/String;", "getDuration_mins", "()I", "getPayment_method", "getPricing_tier_id", "component1", "component2", "component3", "component4", "component5", "copy", "equals", "", "other", "hashCode", "toString", "app_debug"})
public final class StartSessionRequest {
    @org.jetbrains.annotations.NotNull()
    private final java.lang.String device_id = null;
    @org.jetbrains.annotations.Nullable()
    private final java.lang.String pricing_tier_id = null;
    private final int duration_mins = 0;
    private final double amount_paid = 0.0;
    @org.jetbrains.annotations.NotNull()
    private final java.lang.String payment_method = null;
    
    public StartSessionRequest(@org.jetbrains.annotations.NotNull()
    java.lang.String device_id, @org.jetbrains.annotations.Nullable()
    java.lang.String pricing_tier_id, int duration_mins, double amount_paid, @org.jetbrains.annotations.NotNull()
    java.lang.String payment_method) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getDevice_id() {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final java.lang.String getPricing_tier_id() {
        return null;
    }
    
    public final int getDuration_mins() {
        return 0;
    }
    
    public final double getAmount_paid() {
        return 0.0;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getPayment_method() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String component1() {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final java.lang.String component2() {
        return null;
    }
    
    public final int component3() {
        return 0;
    }
    
    public final double component4() {
        return 0.0;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String component5() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final com.pisotab.app.data.remote.StartSessionRequest copy(@org.jetbrains.annotations.NotNull()
    java.lang.String device_id, @org.jetbrains.annotations.Nullable()
    java.lang.String pricing_tier_id, int duration_mins, double amount_paid, @org.jetbrains.annotations.NotNull()
    java.lang.String payment_method) {
        return null;
    }
    
    @java.lang.Override()
    public boolean equals(@org.jetbrains.annotations.Nullable()
    java.lang.Object other) {
        return false;
    }
    
    @java.lang.Override()
    public int hashCode() {
        return 0;
    }
    
    @java.lang.Override()
    @org.jetbrains.annotations.NotNull()
    public java.lang.String toString() {
        return null;
    }
}