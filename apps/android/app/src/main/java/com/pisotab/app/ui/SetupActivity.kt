package com.pisotab.app.ui

import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R

class SetupActivity : AppCompatActivity() {

    private val prefs get() = (application as PisoTabApp).prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        val etDeviceId   = findViewById<EditText>(R.id.et_device_id)
        val etDeviceName = findViewById<EditText>(R.id.et_device_name)
        val etAdminPin   = findViewById<EditText>(R.id.et_admin_pin)
        val btnSave      = findViewById<Button>(R.id.btn_save)
        val btnBack      = findViewById<Button>(R.id.btn_back)

        // Load current values
        etDeviceId.setText(prefs.deviceId)
        etDeviceName.setText(prefs.deviceName)
        etAdminPin.setText(prefs.adminPin)

        btnSave.setOnClickListener {
            val deviceId = etDeviceId.text.toString().trim()
            if (deviceId.isEmpty()) {
                Toast.makeText(this, "Device ID is required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.deviceId   = deviceId
            prefs.deviceName = etDeviceName.text.toString().trim()
            prefs.adminPin   = etAdminPin.text.toString().ifEmpty { "1234" }

            (application as PisoTabApp).initApi()
            stopService(Intent(this, com.pisotab.app.service.SyncService::class.java))
            startForegroundService(Intent(this, com.pisotab.app.service.SyncService::class.java))

            Toast.makeText(this, "Setup complete!", Toast.LENGTH_SHORT).show()
            finish()
        }

        btnBack.setOnClickListener { finish() }
    }
}
