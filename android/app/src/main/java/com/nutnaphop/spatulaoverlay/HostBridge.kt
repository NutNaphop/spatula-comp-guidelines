package com.nutnaphop.spatulaoverlay

import android.webkit.JavascriptInterface

/**
 * The only thing that crosses from the web app into native code: which comp
 * is being tracked, if any. Sent when the player taps track and again on
 * every page load, so the page - which owns the answer - can correct a shell
 * whose remembered copy has gone stale. The shell needs it for two things - the collapsed
 * window's size (a dot when nothing is tracked, a strip when something is)
 * and which page to open when the strip is tapped - and nothing else, so the
 * comp's contents stay rendered in one place.
 *
 * Injected only into our own page (see [Mode.PINNED]); never attach this to
 * the official site's WebView.
 */
class HostBridge(private val onActive: (String?) -> Unit) {

    @JavascriptInterface
    fun onActiveComp(id: String?) {
        onActive(id?.takeIf { it.isNotBlank() })
    }

    companion object {
        const val NAME = "SpatulaHost"
    }
}
