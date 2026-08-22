package com.nutnaphop.spatulaoverlay

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.compose.runtime.mutableStateOf
import kotlin.math.abs

/**
 * A floating window over the running game. Collapsed it shows the comp being
 * built; expanded it is the full browser.
 *
 * Two window flags carry most of the behaviour:
 *
 *  - FLAG_NOT_TOUCH_MODAL is always set, so touches outside our window reach
 *    the game underneath. Without it the overlay would swallow the whole
 *    screen and the game would be unplayable.
 *  - FLAG_NOT_FOCUSABLE is set while collapsed and cleared while expanded.
 *    A non-focusable window never receives key events, so leaving it set
 *    would make the search box impossible to type into; leaving it clear
 *    would steal the keyboard and the back button from the game.
 *
 * The collapsed window is a WebView showing the same site with ?view=mini.
 * Keeping it web means the strip's layout lives beside the rest of the UI
 * instead of being reimplemented in Compose.
 *
 * Tapping it expands. If a comp is being tracked, it expands straight onto
 * that comp - mid-game the answer to "what did I tap this for" is almost
 * always the comp already on the strip, and a list to scroll past is exactly
 * the interruption the overlay exists to remove.
 */
class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var prefs: SharedPreferences

    private var collapsedView: View? = null
    private var collapsedWeb: WebView? = null
    private var collapsedFallback: ComposeOverlayHost? = null
    private lateinit var collapsedParams: WindowManager.LayoutParams

    private var panelHost: ComposeOverlayHost? = null
    private var panelWeb: WebView? = null

    private val mode = mutableStateOf(Mode.PINNED)

    /** id of the comp being built, or null. Drives both the collapsed
     * window's size and where a tap lands. */
    private var tracked: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        prefs = getSharedPreferences(Config.PREFS, Context.MODE_PRIVATE)
        mode.value = runCatching {
            Mode.valueOf(prefs.getString(Config.KEY_MODE, null) ?: "")
        }.getOrDefault(Mode.PINNED)
        // only a first guess at the window size: the page announces what it
        // actually rendered as soon as it loads, and that wins
        tracked = prefs.getString(Config.KEY_TRACKED, null)

        startForeground(NOTIFICATION_ID, buildNotification())
        addCollapsed()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        CookieManager.getInstance().flush()
        collapse()
        removeCollapsed()
    }

    // ------------------------------------------------------------- collapsed

    @SuppressLint("ClickableViewAccessibility")
    private fun addCollapsed() {
        val web = buildWebView(this, wideViewport = false).apply {
            setBackgroundColor(0)
            addJavascriptInterface(HostBridge(::onTrackingChanged), HostBridge.NAME)
            webViewClient = object : android.webkit.WebViewClient() {
                private var failed = false

                override fun onPageStarted(
                    view: WebView,
                    url: String,
                    favicon: android.graphics.Bitmap?,
                ) {
                    failed = false
                }

                override fun onReceivedError(
                    view: WebView,
                    request: android.webkit.WebResourceRequest,
                    error: android.webkit.WebResourceError,
                ) {
                    // only the page itself matters; a missing image should
                    // not blank the whole strip
                    if (request.isForMainFrame) failed = true
                }

                // a 404 arrives with a perfectly valid body, so it never
                // reaches onReceivedError - without this the strip would show
                // the host's error page instead of falling back
                override fun onReceivedHttpError(
                    view: WebView,
                    request: android.webkit.WebResourceRequest,
                    errorResponse: android.webkit.WebResourceResponse,
                ) {
                    if (request.isForMainFrame) failed = true
                }

                // fires after onReceivedError, and for the error page too, so
                // it has to consult the flag rather than assume success
                override fun onPageFinished(view: WebView, url: String) {
                    view.visibility = if (failed) View.INVISIBLE else View.VISIBLE
                }
            }
            visibility = View.INVISIBLE
            loadUrl(Config.MINI_URL)
        }
        collapsedWeb = web

        // Drawn underneath the WebView so a failed load still leaves
        // something to tap. The collapsed window is the one part that has to
        // survive with no network, which is exactly when the page will not
        // load, so it cannot be web all the way down.
        val fallback = ComposeOverlayHost(this)
        fallback.setContent { SpatulaTheme { Dot() } }
        collapsedFallback = fallback

        // A transparent lid over the WebView: the strip is read, never
        // tapped, so the window consumes every touch itself and turns it into
        // drag-to-move or tap-to-expand.
        val lid = View(this)
        lid.setOnTouchListener(DragListener())

        val container = FrameLayout(this).apply {
            addView(fallback.view, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(web, FrameLayout.LayoutParams(MATCH, MATCH))
            addView(lid, FrameLayout.LayoutParams(MATCH, MATCH))
        }
        // the container is the window root, so it is what Compose reads the
        // lifecycle owners from
        fallback.own(container)
        collapsedView = container

        collapsedParams = baseParams().apply {
            gravity = Gravity.TOP or Gravity.START
            x = prefs.getInt(Config.KEY_BUBBLE_X, 0)
            y = prefs.getInt(Config.KEY_BUBBLE_Y, 240)
            flags = flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        }
        applyCollapsedSize()
        windowManager.addView(container, collapsedParams)
    }

    private fun removeCollapsed() {
        collapsedView?.let { runCatching { windowManager.removeView(it) } }
        collapsedWeb?.destroy()
        collapsedFallback?.destroy()
        collapsedView = null
        collapsedWeb = null
        collapsedFallback = null
    }

    /** A dot when nothing is tracked, a strip when something is. */
    private fun applyCollapsedSize() {
        val on = tracked != null
        collapsedParams.width = resources.getDimensionPixelSize(
            if (on) R.dimen.strip_width else R.dimen.bubble_size
        )
        collapsedParams.height = resources.getDimensionPixelSize(
            if (on) R.dimen.strip_height else R.dimen.bubble_size
        )
        clampToScreen()
    }

    /**
     * Keeps the window reachable. FLAG_NOT_TOUCH_MODAL plus FLAG_LAYOUT_NO_LIMITS
     * means the system will happily place it past the edge of the display and
     * leave it there, with nothing on screen to drag it back by.
     *
     * Three things move it out of reach: dragging it off, rotating the screen,
     * and growing from a 52dp dot into a 192dp strip under a position that was
     * saved while it was still a dot.
     */
    private fun clampToScreen() {
        val metrics = resources.displayMetrics
        val maxX = (metrics.widthPixels - collapsedParams.width).coerceAtLeast(0)
        val maxY = (metrics.heightPixels - collapsedParams.height).coerceAtLeast(0)
        collapsedParams.x = collapsedParams.x.coerceIn(0, maxX)
        collapsedParams.y = collapsedParams.y.coerceIn(0, maxY)
    }

    /** Rotation changes what "on screen" means, so the window is put back
     * inside the new bounds rather than left in the old ones. */
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val view = collapsedView ?: return
        applyCollapsedSize()
        runCatching { windowManager.updateViewLayout(view, collapsedParams) }
    }

    /** Called from the web app's JS bridge, on a background thread. */
    private fun onTrackingChanged(activeId: String?) {
        if (activeId == tracked) return
        val resize = (activeId != null) != (tracked != null)
        tracked = activeId
        prefs.edit().putString(Config.KEY_TRACKED, activeId).apply()
        if (!resize) return

        collapsedView?.post {
            val view = collapsedView ?: return@post
            applyCollapsedSize()
            runCatching { windowManager.updateViewLayout(view, collapsedParams) }
        }
    }

    /** Distinguishes a tap from a drag, and remembers where it was left. */
    private inner class DragListener : View.OnTouchListener {
        private var startX = 0
        private var startY = 0
        private var touchX = 0f
        private var touchY = 0f
        private val slop = ViewConfiguration.get(this@OverlayService).scaledTouchSlop

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            val view = collapsedView ?: return false
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = collapsedParams.x
                    startY = collapsedParams.y
                    touchX = event.rawX
                    touchY = event.rawY
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    collapsedParams.x = startX + (event.rawX - touchX).toInt()
                    collapsedParams.y = startY + (event.rawY - touchY).toInt()
                    clampToScreen()
                    windowManager.updateViewLayout(view, collapsedParams)
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    val moved = abs(event.rawX - touchX) > slop ||
                        abs(event.rawY - touchY) > slop
                    if (moved) {
                        prefs.edit()
                            .putInt(Config.KEY_BUBBLE_X, collapsedParams.x)
                            .putInt(Config.KEY_BUBBLE_Y, collapsedParams.y)
                            .apply()
                    } else {
                        v.performClick()
                        expand()
                    }
                    return true
                }
            }
            return false
        }
    }

    // ----------------------------------------------------------------- panel

    private fun expand() {
        if (panelHost != null) return

        val web = buildWebView(this).also { panelWeb = it }
        web.addJavascriptInterface(HostBridge(::onTrackingChanged), HostBridge.NAME)
        web.loadUrl(landingUrl())

        val host = ComposeOverlayHost(this)
        val view = host.setContent {
            SpatulaTheme {
                Panel(
                    modeLabel = mode.value.label,
                    webView = web,
                    onToggleMode = {
                        mode.value =
                            if (mode.value == Mode.PINNED) Mode.OFFICIAL else Mode.PINNED
                        prefs.edit().putString(Config.KEY_MODE, mode.value.name).apply()
                        // switching modes is asking for the other library, so
                        // it lands on the list rather than back on the comp
                        web.loadUrl(mode.value.url)
                    },
                    onBack = { if (web.canGoBack()) web.goBack() },
                    onClose = { collapse() },
                )
            }
        }
        panelHost = host

        val params = baseParams().apply {
            width = MATCH
            height = MATCH
            gravity = Gravity.TOP or Gravity.START
            // focusable: the search box and any login form need a keyboard.
            // ADJUST_RESIZE is deprecated for activities in favour of the
            // insets API, but that path does not apply to a window we add to
            // WindowManager ourselves, and without it the keyboard covers the
            // field being typed into.
            @Suppress("DEPRECATION")
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        }

        windowManager.addView(view, params)
        collapsedView?.visibility = View.GONE
    }

    private fun collapse() {
        val host = panelHost ?: return
        panelHost = null
        CookieManager.getInstance().flush()
        runCatching { windowManager.removeView(host.view) }
        host.destroy()
        panelWeb?.destroy()
        panelWeb = null

        // the strip reads the tracked comp out of localStorage, which the
        // panel may have just changed
        collapsedWeb?.reload()
        collapsedView?.visibility = View.VISIBLE
    }

    /** The tracked comp if there is one, otherwise whichever library the
     * panel was last left on. */
    private fun landingUrl(): String {
        val id = tracked
        return if (mode.value == Mode.PINNED && id != null) Config.compUrl(id) else mode.value.url
    }

    // ----------------------------------------------------------------- glue

    private fun baseParams() = WindowManager.LayoutParams().apply {
        type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        format = PixelFormat.TRANSLUCENT
        // never modal: whatever we do not cover still belongs to the game
        flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
    }

    private fun buildNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.channel_name),
                    NotificationManager.IMPORTANCE_LOW,
                )
            )
        }
        val stop = PendingIntent.getService(
            this,
            0,
            Intent(this, OverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(R.drawable.ic_bubble)
            .addAction(
                Notification.Action.Builder(null, getString(R.string.stop), stop).build()
            )
            .setOngoing(true)
            .build()
    }

    companion object {
        const val ACTION_STOP = "com.nutnaphop.spatulaoverlay.STOP"
        private const val CHANNEL_ID = "overlay"
        private const val NOTIFICATION_ID = 1
        private const val MATCH = WindowManager.LayoutParams.MATCH_PARENT
    }
}
