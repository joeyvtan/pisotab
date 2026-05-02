package com.pisotab.app.ui.admin

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import kotlinx.coroutines.launch

class SessionsFragment : Fragment() {

    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var rvSessions: RecyclerView
    private lateinit var adapter: SessionsAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_sessions, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        swipeRefresh = view.findViewById(R.id.swipe_refresh)
        rvSessions   = view.findViewById(R.id.rv_sessions)

        adapter = SessionsAdapter(emptyList())
        rvSessions.layoutManager = LinearLayoutManager(requireContext())
        rvSessions.adapter = adapter

        swipeRefresh.setColorSchemeColors(android.graphics.Color.parseColor("#F97316"))
        swipeRefresh.setProgressBackgroundColorSchemeColor(android.graphics.Color.parseColor("#1E293B"))
        swipeRefresh.setOnRefreshListener { loadSessions() }

        loadSessions()
    }

    private fun loadSessions() {
        swipeRefresh.isRefreshing = true
        lifecycleScope.launch {
            try {
                val app = requireActivity().application as PisoTabApp
                // Do not fetch if device is not configured yet — would return other devices' data
                if (!app.prefs.isConfigured) {
                    adapter.update(emptyList())
                    return@launch
                }
                val response = app.api.getSessions(limit = 100, deviceId = app.prefs.deviceId)
                if (response.isSuccessful) {
                    adapter.update(response.body() ?: emptyList())
                }
            } catch (_: Exception) {
                // Network unavailable — show empty list
            } finally {
                swipeRefresh.isRefreshing = false
            }
        }
    }
}
