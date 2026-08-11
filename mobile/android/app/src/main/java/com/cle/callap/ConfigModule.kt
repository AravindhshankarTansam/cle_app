package com.cle.callap

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ConfigModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "ConfigModule"

    @ReactMethod
    fun setConfig(apiUrl: String, username: String) {
        val sharedPref = reactApplicationContext.getSharedPreferences("app_config", Context.MODE_PRIVATE)
        with (sharedPref.edit()) {
            putString("apiUrl", apiUrl)
            putString("username", username)
            apply()
        }
    }
}
