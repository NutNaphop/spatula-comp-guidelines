package com.nutnaphop.spatulaoverlay

/**
 * The two things the bubble can show.
 *
 * The official site is the fuller reference, but its account login runs
 * through the game's own SDK, so a WebView outside the game can browse it
 * while signed out and cannot save anything. The pinned list therefore lives
 * in the local app, which needs no account at all.
 */
enum class Mode(val label: String, val url: String) {
    PINNED("หมุดของฉัน", Config.APP_URL),
    OFFICIAL("ทั้งหมด", "https://goldenspatula.com/th/"),
}

object Config {
    const val APP_URL = "https://nutnaphop.github.io/spatula-comp-guidelines/"

    /** Same export, rendered as the collapsed strip. Same origin as APP_URL,
     * so the two windows share localStorage and the tracked comp needs no
     * hand-off through native code. */
    const val MINI_URL = "$APP_URL?view=mini"

    const val PREFS = "spatula_overlay"
    const val KEY_MODE = "mode"
    const val KEY_BUBBLE_X = "bubble_x"
    const val KEY_BUBBLE_Y = "bubble_y"
    /** id of the comp being tracked, or absent. Kept across restarts so the
     * collapsed window comes back the right size, and so tapping it opens
     * that comp rather than the list. */
    const val KEY_TRACKED = "tracked_id"

    /** Straight to the comp being built. The web app reads `comp` from the
     * URL, so the shell never has to know what a comp contains. */
    fun compUrl(id: String): String = "$APP_URL?comp=${android.net.Uri.encode(id)}"

    /** Read at a glance next to a game, so start larger than the browser default. */
    const val TEXT_ZOOM = 115
}
