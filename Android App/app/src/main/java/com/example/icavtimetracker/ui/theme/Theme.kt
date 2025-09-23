package com.example.icavtimetracker.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = ButtonBlue,
    onPrimary = Color.White,
    primaryContainer = ButtonBlue,
    onPrimaryContainer = Color.White,
    secondary = ButtonGreen,
    onSecondary = Color.White,
    secondaryContainer = ButtonGreen,
    onSecondaryContainer = Color.White,
    tertiary = ButtonOrange,
    onTertiary = Color.White,
    tertiaryContainer = ButtonOrange,
    onTertiaryContainer = Color.White,
    surface = Color(0xFF121212),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF1E1E1E),
    onSurfaceVariant = Color.White,
    background = Color(0xFF000000),
    onBackground = Color.White,
    error = ButtonRed,
    onError = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = ButtonBlue,
    onPrimary = Color.White,
    primaryContainer = ButtonBlue,
    onPrimaryContainer = Color.White,
    secondary = ButtonGreen,
    onSecondary = Color.White,
    secondaryContainer = ButtonGreen,
    onSecondaryContainer = Color.White,
    tertiary = ButtonOrange,
    onTertiary = Color.White,
    tertiaryContainer = ButtonOrange,
    onTertiaryContainer = Color.White,
    surface = Color.White,
    onSurface = Color.Black,
    surfaceVariant = Color(0xFFF5F5F5),
    onSurfaceVariant = Color.Black,
    background = Color(0xFFFAFAFA),
    onBackground = Color.Black,
    error = ButtonRed,
    onError = Color.White
)

@Composable
fun ICAVTimeTrackerTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Disabled dynamic colors to ensure consistent contrast
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
} 