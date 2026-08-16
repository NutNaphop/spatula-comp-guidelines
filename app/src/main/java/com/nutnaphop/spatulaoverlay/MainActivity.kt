package com.nutnaphop.spatulaoverlay

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * The launcher screen exists only to grant the overlay permission and start
 * or stop the bubble - everything else happens in the floating panel.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var status: TextView
    private lateinit var action: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        status = findViewById(R.id.status)
        action = findViewById(R.id.action)

        action.setOnClickListener {
            if (canDrawOverlays()) startBubble() else requestOverlayPermission()
        }
        findViewById<Button>(R.id.stop).setOnClickListener {
            startService(
                Intent(this, OverlayService::class.java).setAction(OverlayService.ACTION_STOP)
            )
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    private fun render() {
        val granted = canDrawOverlays()
        status.setText(if (granted) R.string.status_ready else R.string.status_need_permission)
        action.setText(if (granted) R.string.start else R.string.grant)
    }

    private fun canDrawOverlays() = Settings.canDrawOverlays(this)

    private fun requestOverlayPermission() {
        // Sends the user to the system screen; there is no in-app way to
        // grant this, by design.
        startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName"),
            )
        )
    }

    private fun startBubble() {
        ContextCompat.startForegroundService(this, Intent(this, OverlayService::class.java))
        // get out of the way so the user lands back on the game
        moveTaskToBack(true)
    }
}
