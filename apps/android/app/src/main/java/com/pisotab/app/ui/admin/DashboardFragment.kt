package com.pisotab.app.ui.admin

import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import com.pisotab.app.service.TimerService
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class DashboardFragment : Fragment() {

    private lateinit var tvSessionsToday: TextView
    private lateinit var tvTimeSold: TextView
    private lateinit var tvEarningsToday: TextView
    private lateinit var tvTimerStatus: TextView
    private lateinit var tvBattery: TextView
    private lateinit var tvTotalCoins: TextView
    private lateinit var tvLicense: TextView
    private lateinit var btnRefresh: Button

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_dashboard, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        tvSessionsToday = view.findViewById(R.id.tv_sessions_today)
        tvTimeSold      = view.findViewById(R.id.tv_time_sold)
        tvEarningsToday = view.findViewById(R.id.tv_earnings_today)
        tvTimerStatus   = view.findViewById(R.id.tv_timer_status)
        tvBattery       = view.findViewById(R.id.tv_battery)
        tvTotalCoins    = view.findViewById(R.id.tv_total_coins)
        tvLicense       = view.findViewById(R.id.tv_license)
        btnRefresh      = view.findViewById(R.id.btn_refresh)

        btnRefresh.setOnClickListener { loadStats() }
        loadStats()
        loadLicenseStatus()
    }

    override fun onResume() {
        super.onResume()
        updateTimerStatus()
        updateBattery()
        loadLicenseStatus()
    }

    private fun loadLicenseStatus() {
        lifecycleScope.launch {
            try {
                val app = requireActivity().application as com.pisotab.app.PisoTabApp
                val deviceId = app.prefs.deviceId
                if (deviceId.isEmpty()) return@launch
                val resp = app.api.checkLicense(deviceId)
                if (resp.isSuccessful) {
                    val lic = resp.body() ?: return@launch
                    tvLicense.text = when (lic.status) {
                        "active"       -> if (lic.days_left != null) "Active (${lic.days_left}d left)" else "Active"
                        "trial"        -> "Trial (${lic.days_left}d left)"
                        "trial_expired" -> "Trial Expired"
                        else           -> lic.status
                    }
                    tvLicense.setTextColor(android.graphics.Color.parseColor(when (lic.status) {
                        "active"        -> "#22C55E"
                        "trial"         -> "#F97316"
                        else            -> "#EF4444"
                    }))
                }
            } catch (_: Exception) {
                tvLicense.text = "—"
            }
        }
    }

    private fun loadStats() {
        updateTimerStatus()
        updateBattery()

        lifecycleScope.launch {

            try {
                val app = requireActivity().application as PisoTabApp
                val response = app.api.getSessions(limit = 500)
                if (response.isSuccessful) {
                    val sessions = response.body() ?: emptyList()
                    val todayStart = getTodayStartMs()

                    val todaySessions = sessions.filter { (it.started_at * 1000) >= todayStart }
                    val sessionsCount = todaySessions.size
                    val totalMins     = todaySessions.sumOf { it.duration_mins }
                    val earnings      = todaySessions.sumOf { it.amount_paid }
                    val coinSessions  = todaySessions.filter { it.payment_method == "coin" }
                    val coinValue     = coinSessions.sumOf { it.amount_paid }

                    tvSessionsToday.text = sessionsCount.toString()
                    tvTimeSold.text      = formatMins(totalMins)
                    tvEarningsToday.text = "₱%.0f".format(earnings)
                    tvTotalCoins.text    = "₱%.0f".format(coinValue)
                }
            } catch (_: Exception) {
                tvSessionsToday.text = "—"
            }
        }
    }

    private fun updateTimerStatus() {
        if (TimerService.isRunning && TimerService.currentSecs > 0) {
            tvTimerStatus.text = "Running"
            tvTimerStatus.setTextColor(android.graphics.Color.parseColor("#22C55E"))
        } else {
            tvTimerStatus.text = "Idle"
            tvTimerStatus.setTextColor(android.graphics.Color.parseColor("#94A3B8"))
        }
    }

    private fun updateBattery() {
        val intent = requireContext().registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level  = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale  = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val pct    = if (level >= 0 && scale > 0) (level * 100 / scale) else -1
        tvBattery.text = if (pct >= 0) "$pct%" else "—%"
    }

    private fun getTodayStartMs(): Long {
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    private fun formatMins(mins: Int): String {
        val h = mins / 60
        val m = mins % 60
        return if (h > 0) "${h}h ${m}m" else "${m}m"
    }
}
