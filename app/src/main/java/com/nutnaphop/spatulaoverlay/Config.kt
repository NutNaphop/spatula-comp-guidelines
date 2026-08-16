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
    PINNED("หมุดของฉัน", "https://nutnaphop.github.io/spatula-comp-guidelines/"),
    OFFICIAL("ทั้งหมด", "https://goldenspatula.com/th/"),
}

object Config {
    const val PREFS = "spatula_overlay"
    const val KEY_MODE = "mode"
    const val KEY_BUBBLE_X = "bubble_x"
    const val KEY_BUBBLE_Y = "bubble_y"
    const val KEY_PANEL_H = "panel_height"

    /** Read at a glance next to a game, so start larger than the browser default. */
    const val TEXT_ZOOM = 115
}
