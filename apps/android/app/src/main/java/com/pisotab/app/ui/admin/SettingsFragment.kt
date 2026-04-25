package com.pisotab.app.ui.admin

import android.app.Activity
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R

class SettingsFragment : Fragment() {

    private val prefs get() = (requireActivity().application as PisoTabApp).prefs
    private var selectedRingtoneUri: String = ""

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
        val btnRestartApp    = view.findViewById<Button>(R.id.btn_restart_app)
        val btnRestartDevice = view.findViewById<Button>(R.id.btn_restart_device)

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

            (requireActivity().application as PisoTabApp).initApi()
            val ctx = requireContext()
            ctx.stopService(Intent(ctx, com.pisotab.app.service.SyncService::class.java))
            ctx.startForegroundService(Intent(ctx, com.pisotab.app.service.SyncService::class.java))

            Toast.makeText(requireContext(), "Settings saved!", Toast.LENGTH_LONG).show()
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
