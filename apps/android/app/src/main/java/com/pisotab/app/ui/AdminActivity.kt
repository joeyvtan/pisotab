package com.pisotab.app.ui

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.MenuItem
import android.widget.TextView
import androidx.appcompat.app.ActionBarDrawerToggle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.Toolbar
import androidx.drawerlayout.widget.DrawerLayout
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.NavigationUI
import com.google.android.material.navigation.NavigationView
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import com.pisotab.app.data.remote.LoginRequest
import com.pisotab.app.util.KioskManager
import com.pisotab.app.util.ThemeManager
import kotlinx.coroutines.launch

class AdminActivity : AppCompatActivity() {

    private lateinit var drawerLayout: DrawerLayout
    private lateinit var navView: NavigationView
    private lateinit var toolbar: Toolbar
    private var licenseDialog: AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        ThemeManager.applyTheme(this)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin)

        drawerLayout = findViewById(R.id.drawer_layout)
        navView      = findViewById(R.id.nav_view)
        toolbar      = findViewById(R.id.toolbar)
        setSupportActionBar(toolbar)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        // Hamburger icon toggle
        val toggle = ActionBarDrawerToggle(
            this, drawerLayout, toolbar,
            R.string.nav_open, R.string.nav_close
        )
        drawerLayout.addDrawerListener(toggle)
        toggle.syncState()

        // Auto-navigate to matching fragment when a menu item is tapped.
        // WiFi (action_wifi) is excluded — handled manually below.
        NavigationUI.setupWithNavController(navView, navController)

        // WiFi menu item — open system WiFi settings instead of a fragment
        navView.setNavigationItemSelectedListener { item ->
            if (item.itemId == R.id.action_wifi) {
                startActivity(Intent(Settings.ACTION_WIFI_SETTINGS))
                drawerLayout.closeDrawers()
                true
            } else {
                val handled = NavigationUI.onNavDestinationSelected(item, navController)
                if (handled) drawerLayout.closeDrawers()
                handled
            }
        }

        // Authenticate with backend if no token stored yet
        authenticateIfNeeded()

        // Update business name in sidebar header
        val prefs = (application as PisoTabApp).prefs
        navView.getHeaderView(0)
            ?.findViewById<TextView>(R.id.tv_business_name)
            ?.text = prefs.businessName

        // Update toolbar title on destination change
        navController.addOnDestinationChangedListener { _, destination, _ ->
            supportActionBar?.title = destination.label
        }
    }

    private fun authenticateIfNeeded() {
        val app   = application as PisoTabApp
        val prefs = app.prefs

        // Token already stored — rebuild API with it and skip re-login
        if (prefs.backendToken.isNotEmpty()) {
            app.initApi()
            return
        }

        lifecycleScope.launch {
            try {
                val response = app.api.login(
                    LoginRequest(prefs.backendUsername, prefs.backendPassword)
                )
                if (response.isSuccessful) {
                    val token = response.body()?.token ?: return@launch
                    prefs.backendToken = token
                    app.initApi()   // rebuild Retrofit with the new token
                    Log.d("AdminActivity", "Authenticated with backend")
                } else {
                    Log.e("AdminActivity", "Login failed: ${response.code()} — check backendUsername/backendPassword in Settings")
                }
            } catch (e: Exception) {
                Log.e("AdminActivity", "Login error: ${e.message}")
            }
        }
    }

    override fun onResume() {
        super.onResume()
        checkLicenseEnforcement()
    }

    private fun checkLicenseEnforcement() {
        val app = application as PisoTabApp
        val deviceId = app.prefs.deviceId
        if (deviceId.isEmpty()) return
        // Skip check if dialog already visible
        if (licenseDialog?.isShowing == true) return

        lifecycleScope.launch {
            try {
                val resp = app.api.checkLicense(deviceId)
                if (resp.isSuccessful && resp.body()?.status == "trial_expired") {
                    showLicenseExpiredDialog()
                }
            } catch (_: Exception) {
                // Network unavailable — don't block (offline benefit of doubt)
            }
        }
    }

    private fun showLicenseExpiredDialog() {
        if (isFinishing || isDestroyed) return
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
        licenseDialog = AlertDialog.Builder(this)
            .setTitle("Trial Expired")
            .setMessage("Your 7-day trial has ended.\n\nEnter a license key in About to keep using JJT PisoTab.")
            .setPositiveButton("Activate License") { _, _ ->
                navHostFragment?.navController?.navigate(R.id.aboutFragment)
                drawerLayout.closeDrawers()
            }
            .setCancelable(false)
            .create()
        licenseDialog?.show()
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            if (drawerLayout.isOpen) drawerLayout.closeDrawers()
            else drawerLayout.open()
            return true
        }
        return super.onOptionsItemSelected(item)
    }

    override fun onDestroy() {
        super.onDestroy()
        // Re-apply kiosk lock when admin panel closes
        val prefs = (application as PisoTabApp).prefs
        if (prefs.isKioskModeEnabled) {
            KioskManager.disableSettings(this)
        }
    }
}
