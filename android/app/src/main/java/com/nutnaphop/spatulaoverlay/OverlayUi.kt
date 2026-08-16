package com.nutnaphop.spatulaoverlay

import android.annotation.SuppressLint
import android.webkit.CookieManager
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView

/**
 * The expanded panel: a thin header over a WebView.
 *
 * The WebView is created once and remembered by the caller - recreating it on
 * recomposition would drop scroll position and reload the page.
 */
@Composable
fun Panel(
    modeLabel: String,
    webView: WebView,
    onToggleMode: () -> Unit,
    onBack: () -> Unit,
    onClose: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Palette.Ink),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Glyph(painterResource(R.drawable.ic_back), R.string.back)
            }
            // the mode name doubles as the switch: one control, one job, and
            // it always shows what you are looking at
            TextButton(
                onClick = onToggleMode,
                modifier = Modifier.weight(1f),
            ) {
                Text(
                    text = modeLabel,
                    color = Palette.Chalk,
                    fontSize = 14.sp,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            IconButton(onClick = onClose) {
                Glyph(painterResource(R.drawable.ic_close), R.string.close)
            }
        }

        AndroidView(
            factory = { webView },
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        )
    }
}

@Composable
private fun Glyph(painter: Painter, descriptionRes: Int) {
    Icon(
        painter = painter,
        contentDescription = stringResource(descriptionRes),
        tint = Palette.Mute,
        modifier = Modifier.padding(2.dp),
    )
}

/** Built here rather than in a composable so the service can keep one
 * instance alive across recompositions and destroy it deliberately. */
@SuppressLint("SetJavaScriptEnabled")
fun buildWebView(context: android.content.Context): WebView = WebView(context).apply {
    settings.javaScriptEnabled = true
    // the pinned list is localStorage - without this it silently forgets
    // every comp the moment the panel closes
    settings.domStorageEnabled = true
    settings.textZoom = Config.TEXT_ZOOM
    settings.useWideViewPort = true
    settings.loadWithOverviewMode = true
    settings.setSupportZoom(true)
    settings.builtInZoomControls = true
    settings.displayZoomControls = false
    settings.mediaPlaybackRequiresUserGesture = true
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
}
