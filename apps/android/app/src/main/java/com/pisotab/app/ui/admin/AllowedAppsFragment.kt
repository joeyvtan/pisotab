package com.pisotab.app.ui.admin

import android.app.AppOpsManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AllowedAppsFragment : Fragment() {

    private lateinit var etSearch: EditText
    private lateinit var rvApps: RecyclerView
    private lateinit var btnSave: Button
    private lateinit var adapter: AllowedAppsAdapter

    private var allApps: List<AppItem> = emptyList()
    private val prefs get() = (requireActivity().application as PisoTabApp).prefs

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_allowed_apps, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        etSearch = view.findViewById(R.id.et_search)
        rvApps   = view.findViewById(R.id.rv_apps)
        btnSave  = view.findViewById(R.id.btn_save_whitelist)

        adapter = AllowedAppsAdapter(emptyList())
        rvApps.layoutManager = LinearLayoutManager(requireContext())
        rvApps.adapter = adapter

        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s.toString().lowercase()
                adapter.updateFilter(allApps.filter {
                    it.appName.lowercase().contains(query) || it.packageName.lowercase().contains(query)
                })
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        btnSave.setOnClickListener {
            prefs.allowedPackages = adapter.getAllowedPackages()
            Toast.makeText(requireContext(), "Whitelist saved (${adapter.getAllowedPackages().size} apps allowed)", Toast.LENGTH_SHORT).show()
        }

        checkUsageStatsPermission()
        loadApps()
    }

    private fun hasUsageStatsPermission(): Boolean {
        val appOps = requireContext().getSystemService(AppOpsManager::class.java)
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), requireContext().packageName)
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), requireContext().packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun checkUsageStatsPermission() {
        if (hasUsageStatsPermission()) return
        // Android 13+ blocks sensitive permissions for sideloaded APKs via "Restricted Settings".
        // The user must first unlock it in the app's system settings before the toggle appears.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            AlertDialog.Builder(requireContext())
                .setTitle("Enable Usage Access")
                .setMessage(
                    "Android 13+ blocks this permission for sideloaded apps.\n\n" +
                    "Steps to fix:\n" +
                    "1. Tap \"App Settings\" below\n" +
                    "2. Tap ⋮ (three-dot menu) → Allow Restricted Settings\n" +
                    "3. Go back → Usage Access → enable PisoTab"
                )
                .setPositiveButton("App Settings") { _, _ ->
                    startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = android.net.Uri.fromParts("package", requireContext().packageName, null)
                    })
                }
                .setNegativeButton("Later", null)
                .show()
        } else {
            AlertDialog.Builder(requireContext())
                .setTitle("Permission Required")
                .setMessage("Whitelist enforcement requires Usage Access permission.\n\nTap 'Open Settings', find PisoTab in the list, and enable it.")
                .setPositiveButton("Open Settings") { _, _ ->
                    startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }

    private fun loadApps() {
        lifecycleScope.launch {
            val allowed = prefs.allowedPackages
            allApps = withContext(Dispatchers.IO) {
                val pm = requireContext().packageManager
                val intent = android.content.Intent(android.content.Intent.ACTION_MAIN).apply {
                    addCategory(android.content.Intent.CATEGORY_LAUNCHER)
                }
                pm.queryIntentActivities(intent, 0)
                    .map { it.activityInfo.packageName }
                    .distinct()
                    .filter { it != requireContext().packageName }
                    .mapNotNull { pkg ->
                        try {
                            val info = pm.getApplicationInfo(pkg, 0)
                            AppItem(
                                packageName = pkg,
                                appName     = pm.getApplicationLabel(info).toString(),
                                isAllowed   = pkg in allowed,
                                icon        = pm.getApplicationIcon(pkg)
                            )
                        } catch (_: PackageManager.NameNotFoundException) { null }
                    }
                    .sortedBy { it.appName }
            }
            adapter.updateFilter(allApps)
        }
    }
}
