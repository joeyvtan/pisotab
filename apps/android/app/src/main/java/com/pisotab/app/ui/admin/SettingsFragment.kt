package com.pisotab.app.ui.admin

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import com.pisotab.app.data.remote.DeviceConfigRequest
import com.pisotab.app.receiver.DeviceAdminReceiver
import com.pisotab.app.util.RemoteConfigManager
import kotlinx.coroutines.launch

class SettingsFragment : Fragment() {

    private val prefs get() = (requireActivity().application as PisoTabApp).prefs
    private var selectedRingtoneUri: String = ""

    // Held so refreshUiFromPrefs() can update them from the remote-config callback.
    private var vRgMode: RadioGroup? = null
    private var vRbEsp32: RadioButton? = null
    private var vRbUsb: RadioButton? = null
    private var vSwKiosk: Switch? = null
    private var vEtRatePerMin: EditText? = null
    private var vEtSecsPerCoin: EditText? = null
    private var vSwFloatingTimer: Switch? = null
    private var vSwDeepFreeze: Switch? = null
    private var vEtGrace: EditText? = null
    private var vSwAlarmWifi: Switch? = null
    private var vSwAlarmCharger: Switch? = null
    private var vSwAlarmSession: Switch? = null
    private var vEtAlarmDelay: EditText? = null

    private val ringtonePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val uri: Uri? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU)
                result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java)
            else
                @Suppress("DEPRECATION") result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            selectedRingtoneUri = uri?.toString() ?: ""
            view?.findViewById<Button>(R.id.btn_alarm_sound)?.text =
                if (uri != null) RingtoneManager.getRingtone(requireContext(), uri)?.getTitle(requireContext()) ?: "Custom"
                else "Default Alarm"
        }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_settings, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val etBackendUsername = view.findViewById<EditText>(R.id.et_backend_username)
        val etBackendPassword = view.findViewById<EditText>(R.id.et_backend_password)
        val etServerUrl      = view.findViewById<EditText>(R.id.et_server_url)
        val etDeviceId       = view.findViewById<EditText>(R.id.et_device_id)
        val etDeviceName     = view.findViewById<EditText>(R.id.et_device_name)
        val rgMode           = view.findViewById<RadioGroup>(R.id.rg_connection_mode)
        val rbEsp32          = view.findViewById<RadioButton>(R.id.rb_mode_esp32)
        val rbUsb            = view.findViewById<RadioButton>(R.id.rb_mode_usb)
        val swKiosk          = view.findViewById<Switch>(R.id.sw_kiosk)
        val etRatePerMin     = view.findViewById<EditText>(R.id.et_rate_per_min)
        val etSecsPerCoin    = view.findViewById<EditText>(R.id.et_secs_per_coin)
        val btnAllowedApps   = view.findViewById<Button>(R.id.btn_allowed_apps)
        val swFloatingTimer  = view.findViewById<Switch>(R.id.sw_floating_timer)
        val swDeepFreeze     = view.findViewById<Switch>(R.id.sw_deep_freeze)
        val etGrace          = view.findViewById<EditText>(R.id.et_deep_freeze_grace)
        val swAlarmWifi      = view.findViewById<Switch>(R.id.sw_alarm_wifi)
        val swAlarmCharger   = view.findViewById<Switch>(R.id.sw_alarm_charger)
        val swAlarmSession   = view.findViewById<Switch>(R.id.sw_alarm_session_only)
        val etAlarmDelay     = view.findViewById<EditText>(R.id.et_alarm_delay)
        val btnAlarmSound    = view.findViewById<Button>(R.id.btn_alarm_sound)
        val btnChangePin     = view.findViewById<Button>(R.id.btn_change_pin)
        val btnSave          = view.findViewById<Button>(R.id.btn_save)
        val btnRestartApp         = view.findViewById<Button>(R.id.btn_restart_app)
        val btnRestartDevice      = view.findViewById<Button>(R.id.btn_restart_device)
        val btnRemoveDeviceOwner  = view.findViewById<Button>(R.id.btn_remove_device_owner)

        // Keep references so refreshUiFromPrefs() can update them from the remote-config callback.
        vRgMode = rgMode; vRbEsp32 = rbEsp32; vRbUsb = rbUsb
        vSwKiosk = swKiosk; vEtRatePerMin = etRatePerMin; vEtSecsPerCoin = etSecsPerCoin
        vSwFloatingTimer = swFloatingTimer; vSwDeepFreeze = swDeepFreeze; vEtGrace = etGrace
        vSwAlarmWifi = swAlarmWifi; vSwAlarmCharger = swAlarmCharger
        vSwAlarmSession = swAlarmSession; vEtAlarmDelay = etAlarmDelay

        // Load current values
        etBackendUsername.setText(prefs.backendUsername)
        etBackendPassword.setText(prefs.backendPassword)
        etServerUrl.setText(prefs.serverUrl)
        etDeviceId.setText(prefs.deviceId)
        etDeviceName.setText(prefs.deviceName)
        when (prefs.connectionMode) {
            "usb" -> rbUsb.isChecked   = true
            else  -> rbEsp32.isChecked = true
        }
        swKiosk.isChecked         = prefs.isKioskModeEnabled
        etRatePerMin.setText(prefs.timerRatePerMinute.toString())
        etSecsPerCoin.setText(prefs.timerSecondsPerCoin.toString())
        swFloatingTimer.isChecked = prefs.floatingTimerEnabled
        swDeepFreeze.isChecked    = prefs.deepFreezeEnabled
        etGrace.setText(prefs.deepFreezeGracePeriodSecs.toString())
        swAlarmWifi.isChecked     = prefs.alarmOnWifiDisconnect
        swAlarmCharger.isChecked  = prefs.alarmOnChargerDisconnect
        swAlarmSession.isChecked  = prefs.alarmOnlyDuringSession
        etAlarmDelay.setText(prefs.alarmDelaySeconds.toString())
        selectedRingtoneUri       = prefs.alarmSoundUri
        if (selectedRingtoneUri.isNotEmpty()) {
            val uri  = Uri.parse(selectedRingtoneUri)
            btnAlarmSound.text = RingtoneManager.getRingtone(requireContext(), uri)?.getTitle(requireContext()) ?: "Custom"
        }

        btnAllowedApps.setOnClickListener {
            findNavController().navigate(R.id.allowedAppsFragment)
        }

        btnAlarmSound.setOnClickListener {
            val intent = Intent(RingtoneManager.ACTION_RINGTONE_PICKER).apply {
                putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_ALL)
                putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Select Alarm Sound")
                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false)
                putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true)
                if (selectedRingtoneUri.isNotEmpty())
                    putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(selectedRingtoneUri))
            }
            ringtonePicker.launch(intent)
        }

        btnChangePin.setOnClickListener { showChangePinDialog() }

        btnSave.setOnClickListener {
            val url = etServerUrl.text.toString().trim()
            val id  = etDeviceId.text.toString().trim()
            if (url.isEmpty() || id.isEmpty()) {
                Toast.makeText(requireContext(), "Server URL and Device ID are required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            // If credentials changed, clear stored token so AdminActivity re-authenticates
            val newUsername = etBackendUsername.text.toString().trim()
            val newPassword = etBackendPassword.text.toString().trim()
            if (newUsername != prefs.backendUsername || newPassword != prefs.backendPassword) {
                prefs.backendToken = ""
            }
            prefs.backendUsername        = newUsername.ifEmpty { "admin" }
            prefs.backendPassword        = newPassword.ifEmpty { "admin123" }
            prefs.serverUrl              = url
            prefs.deviceId               = id
            prefs.deviceName             = etDeviceName.text.toString().trim()
            prefs.connectionMode         = when (rgMode.checkedRadioButtonId) {
                R.id.rb_mode_usb -> "usb"
                else             -> "esp32"
            }
            prefs.isKioskModeEnabled     = swKiosk.isChecked
            prefs.timerRatePerMinute     = etRatePerMin.text.toString().toFloatOrNull() ?: 1.0f
            prefs.timerSecondsPerCoin    = etSecsPerCoin.text.toString().toIntOrNull() ?: 300
            prefs.floatingTimerEnabled   = swFloatingTimer.isChecked
            prefs.deepFreezeEnabled      = swDeepFreeze.isChecked
            prefs.deepFreezeGracePeriodSecs = etGrace.text.toString().toIntOrNull() ?: 30
            prefs.alarmOnWifiDisconnect  = swAlarmWifi.isChecked
            prefs.alarmOnChargerDisconnect = swAlarmCharger.isChecked
            prefs.alarmOnlyDuringSession = swAlarmSession.isChecked
            prefs.alarmDelaySeconds      = etAlarmDelay.text.toString().toIntOrNull() ?: 30
            prefs.alarmSoundUri          = selectedRingtoneUri

            val app = (requireActivity().application as PisoTabApp)
            app.initApi()
            val ctx = requireContext()
            ctx.stopService(Intent(ctx, com.pisotab.app.service.SyncService::class.java))
            ctx.startForegroundService(Intent(ctx, com.pisotab.app.service.SyncService::class.java))

            Toast.makeText(requireContext(), "Settings saved!", Toast.LENGTH_LONG).show()

            // Sync config fields to backend so Remote Admin reflects the local changes.
            val deviceId = prefs.deviceId
            if (deviceId.isNotEmpty() && prefs.backendToken.isNotEmpty()) {
                val req = DeviceConfigRequest(
                    connection_mode    = prefs.connectionMode,
                    rate_per_min       = prefs.timerRatePerMinute,
                    secs_per_coin      = prefs.timerSecondsPerCoin,
                    kiosk_mode         = prefs.isKioskModeEnabled,
                    floating_timer     = prefs.floatingTimerEnabled,
                    deep_freeze        = prefs.deepFreezeEnabled,
                    deep_freeze_grace  = prefs.deepFreezeGracePeriodSecs,
                    alarm_wifi         = prefs.alarmOnWifiDisconnect,
                    alarm_charger      = prefs.alarmOnChargerDisconnect,
                    alarm_session_only = prefs.alarmOnlyDuringSession,
                    alarm_delay_secs   = prefs.alarmDelaySeconds
                )
                viewLifecycleOwner.lifecycleScope.launch {
                    try { app.api.updateDeviceConfig(deviceId, req) } catch (_: Exception) {}
                }
            }
        }

        btnRestartApp.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Restart App")
                .setMessage("Restart the PisoTab app?")
                .setPositiveButton("Restart") { _, _ -> requireActivity().recreate() }
                .setNegativeButton("Cancel", null)
                .show()
        }

        btnRestartDevice.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Restart Device")
                .setMessage("This will reboot the device. Continue?")
                .setPositiveButton("Reboot") { _, _ ->
                    try {
                        val pm = requireContext().getSystemService(android.os.PowerManager::class.java)
                        pm.reboot(null)
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "Reboot requires Device Owner", Toast.LENGTH_SHORT).show()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        btnRemoveDeviceOwner.setOnClickListener {
            AlertDialog.Builder(requireContext())
                .setTitle("Remove Device Owner")
                .setMessage(
                    "This will remove PisoTab as Device Owner.\n\n" +
                    "After removal:\n" +
                    "• Kiosk mode will be disabled\n" +
                    "• The app can be uninstalled\n" +
                    "• Factory reset will be re-enabled\n\n" +
                    "The app will close after removal. Are you sure?"
                )
                .setPositiveButton("Remove") { _, _ ->
                    try {
                        val dpm = requireContext().getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
                        val admin = ComponentName(requireContext(), DeviceAdminReceiver::class.java)
                        if (dpm.isDeviceOwnerApp(requireContext().packageName)) {
                            dpm.clearDeviceOwnerApp(requireContext().packageName)
                            Toast.makeText(requireContext(), "Device Owner removed. You can now uninstall or factory reset.", Toast.LENGTH_LONG).show()
                            requireActivity().finishAffinity()
                        } else {
                            dpm.removeActiveAdmin(admin)
                            Toast.makeText(requireContext(), "Admin removed.", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        Toast.makeText(requireContext(), "Failed: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    override fun onResume() {
        super.onResume()
        // When Remote Admin pushes a config while this screen is open, refresh the UI fields.
        RemoteConfigManager.onConfigChanged = {
            Handler(Looper.getMainLooper()).post { refreshUiFromPrefs() }
        }
    }

    override fun onPause() {
        super.onPause()
        RemoteConfigManager.onConfigChanged = null
    }

    override fun onDestroyView() {
        super.onDestroyView()
        vRgMode = null; vRbEsp32 = null; vRbUsb = null
        vSwKiosk = null; vEtRatePerMin = null; vEtSecsPerCoin = null
        vSwFloatingTimer = null; vSwDeepFreeze = null; vEtGrace = null
        vSwAlarmWifi = null; vSwAlarmCharger = null
        vSwAlarmSession = null; vEtAlarmDelay = null
    }

    private fun refreshUiFromPrefs() {
        when (prefs.connectionMode) {
            "usb" -> vRbUsb?.isChecked   = true
            else  -> vRbEsp32?.isChecked = true
        }
        vSwKiosk?.isChecked        = prefs.isKioskModeEnabled
        vEtRatePerMin?.setText(prefs.timerRatePerMinute.toString())
        vEtSecsPerCoin?.setText(prefs.timerSecondsPerCoin.toString())
        vSwFloatingTimer?.isChecked = prefs.floatingTimerEnabled
        vSwDeepFreeze?.isChecked    = prefs.deepFreezeEnabled
        vEtGrace?.setText(prefs.deepFreezeGracePeriodSecs.toString())
        vSwAlarmWifi?.isChecked     = prefs.alarmOnWifiDisconnect
        vSwAlarmCharger?.isChecked  = prefs.alarmOnChargerDisconnect
        vSwAlarmSession?.isChecked  = prefs.alarmOnlyDuringSession
        vEtAlarmDelay?.setText(prefs.alarmDelaySeconds.toString())
        Toast.makeText(requireContext(), "Settings updated from Remote Admin", Toast.LENGTH_SHORT).show()
    }

    private fun showChangePinDialog() {
        val layout = LinearLayout(requireContext()).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 0)
        }
        val etCurrent = EditText(requireContext()).apply { hint = "Current PIN"; inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD }
        val etNew     = EditText(requireContext()).apply { hint = "New PIN"; inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD }
        val etConfirm = EditText(requireContext()).apply { hint = "Confirm New PIN"; inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD }
        layout.addView(etCurrent); layout.addView(etNew); layout.addView(etConfirm)

        AlertDialog.Builder(requireContext())
            .setTitle("Change Admin PIN")
            .setView(layout)
            .setPositiveButton("Change") { _, _ ->
                when {
                    etCurrent.text.toString() != prefs.adminPin ->
                        Toast.makeText(requireContext(), "Wrong current PIN", Toast.LENGTH_SHORT).show()
                    etNew.text.toString().length < 4 ->
                        Toast.makeText(requireContext(), "PIN must be at least 4 digits", Toast.LENGTH_SHORT).show()
                    etNew.text.toString() != etConfirm.text.toString() ->
                        Toast.makeText(requireContext(), "PINs do not match", Toast.LENGTH_SHORT).show()
                    else -> {
                        prefs.adminPin = etNew.text.toString()
                        Toast.makeText(requireContext(), "PIN changed!", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
