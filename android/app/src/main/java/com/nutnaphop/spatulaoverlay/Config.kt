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
    const val KEY_TRACKING = "tracking"

    /** Read at a glance next to a game, so start larger than the browser default. */
    const val TEXT_ZOOM = 115
}
