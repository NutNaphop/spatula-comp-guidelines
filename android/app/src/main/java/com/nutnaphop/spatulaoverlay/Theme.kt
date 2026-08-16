package com.nutnaphop.spatulaoverlay

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Same palette as the web app, so the bubble reads as the same tool.
 * Gold is the in-game 5-cost colour, reused for anything the user owns. */
object Palette {
    val Ink = Color(0xFF0B0F16)
    val Slate = Color(0xFF141A24)
    val Edge = Color(0xFF1F2836)
    val Chalk = Color(0xFFE8ECF3)
    val Mute = Color(0xFF7C8798)
    val Gold = Color(0xFFE8B33C)
}

@Composable
fun SpatulaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Palette.Gold,
            onPrimary = Palette.Ink,
            background = Palette.Ink,
            onBackground = Palette.Chalk,
            surface = Palette.Slate,
            onSurface = Palette.Chalk,
            surfaceVariant = Palette.Edge,
            onSurfaceVariant = Palette.Mute,
        ),
        content = content,
    )
}
