package com.nutnaphop.spatulaoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
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
import androidx.compose.runtime.mutableStateOf
import kotlin.math.abs

/**
 * A floating bubble that expands into a WebView panel over the running game.
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
 * The UI is Compose, hosted by [ComposeOverlayHost] because a Service cannot
 * supply the lifecycle owners Compose expects to find in the view tree.
 */
class OverlayService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var prefs: SharedPreferences

    private lateinit var bubbleHost: ComposeOverlayHost
    private var panelHost: ComposeOverlayHost? = null
    private var webView: WebView? = null

    private lateinit var bubbleParams: WindowManager.LayoutParams

    private val mode = mutableStateOf(Mode.PINNED)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        prefs = getSharedPreferences(Config.PREFS, Context.MODE_PRIVATE)
        mode.value = runCatching {
            Mode.valueOf(prefs.getString(Config.KEY_MODE, null) ?: "")
        }.getOrDefault(Mode.PINNED)

        startForeground(NOTIFICATION_ID, buildNotification())
        addBubble()
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
        if (::bubbleHost.isInitialized) {
            runCatching { windowManager.removeView(bubbleHost.view) }
            bubbleHost.destroy()
        }
    }

    // ---------------------------------------------------------------- bubble

    private fun addBubble() {
        bubbleHost = ComposeOverlayHost(this)
        val view = bubbleHost.setContent { SpatulaTheme { Bubble() } }
        view.setOnTouchListener(DragListener())

        // Explicit square size, not WRAP_CONTENT: the window has to carry the
        // size, or the round background renders as a sliver.
        val size = resources.getDimensionPixelSize(R.dimen.bubble_size)

        bubbleParams = baseParams().apply {
            width = size
            height = size
            gravity = Gravity.TOP or Gravity.START
            x = prefs.getInt(Config.KEY_BUBBLE_X, 0)
            y = prefs.getInt(Config.KEY_BUBBLE_Y, 240)
            flags = flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        }
        windowManager.addView(view, bubbleParams)
    }

    /** Distinguishes a tap from a drag, and remembers where it was left. */
    private inner class DragListener : View.OnTouchListener {
        private var startX = 0
        private var startY = 0
        private var touchX = 0f
        private var touchY = 0f
        private val slop = ViewConfiguration.get(this@OverlayService).scaledTouchSlop

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = bubbleParams.x
                    startY = bubbleParams.y
                    touchX = event.rawX
                    touchY = event.rawY
                    return true
                }
                MotionEvent.ACTION_MOVE -> {
                    bubbleParams.x = startX + (event.rawX - touchX).toInt()
                    bubbleParams.y = startY + (event.rawY - touchY).toInt()
                    windowManager.updateViewLayout(bubbleHost.view, bubbleParams)
                    return true
                }
                MotionEvent.ACTION_UP -> {
                    val moved = abs(event.rawX - touchX) > slop ||
                        abs(event.rawY - touchY) > slop
                    if (moved) {
                        prefs.edit()
                            .putInt(Config.KEY_BUBBLE_X, bubbleParams.x)
                            .putInt(Config.KEY_BUBBLE_Y, bubbleParams.y)
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

        val web = buildWebView(this).also { webView = it }
        web.loadUrl(mode.value.url)

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
                        web.loadUrl(mode.value.url)
                    },
                    onBack = { if (web.canGoBack()) web.goBack() },
                    onClose = { collapse() },
                )
            }
        }
        panelHost = host

        val params = baseParams().apply {
            width = WindowManager.LayoutParams.MATCH_PARENT
            height = WindowManager.LayoutParams.MATCH_PARENT
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
        bubbleHost.view.visibility = View.GONE
    }

    private fun collapse() {
        val host = panelHost ?: return
        panelHost = null
        CookieManager.getInstance().flush()
        runCatching { windowManager.removeView(host.view) }
        host.destroy()
        webView?.destroy()
        webView = null
        if (::bubbleHost.isInitialized) bubbleHost.view.visibility = View.VISIBLE
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
    }
}
