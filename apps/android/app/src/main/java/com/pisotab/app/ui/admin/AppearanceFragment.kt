package com.pisotab.app.ui.admin

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatDelegate
import androidx.appcompat.widget.SwitchCompat
import androidx.fragment.app.Fragment
import com.pisotab.app.PisoTabApp
import com.pisotab.app.R
import com.pisotab.app.ui.anim.AnimationPreset
import com.pisotab.app.util.ThemeManager
import com.pisotab.app.util.WallpaperManager

class AppearanceFragment : Fragment() {

    private lateinit var swDarkMode: SwitchCompat
    private lateinit var etBusinessName: EditText
    private lateinit var rgTheme: RadioGroup
    private lateinit var rbOrange: RadioButton
    private lateinit var rbBlue: RadioButton
    private lateinit var rbGreen: RadioButton
    private lateinit var rgAnimationPreset: RadioGroup
    private lateinit var rgWallpaperPreset: RadioGroup
    private lateinit var btnPickWallpaper: Button
    private lateinit var btnClearWallpaper: Button
    private lateinit var ivWallpaperPreview: ImageView
    private lateinit var btnPickVideo: Button
    private lateinit var btnClearVideo: Button
    private lateinit var tvVideoName: TextView
    private lateinit var etVideoDelay: EditText
    private lateinit var swVideoSound: SwitchCompat
    private lateinit var swVideoLandscape: SwitchCompat
    private lateinit var btnSave: Button
    private lateinit var btnReset: Button

    private val prefs get() = (requireActivity().application as PisoTabApp).prefs

    private val wallpaperPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        requireContext().contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        prefs.portraitWallpaperUri = uri.toString()
        showWallpaperPreview(uri)
    }

    private val videoPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        requireContext().contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        prefs.lockScreenVideoUri = uri.toString()
        tvVideoName.text = uri.lastPathSegment ?: "Video selected"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_appearance, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        swDarkMode        = view.findViewById(R.id.sw_dark_mode)
        etBusinessName    = view.findViewById(R.id.et_business_name)
        rgTheme           = view.findViewById(R.id.rg_theme)
        rbOrange          = view.findViewById(R.id.rb_theme_orange)
        rbBlue            = view.findViewById(R.id.rb_theme_blue)
        rbGreen           = view.findViewById(R.id.rb_theme_green)
        rgAnimationPreset = view.findViewById(R.id.rg_animation_preset)
        rgWallpaperPreset = view.findViewById(R.id.rg_wallpaper_preset)
        btnPickWallpaper  = view.findViewById(R.id.btn_pick_wallpaper)
        btnClearWallpaper = view.findViewById(R.id.btn_clear_wallpaper)
        ivWallpaperPreview = view.findViewById(R.id.iv_wallpaper_preview)
        btnPickVideo      = view.findViewById(R.id.btn_pick_video)
        btnClearVideo     = view.findViewById(R.id.btn_clear_video)
        tvVideoName       = view.findViewById(R.id.tv_video_name)
        etVideoDelay      = view.findViewById(R.id.et_video_delay)
        swVideoSound      = view.findViewById(R.id.sw_video_sound)
        swVideoLandscape  = view.findViewById(R.id.sw_video_landscape)
        btnSave           = view.findViewById(R.id.btn_save_appearance)
        btnReset          = view.findViewById(R.id.btn_reset_appearance)

        loadCurrentValues()

        swDarkMode.setOnCheckedChangeListener { _, checked ->
            prefs.isDarkMode = checked
            AppCompatDelegate.setDefaultNightMode(
                if (checked) AppCompatDelegate.MODE_NIGHT_YES else AppCompatDelegate.MODE_NIGHT_NO
            )
            requireActivity().recreate()
        }

        btnPickWallpaper.setOnClickListener  { wallpaperPicker.launch(arrayOf("image/*")) }
        btnClearWallpaper.setOnClickListener {
            prefs.portraitWallpaperUri = ""
            ivWallpaperPreview.visibility = View.GONE
        }
        btnPickVideo.setOnClickListener  { videoPicker.launch(arrayOf("video/*")) }
        btnClearVideo.setOnClickListener {
            prefs.lockScreenVideoUri = ""
            tvVideoName.text = "No video selected"
        }

        btnSave.setOnClickListener  { save() }
        btnReset.setOnClickListener { reset() }
    }

    private fun loadCurrentValues() {
        swDarkMode.isChecked = prefs.isDarkMode
        etBusinessName.setText(prefs.businessName)
        when (prefs.themeId) {
            ThemeManager.THEME_BLUE  -> rbBlue.isChecked  = true
            ThemeManager.THEME_GREEN -> rbGreen.isChecked = true
            else                     -> rbOrange.isChecked = true
        }
        // Animation preset: coins (1), stars (3), circuit (4)
        val animId = when (prefs.animationPreset) {
            AnimationPreset.COINS   -> R.id.rb_anim_coins
            AnimationPreset.STARS   -> R.id.rb_anim_stars
            AnimationPreset.CIRCUIT -> R.id.rb_anim_circuit
            else                    -> R.id.rb_anim_none
        }
        rgAnimationPreset.check(animId)
        // Wallpaper presets: custom (0), galaxy (1), cyber (2), lava (3)
        val wpId = when (prefs.wallpaperPreset) {
            WallpaperManager.PRESET_GALAXY -> R.id.rb_wp_galaxy
            WallpaperManager.PRESET_CYBER  -> R.id.rb_wp_cyber
            WallpaperManager.PRESET_LAVA   -> R.id.rb_wp_lava
            else                           -> R.id.rb_wp_custom
        }
        rgWallpaperPreset.check(wpId)

        if (prefs.portraitWallpaperUri.isNotEmpty()) {
            showWallpaperPreview(Uri.parse(prefs.portraitWallpaperUri))
        }
        val videoUri = prefs.lockScreenVideoUri
        if (videoUri.isNotEmpty()) {
            tvVideoName.text = Uri.parse(videoUri).lastPathSegment ?: "Video selected"
        }
        etVideoDelay.setText(prefs.lockScreenVideoDelaySecs.toString())
        swVideoSound.isChecked     = prefs.lockScreenVideoSound
        swVideoLandscape.isChecked = prefs.idleVideoLandscape
    }

    private fun save() {
        prefs.businessName = etBusinessName.text.toString().ifBlank { "JJT PisoTab" }
        prefs.themeId = when (rgTheme.checkedRadioButtonId) {
            R.id.rb_theme_blue  -> ThemeManager.THEME_BLUE
            R.id.rb_theme_green -> ThemeManager.THEME_GREEN
            else                -> ThemeManager.THEME_ORANGE
        }
        prefs.animationPreset = when (rgAnimationPreset.checkedRadioButtonId) {
            R.id.rb_anim_coins   -> AnimationPreset.COINS
            R.id.rb_anim_stars   -> AnimationPreset.STARS
            R.id.rb_anim_circuit -> AnimationPreset.CIRCUIT
            else                 -> AnimationPreset.NONE
        }
        prefs.wallpaperPreset = when (rgWallpaperPreset.checkedRadioButtonId) {
            R.id.rb_wp_galaxy -> WallpaperManager.PRESET_GALAXY
            R.id.rb_wp_cyber  -> WallpaperManager.PRESET_CYBER
            R.id.rb_wp_lava   -> WallpaperManager.PRESET_LAVA
            else              -> WallpaperManager.PRESET_CUSTOM
        }
        prefs.lockScreenVideoDelaySecs = etVideoDelay.text.toString().toIntOrNull()?.coerceAtLeast(0) ?: 0
        prefs.lockScreenVideoSound     = swVideoSound.isChecked
        prefs.idleVideoLandscape       = swVideoLandscape.isChecked
        Toast.makeText(requireContext(), "Appearance saved. Restart app to apply.", Toast.LENGTH_LONG).show()
    }

    private fun reset() {
        prefs.businessName         = "JJT PisoTab"
        prefs.isDarkMode           = true
        prefs.themeId              = ThemeManager.THEME_GREEN
        prefs.animationPreset      = AnimationPreset.NONE
        prefs.wallpaperPreset      = WallpaperManager.PRESET_LAVA
        prefs.portraitWallpaperUri    = ""
        prefs.lockScreenVideoUri       = ""
        prefs.lockScreenVideoDelaySecs = 0
        prefs.lockScreenVideoSound     = false
        prefs.idleVideoLandscape       = false
        loadCurrentValues()
        Toast.makeText(requireContext(), "Reset to defaults.", Toast.LENGTH_SHORT).show()
    }

    private fun showWallpaperPreview(uri: Uri) {
        ivWallpaperPreview.setImageURI(uri)
        ivWallpaperPreview.visibility = View.VISIBLE
    }
}
