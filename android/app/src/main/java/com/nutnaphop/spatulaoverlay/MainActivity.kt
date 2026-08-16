package com.nutnaphop.spatulaoverlay

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat

/**
 * The launcher screen exists only to grant the overlay permission and start
 * or stop the bubble - everything else happens in the floating panel.
 */
class MainActivity : ComponentActivity() {

    private var canOverlay by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SpatulaTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    HomeScreen(
                        canOverlay = canOverlay,
                        onPrimary = {
                            if (canOverlay) startBubble() else requestOverlayPermission()
                        },
                        onStop = ::stopBubble,
                    )
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        canOverlay = Settings.canDrawOverlays(this)
    }

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

    private fun stopBubble() {
        startService(
            Intent(this, OverlayService::class.java).setAction(OverlayService.ACTION_STOP)
        )
        finish()
    }
}

@Composable
private fun HomeScreen(canOverlay: Boolean, onPrimary: () -> Unit, onStop: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(stringResource(R.string.app_name), fontSize = 22.sp, color = Palette.Chalk)
        Text(
            text = stringResource(
                if (canOverlay) R.string.status_ready else R.string.status_need_permission
            ),
            color = Palette.Mute,
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp),
        )
        Button(
            onClick = onPrimary,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
        ) {
            Text(stringResource(if (canOverlay) R.string.start else R.string.grant))
        }
        TextButton(onClick = onStop, modifier = Modifier.fillMaxWidth()) {
            Text(stringResource(R.string.stop), color = Palette.Mute)
        }
    }
}
