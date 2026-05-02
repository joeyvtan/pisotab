package com.pisotab.app.ui.admin

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
import kotlinx.coroutines.launch
import java.util.*

class EarningsFragment : Fragment() {

    private lateinit var tvTotalAllTime: TextView
    private lateinit var tvTotalSessions: TextView
    private lateinit var tvToday: TextView
    private lateinit var tvThisWeek: TextView
    private lateinit var tvThisMonth: TextView
    private lateinit var btnRefresh: Button

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_earnings, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        tvTotalAllTime  = view.findViewById(R.id.tv_total_all_time)
        tvTotalSessions = view.findViewById(R.id.tv_total_sessions)
        tvToday         = view.findViewById(R.id.tv_today)
        tvThisWeek      = view.findViewById(R.id.tv_this_week)
        tvThisMonth     = view.findViewById(R.id.tv_this_month)
        btnRefresh      = view.findViewById(R.id.btn_refresh)

        btnRefresh.setOnClickListener { load() }
        load()
    }

    private fun load() {
        lifecycleScope.launch {
            try {
                val app = requireActivity().application as PisoTabApp
                // Do not fetch if device is not configured yet — would return other devices' data
                if (!app.prefs.isConfigured) {
                    tvTotalAllTime.text  = "₱0.00"
                    tvTotalSessions.text = "0 sessions"
                    tvToday.text         = "₱0.00"
                    tvThisWeek.text      = "₱0.00"
                    tvThisMonth.text     = "₱0.00"
                    return@launch
                }
                val response = app.api.getSessions(limit = 10000, deviceId = app.prefs.deviceId)
                if (!response.isSuccessful) return@launch
                val sessions = response.body() ?: emptyList()

                val now      = System.currentTimeMillis()
                val todayMs  = startOfDay(now)
                val weekMs   = todayMs - 6 * 86400_000L
                val monthMs  = startOfMonth(now)

                val total    = sessions.sumOf { it.amount_paid }
                val today    = sessions.filter { it.started_at * 1000L >= todayMs }.sumOf { it.amount_paid }
                val week     = sessions.filter { it.started_at * 1000L >= weekMs }.sumOf { it.amount_paid }
                val month    = sessions.filter { it.started_at * 1000L >= monthMs }.sumOf { it.amount_paid }

                tvTotalAllTime.text  = "₱%.2f".format(total)
                tvTotalSessions.text = "${sessions.size} sessions"
                tvToday.text         = "₱%.2f".format(today)
                tvThisWeek.text      = "₱%.2f".format(week)
                tvThisMonth.text     = "₱%.2f".format(month)
            } catch (_: Exception) {
                tvTotalAllTime.text = "₱—"
            }
        }
    }

    private fun startOfDay(ms: Long): Long {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0);      cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }

    private fun startOfMonth(ms: Long): Long {
        val cal = Calendar.getInstance()
        cal.timeInMillis = ms
        cal.set(Calendar.DAY_OF_MONTH, 1)
        cal.set(Calendar.HOUR_OF_DAY, 0); cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0);      cal.set(Calendar.MILLISECOND, 0)
        return cal.timeInMillis
    }
}
