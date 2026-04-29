package com.pisotab.app.ui.admin

import android.app.Activity
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
    private lateinit var btnPickPortrait: Button
    private lateinit var btnClearPortrait: Button
    private lateinit var ivPortraitPreview: ImageView
    private lateinit var btnPickLandscape: Button
    private lateinit var btnClearLandscape: Button
    private lateinit var ivLandscapePreview: ImageView
    private lateinit var btnPickAudio: Button
    private lateinit var btnClearAudio: Button
    private lateinit var tvAudioName: TextView
    private lateinit var btnSave: Button
    private lateinit var btnReset: Button

    private val prefs get() = (requireActivity().application as PisoTabApp).prefs

    private val portraitPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        requireContext().contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        prefs.portraitWallpaperUri = uri.toString()
        showPortraitPreview(uri)
    }

    private val landscapePicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        requireContext().contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        prefs.landscapeWallpaperUri = uri.toString()
        showLandscapePreview(uri)
    }

    private val audioPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        uri ?: return@registerForActivityResult
        requireContext().contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        prefs.lockScreenAudioUri = uri.toString()
        tvAudioName.text = uri.lastPathSegment ?: "Audio selected"
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        return inflater.inflate(R.layout.fragment_appearance, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        swDarkMode       = view.findViewById(R.id.sw_dark_mode)
        etBusinessName   = view.findViewById(R.id.et_business_name)
        rgTheme          = view.findViewById(R.id.rg_theme)
        rbOrange         = view.findViewById(R.id.rb_theme_orange)
        rbBlue           = view.findViewById(R.id.rb_theme_blue)
        rbGreen          = view.findViewById(R.id.rb_theme_green)
        rgAnimationPreset = view.findViewById(R.id.rg_animation_preset)
        rgWallpaperPreset = view.findViewById(R.id.rg_wallpaper_preset)
        btnPickPortrait  = view.findViewById(R.id.btn_pick_portrait)
        btnClearPortrait = view.findViewById(R.id.btn_clear_portrait)
        ivPortraitPreview  = view.findViewById(R.id.iv_portrait_preview)
        btnPickLandscape = view.findViewById(R.id.btn_pick_landscape)
        btnClearLandscape  = view.findViewById(R.id.btn_clear_landscape)
        ivLandscapePreview = view.findViewById(R.id.iv_landscape_preview)
        btnPickAudio     = view.findViewById(R.id.btn_pick_audio)
        btnClearAudio    = view.findViewById(R.id.btn_clear_audio)
        tvAudioName      = view.findViewById(R.id.tv_audio_name)
        btnSave          = view.findViewById(R.id.btn_save_appearance)
        btnReset         = view.findViewById(R.id.btn_reset_appearance)

        loadCurrentValues()

        swDarkMode.setOnCheckedChangeListener { _, checked ->
            prefs.isDarkMode = checked
            AppCompatDelegate.setDefaultNightMode(
                if (checked) AppCompatDelegate.MODE_NIGHT_YES
                else AppCompatDelegate.MODE_NIGHT_NO
            )
            requireActivity().recreate()
        }

        btnPickPortrait.setOnClickListener  { portraitPicker.launch(arrayOf("image/*")) }
        btnClearPortrait.setOnClickListener {
            prefs.portraitWallpaperUri = ""
            ivPortraitPreview.visibility = View.GONE
        }
        btnPickLandscape.setOnClickListener { landscapePicker.launch(arrayOf("image/*")) }
        btnClearLandscape.setOnClickListener {
            prefs.landscapeWallpaperUri = ""
            ivLandscapePreview.visibility = View.GONE
        }
        btnPickAudio.setOnClickListener { audioPicker.launch(arrayOf("audio/*")) }
        btnClearAudio.setOnClickListener {
            prefs.lockScreenAudioUri = ""
            tvAudioName.text = "No audio selected"
        }

        btnSave.setOnClickListener { save() }
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
        // Animation preset
        val animRadioId = when (prefs.animationPreset) {
            1    -> R.id.rb_anim_coins
            2    -> R.id.rb_anim_pulse
            3    -> R.id.rb_anim_stars
            else -> R.id.rb_anim_none
        }
        rgAnimationPreset.check(animRadioId)
        // Wallpaper preset
        val wpRadioId = when (prefs.wallpaperPreset) {
            1    -> R.id.rb_wp_galaxy
            2    -> R.id.rb_wp_circuit
            3    -> R.id.rb_wp_neon
            else -> R.id.rb_wp_custom
        }
        rgWallpaperPreset.check(wpRadioId)
        if (prefs.portraitWallpaperUri.isNotEmpty()) {
            showPortraitPreview(Uri.parse(prefs.portraitWallpaperUri))
        }
        if (prefs.landscapeWallpaperUri.isNotEmpty()) {
            showLandscapePreview(Uri.parse(prefs.landscapeWallpaperUri))
        }
        if (prefs.lockScreenAudioUri.isNotEmpty()) {
            tvAudioName.text = Uri.parse(prefs.lockScreenAudioUri).lastPathSegment ?: "Audio selected"
        }
    }

    private fun save() {
        prefs.businessName = etBusinessName.text.toString().ifBlank { "JJT PisoTab" }
        prefs.themeId = when (rgTheme.checkedRadioButtonId) {
            R.id.rb_theme_blue  -> ThemeManager.THEME_BLUE
            R.id.rb_theme_green -> ThemeManager.THEME_GREEN
            else                -> ThemeManager.THEME_ORANGE
        }
        prefs.animationPreset = when (rgAnimationPreset.checkedRadioButtonId) {
            R.id.rb_anim_coins -> 1
            R.id.rb_anim_pulse -> 2
            R.id.rb_anim_stars -> 3
            else               -> 0
        }
        prefs.wallpaperPreset = when (rgWallpaperPreset.checkedRadioButtonId) {
            R.id.rb_wp_galaxy   -> 1
            R.id.rb_wp_circuit  -> 2
            R.id.rb_wp_neon     -> 3
            else                -> 0
        }
        Toast.makeText(requireContext(), "Appearance saved. Restart app to apply.", Toast.LENGTH_LONG).show()
    }

    private fun reset() {
        prefs.businessName          = "JJT PisoTab"
        prefs.isDarkMode            = true
        prefs.themeId               = ThemeManager.THEME_ORANGE
        prefs.animationPreset       = 0
        prefs.wallpaperPreset       = 0
        prefs.portraitWallpaperUri  = ""
        prefs.landscapeWallpaperUri = ""
        prefs.lockScreenAudioUri    = ""
        loadCurrentValues()
        Toast.makeText(requireContext(), "Reset to defaults.", Toast.LENGTH_SHORT).show()
    }

    private fun showPortraitPreview(uri: Uri) {
        ivPortraitPreview.setImageURI(uri)
        ivPortraitPreview.visibility = View.VISIBLE
    }

    private fun showLandscapePreview(uri: Uri) {
        ivLandscapePreview.setImageURI(uri)
        ivLandscapePreview.visibility = View.VISIBLE
    }
}
