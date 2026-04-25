package com.pisotab.app.ui

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R

class SetupActivity : AppCompatActivity() {

    private val prefs get() = (application as PisoTabApp).prefs
    private var selectedRingtoneUri: String = ""

    private val ringtonePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val uri: Uri? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU)
                result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI, Uri::class.java)
            else
                @Suppress("DEPRECATION") result.data?.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            if (uri != null) {
                selectedRingtoneUri = uri.toString()
                val name = RingtoneManager.getRingtone(this, uri)?.getTitle(this) ?: "Custom"
                findViewById<Button>(R.id.btn_alarm_sound).text = name
            } else {
                // User picked "None" or silent
                selectedRingtoneUri = ""
                findViewById<Button>(R.id.btn_alarm_sound).text = "Default Alarm"
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        val etServerUrl        = findViewById<EditText>(R.id.et_server_url)
        val etDeviceId         = findViewById<EditText>(R.id.et_device_id)
        val etDeviceName       = findViewById<EditText>(R.id.et_device_name)
        val etAdminPin         = findViewById<EditText>(R.id.et_admin_pin)
        val swKiosk               = findViewById<Switch>(R.id.sw_kiosk)
        val swAlarmWifi           = findViewById<Switch>(R.id.sw_alarm_wifi)
        val swAlarmCharger        = findViewById<Switch>(R.id.sw_alarm_charger)
        val swAlarmSessionOnly    = findViewById<Switch>(R.id.sw_alarm_session_only)
        val etAlarmDelay          = findViewById<EditText>(R.id.et_alarm_delay)
        val btnAlarmSound         = findViewById<Button>(R.id.btn_alarm_sound)
        val swFloatingTimer       = findViewById<Switch>(R.id.sw_floating_timer)
        val tvOverlayPermHint     = findViewById<TextView>(R.id.tv_overlay_permission_hint)
        val btnSave               = findViewById<Button>(R.id.btn_save)
        val btnBack               = findViewById<Button>(R.id.btn_back)

        // Load current values
        etServerUrl.setText(prefs.serverUrl)
        etDeviceId.setText(prefs.deviceId)
        etDeviceName.setText(prefs.deviceName)
        etAdminPin.setText(prefs.adminPin)
        swKiosk.isChecked            = prefs.isKioskModeEnabled
        swAlarmWifi.isChecked        = prefs.alarmOnWifiDisconnect
        swAlarmCharger.isChecked     = prefs.alarmOnChargerDisconnect
        swAlarmSessionOnly.isChecked = prefs.alarmOnlyDuringSession
        etAlarmDelay.setText(prefs.alarmDelaySeconds.toString())
        swFloatingTimer.isChecked    = prefs.floatingTimerEnabled

        // Show green confirmation when permission is already granted and switch is ON
        fun updateOverlayHint() {
            val hasPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                Settings.canDrawOverlays(this)
            tvOverlayPermHint.visibility =
                if (swFloatingTimer.isChecked && hasPermission) View.VISIBLE else View.GONE
        }
        updateOverlayHint()

        // When user enables the switch, check for overlay permission.
        // For Device Owner / sideloaded apps the Android UI toggle is always blocked —
        // the permission must be granted once via ADB instead.
        swFloatingTimer.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                !Settings.canDrawOverlays(this)) {
                // Uncheck immediately — can't use the feature until ADB command is run
                swFloatingTimer.isChecked = false
                AlertDialog.Builder(this)
                    .setTitle("ADB Permission Required")
                    .setMessage(
                        "Android blocks 'Display over other apps' for Device Owner apps " +
                        "through the Settings UI.\n\n" +
                        "Run this command once on your PC (same ADB connection used to set up kiosk mode):\n\n" +
                        "adb shell appops set $packageName SYSTEM_ALERT_WINDOW allow\n\n" +
                        "After running it, come back here and enable the switch — it will work."
                    )
                    .setPositiveButton("OK", null)
                    .show()
            } else {
                updateOverlayHint()
            }
        }

        // Show current ringtone name
        selectedRingtoneUri = prefs.alarmSoundUri
        if (selectedRingtoneUri.isNotEmpty()) {
            val uri = Uri.parse(selectedRingtoneUri)
            val name = RingtoneManager.getRingtone(this, uri)?.getTitle(this) ?: "Custom"
            btnAlarmSound.text = name
        }

        // Open system ringtone picker
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

        btnSave.setOnClickListener {
            val serverUrl = etServerUrl.text.toString().trim()
            val deviceId  = etDeviceId.text.toString().trim()
            if (serverUrl.isEmpty() || deviceId.isEmpty()) {
                Toast.makeText(this, "Server URL and Device ID are required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.serverUrl                = serverUrl
            prefs.deviceId                 = deviceId
            prefs.deviceName               = etDeviceName.text.toString().trim()
            prefs.adminPin                 = etAdminPin.text.toString().ifEmpty { "1234" }
            prefs.isKioskModeEnabled       = swKiosk.isChecked
            prefs.alarmOnWifiDisconnect    = swAlarmWifi.isChecked
            prefs.alarmOnChargerDisconnect = swAlarmCharger.isChecked
            prefs.alarmOnlyDuringSession   = swAlarmSessionOnly.isChecked
            prefs.alarmDelaySeconds        = etAlarmDelay.text.toString().toIntOrNull() ?: 30
            prefs.alarmSoundUri            = selectedRingtoneUri
            prefs.floatingTimerEnabled     = swFloatingTimer.isChecked

            (application as PisoTabApp).initApi()
            stopService(Intent(this, com.pisotab.app.service.SyncService::class.java))
            startForegroundService(Intent(this, com.pisotab.app.service.SyncService::class.java))

            Toast.makeText(this, "Settings saved!", Toast.LENGTH_LONG).show()
            finish()
        }

        btnBack.setOnClickListener { finish() }
    }
}
