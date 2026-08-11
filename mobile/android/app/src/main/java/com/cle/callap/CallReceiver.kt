package com.cle.callap

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.CallLog
import android.telephony.TelephonyManager
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject
import kotlin.concurrent.thread

class CallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        Log.d("CallReceiver", "Phone state changed: $state")

        if (TelephonyManager.EXTRA_STATE_IDLE == state) {
            // Wait 1.5 seconds for Android to write to the call log database
            thread {
                try {
                    Thread.sleep(1500)
                    processLatestCallLog(context)
                } catch (e: Exception) {
                    Log.e("CallReceiver", "Error processing call log", e)
                }
            }
        }
    }

    private fun processLatestCallLog(context: Context) {
        val sharedPref = context.getSharedPreferences("app_config", Context.MODE_PRIVATE)
        val apiUrl = sharedPref.getString("apiUrl", "") ?: ""
        val username = sharedPref.getString("username", "Admin (Auto)") ?: "Admin (Auto)"

        if (apiUrl.isEmpty()) {
            Log.w("CallReceiver", "API URL is not configured. Skipping call log check.")
            return
        }

        try {
            val cursor = context.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION
                ),
                null,
                null,
                CallLog.Calls.DATE + " DESC LIMIT 1"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val number = it.getString(it.getColumnIndexOrThrow(CallLog.Calls.NUMBER))
                    val type = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.TYPE))
                    val dateMs = it.getLong(it.getColumnIndexOrThrow(CallLog.Calls.DATE))
                    val duration = it.getInt(it.getColumnIndexOrThrow(CallLog.Calls.DURATION))

                    Log.d("CallReceiver", "Latest call: $number, type: $type, dateMs: $dateMs")

                    // Missed call type is CallLog.Calls.MISSED_TYPE (3)
                    // Rejected call type is CallLog.Calls.REJECTED_TYPE (5)
                    if (type == CallLog.Calls.MISSED_TYPE || type == 5) {
                        // Send to server
                        postCallLogToServer(apiUrl, username, number, dateMs, duration)
                    } else {
                        Log.d("CallReceiver", "Call was not missed or rejected (type: $type)")
                    }
                }
            }
        } catch (e: SecurityException) {
            Log.e("CallReceiver", "Permission READ_CALL_LOG not granted or missing.", e)
        } catch (e: Exception) {
            Log.e("CallReceiver", "Error reading call log database", e)
        }
    }

    private fun postCallLogToServer(apiUrl: String, username: String, number: String, dateMs: Long, duration: Int) {
        try {
            // Preserve local timezone and date format (YYYY-MM-DD)
            val callDate = java.util.Date(dateMs)
            val sdfDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
            val sdfTime = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
            
            val dateStr = sdfDate.format(callDate)
            val timeStr = sdfTime.format(callDate)

            val url = URL("$apiUrl/api/mobile/call-log")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json; utf-8")
            conn.setRequestProperty("Accept", "application/json")
            conn.doOutput = true

            val json = JSONObject().apply {
                put("caller_number", number)
                put("call_date", dateStr)
                put("call_time", timeStr)
                put("submitted_by", username)
                put("notes", "Auto-posted by Native Background CallReceiver. Duration: ${duration}s")
            }

            OutputStreamWriter(conn.outputStream, "UTF-8").use { writer ->
                writer.write(json.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            Log.i("CallReceiver", "Post missed call response code: $responseCode")
            conn.disconnect()
        } catch (e: Exception) {
            Log.e("CallReceiver", "Error posting call log to server", e)
        }
    }
}
