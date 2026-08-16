package com.nutnaphop.spatulaoverlay

import android.webkit.JavascriptInterface

/**
 * The only thing that crosses from the web app into native code: whether a
 * comp is being tracked. The shell needs it to choose the collapsed window's
 * size - a dot when nothing is tracked, a strip when something is - and
 * nothing else, so the comp's contents stay rendered in one place.
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
