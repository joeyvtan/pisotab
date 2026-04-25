package com.pisotab.app.ui.admin

import android.app.DownloadManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.pisotab.app.BuildConfig
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import com.pisotab.app.data.remote.AvailableLicenseItem
import com.pisotab.app.data.remote.LicenseActivateRequest
import kotlinx.coroutines.launch

class AboutFragment : Fragment() {

    private lateinit var tvAppVersion: TextView
    private lateinit var tvLicenseStatus: TextView
    private lateinit var tvDeviceModel: TextView
    private lateinit var tvAndroidVersion: TextView
    private lateinit var tvDeviceOwner: TextView
    private lateinit var tvUpdateStatus: TextView
    private lateinit var btnCheckUpdate: Button
    private lateinit var btnActivateLicense: Button

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_about, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        tvAppVersion        = view.findViewById(R.id.tv_app_version)
        tvLicenseStatus     = view.findViewById(R.id.tv_license_status)
        tvDeviceModel       = view.findViewById(R.id.tv_device_model)
        tvAndroidVersion    = view.findViewById(R.id.tv_android_version)
        tvDeviceOwner       = view.findViewById(R.id.tv_device_owner)
        tvUpdateStatus      = view.findViewById(R.id.tv_update_status)
        btnCheckUpdate      = view.findViewById(R.id.btn_check_update)
        btnActivateLicense  = view.findViewById(R.id.btn_activate_license)

        tvAppVersion.text     = BuildConfig.VERSION_NAME
        tvDeviceModel.text    = "${Build.MANUFACTURER} ${Build.MODEL}"
        tvAndroidVersion.text = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"

        val dpm = requireContext().getSystemService(android.app.admin.DevicePolicyManager::class.java)
        val isOwner = dpm?.isDeviceOwnerApp(requireContext().packageName) == true
        tvDeviceOwner.text = if (isOwner) "Yes ✓" else "No"
        tvDeviceOwner.setTextColor(
            if (isOwner) android.graphics.Color.parseColor("#22C55E")
            else android.graphics.Color.parseColor("#EF4444")
        )

        btnCheckUpdate.setOnClickListener { checkForUpdates() }
        btnActivateLicense.setOnClickListener { showActivateLicenseDialog() }
        loadLicenseStatus()
    }

    override fun onResume() {
        super.onResume()
        loadLicenseStatus()
    }

    private fun loadLicenseStatus() {
        lifecycleScope.launch {
            try {
                val app = requireActivity().application as PisoTabApp
                val deviceId = app.prefs.deviceId
                if (deviceId.isEmpty()) { tvLicenseStatus.text = "No device ID"; return@launch }
                val resp = app.api.checkLicense(deviceId)
                if (resp.isSuccessful) {
                    val lic = resp.body() ?: return@launch
                    tvLicenseStatus.text = when (lic.status) {
                        "active"        -> if (lic.days_left != null) "Active — ${lic.days_left} days left" else "Active (Lifetime)"
                        "trial"         -> "Trial — ${lic.days_left} days left"
                        "trial_expired" -> "Trial Expired — Enter license key"
                        else            -> lic.status
                    }
                    tvLicenseStatus.setTextColor(android.graphics.Color.parseColor(when (lic.status) {
                        "active"        -> "#22C55E"
                        "trial"         -> "#F97316"
                        else            -> "#EF4444"
                    }))
                }
            } catch (_: Exception) {
                tvLicenseStatus.text = "—"
            }
        }
    }

    private fun showActivateLicenseDialog() {
        lifecycleScope.launch {
            val app = requireActivity().application as PisoTabApp
            var available: List<AvailableLicenseItem> = emptyList()
            try {
                val resp = app.api.getAvailableLicenses()
                if (resp.isSuccessful) available = resp.body() ?: emptyList()
            } catch (_: Exception) { /* fall through to manual entry */ }

            if (available.isNotEmpty()) {
                showKeyPickerDialog(available)
            } else {
                showManualKeyDialog()
            }
        }
    }

    private fun showKeyPickerDialog(keys: List<AvailableLicenseItem>) {
        val items = keys.map { it.key }.toTypedArray()
        var selected = 0
        AlertDialog.Builder(requireContext())
            .setTitle("Select License Key")
            .setSingleChoiceItems(items, 0) { _, which -> selected = which }
            .setPositiveButton("Activate") { _, _ ->
                activateLicense(keys[selected].key)
            }
            .setNeutralButton("Enter Manually") { _, _ -> showManualKeyDialog() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showManualKeyDialog() {
        val app = requireActivity().application as PisoTabApp
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 16, 48, 0)
        }
        val etKey = EditText(requireContext()).apply {
            hint = "PTAB-XXXX-XXXX-XXXX-XXXX"
            setText(app.prefs.licenseKey)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
        }
        layout.addView(etKey)

        AlertDialog.Builder(requireContext())
            .setTitle("Activate License")
            .setView(layout)
            .setPositiveButton("Activate") { _, _ ->
                val key = etKey.text.toString().trim()
                if (key.isEmpty()) return@setPositiveButton
                activateLicense(key)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun activateLicense(key: String) {
        lifecycleScope.launch {
            try {
                val app = requireActivity().application as PisoTabApp
                val deviceId = app.prefs.deviceId
                val resp = app.api.activateLicense(LicenseActivateRequest(deviceId, key))
                if (resp.isSuccessful) {
                    app.prefs.licenseKey = key
                    Toast.makeText(requireContext(), "License activated!", Toast.LENGTH_SHORT).show()
                    loadLicenseStatus()
                } else {
                    val msg = resp.errorBody()?.string() ?: "Activation failed"
                    Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
                }
            } catch (_: Exception) {
                Toast.makeText(requireContext(), "Activation failed. Check connection.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun checkForUpdates() {
        btnCheckUpdate.isEnabled = false
        tvUpdateStatus.text = "Checking..."

        lifecycleScope.launch {
            try {
                val app = requireActivity().application as PisoTabApp
                val response = app.api.getAppVersion()
                if (response.isSuccessful) {
                    val info = response.body()!!
                    if (info.version_code > BuildConfig.VERSION_CODE) {
                        tvUpdateStatus.text = "Update available: v${info.version_name}"
                        if (!info.apk_url.isNullOrEmpty()) {
                            promptDownload(info.apk_url, info.version_name)
                        }
                    } else {
                        tvUpdateStatus.text = "You are on the latest version (v${BuildConfig.VERSION_NAME})."
                    }
                } else {
                    tvUpdateStatus.text = "Could not check for updates."
                }
            } catch (_: Exception) {
                tvUpdateStatus.text = "Update check failed. Check connection."
            } finally {
                btnCheckUpdate.isEnabled = true
            }
        }
    }

    private fun promptDownload(url: String, version: String) {
        androidx.appcompat.app.AlertDialog.Builder(requireContext())
            .setTitle("Update Available")
            .setMessage("Version $version is available. Download now?")
            .setPositiveButton("Download") { _, _ ->
                val request = DownloadManager.Request(Uri.parse(url))
                    .setTitle("PisoTab v$version")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, "pisotab-$version.apk")
                val dm = requireContext().getSystemService(android.content.Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.enqueue(request)
                Toast.makeText(requireContext(), "Download started. Check notifications.", Toast.LENGTH_LONG).show()
            }
            .setNegativeButton("Later", null)
            .show()
    }
}
