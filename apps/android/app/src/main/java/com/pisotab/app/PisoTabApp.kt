package com.pisotab.app

import android.app.Application
import androidx.room.Room
import com.pisotab.app.data.local.AppDatabase
import com.pisotab.app.data.remote.ApiService
import com.pisotab.app.util.PrefsManager
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class PisoTabApp : Application() {

    lateinit var prefs: PrefsManager
    lateinit var database: AppDatabase
    lateinit var api: ApiService

    override fun onCreate() {
        super.onCreate()
        instance = this
        prefs = PrefsManager(this)
        initDatabase()
        initApi()
    }

    fun initApi() {
        val baseUrl = prefs.serverUrl.let { if (it.endsWith('/')) it else "$it/" }
        val token   = prefs.backendToken

        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder().apply {
                    if (token.isNotEmpty()) {
                        header("Authorization", "Bearer $token")
                    }
                }.build()
                chain.proceed(request)
            }
            .build()

        api = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    private fun initDatabase() {
        database = Room.databaseBuilder(this, AppDatabase::class.java, "pisotab.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    companion object {
        lateinit var instance: PisoTabApp
    }
}
