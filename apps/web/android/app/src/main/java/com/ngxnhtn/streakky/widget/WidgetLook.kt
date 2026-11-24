package com.ngxnhtn.streakky.widget

import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import androidx.annotation.ColorInt
import androidx.appcompat.app.AppCompatDelegate
import com.ngxnhtn.streakky.R
import org.json.JSONObject

/** A habit colour as the widget draws it: its count's colour and its tile's. */
data class HabitColors(@ColorInt val count: Int, @ColorInt val tile: Int)

/**
 * The widget's colours in light or in dark: the page's ground, which its habit chooser takes, its
 * name's, its label's, and each habit colour's.
 */
data class WidgetColors(
    @ColorInt val ground: Int,
    @ColorInt val name: Int,
    @ColorInt val label: Int,
    val habits: Map<String, HabitColors>,
) {
    /** A habit colour's; teal's for one it doesn't know. */
    fun of(color: String?): HabitColors = habits[color] ?: habits.getValue("teal")
}

/** The app's theme setting: light or dark keeps the widget so, and system follows the phone. */
enum class Theme(val nightMode: Int) {
    LIGHT(AppCompatDelegate.MODE_NIGHT_NO),
    DARK(AppCompatDelegate.MODE_NIGHT_YES),
    SYSTEM(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);

    /** Which of a look's colours show, with the phone in dark mode or not. */
    fun colorsOf(look: WidgetLook, phoneDark: Boolean): WidgetColors = when (this) {
        LIGHT -> look.light
        DARK -> look.dark
        SYSTEM -> if (phoneDark) look.dark else look.light
    }

    companion object {
        /** The app's setting, "light", "dark" or "system". */
        fun of(id: String): Theme = entries.firstOrNull { it.name.equals(id, ignoreCase = true) } ?: SYSTEM
    }
}

/**
 * How the widget looks, as the app wrote it (`widgetLook` in apps/web/src/widget-look.ts): its
 * palette's colours in light and in dark, measured off the app's own habit card, and its theme,
 * which picks between them.
 */
data class WidgetLook(val theme: Theme, val light: WidgetColors, val dark: WidgetColors) {
    /** The colours showing now: the theme's own, or for system the phone's mode's. */
    fun shown(context: Context): WidgetColors = theme.colorsOf(this, isDark(context))

    /**
     * Colours a view by one of its colour methods, such as a text's `setTextColor`: on Android 12
     * and later with the colours for the phone in light and in dark, so a system widget follows
     * the phone's mode as it changes; before, with the colour showing now.
     */
    fun paint(context: Context, views: RemoteViews, viewId: Int, method: String, colorOf: (WidgetColors) -> Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val inLight = colorOf(theme.colorsOf(this, phoneDark = false))
            val inDark = colorOf(theme.colorsOf(this, phoneDark = true))
            views.setColorInt(viewId, method, inLight, inDark)
        } else {
            views.setInt(viewId, method, colorOf(shown(context)))
        }
    }

    companion object {
        fun from(json: JSONObject) = WidgetLook(
            theme = Theme.of(json.getString("theme")),
            light = colorsFrom(json.getJSONObject("light")),
            dark = colorsFrom(json.getJSONObject("dark")),
        )

        private fun colorsFrom(json: JSONObject): WidgetColors {
            val habits = json.getJSONObject("habits")
            return WidgetColors(
                ground = Color.parseColor(json.getString("ground")),
                name = Color.parseColor(json.getString("name")),
                label = Color.parseColor(json.getString("label")),
                habits = habits.keys().asSequence().associateWith {
                    val habit = habits.getJSONObject(it)
                    HabitColors(Color.parseColor(habit.getString("count")), Color.parseColor(habit.getString("tile")))
                },
            )
        }

        /**
         * Before the app has written its look: the default teal palette's colours, kept in the
         * app's resources for the widget list's preview too, following the phone's mode.
         */
        fun default(context: Context) = WidgetLook(
            theme = Theme.SYSTEM,
            light = defaultColors(context, dark = false),
            dark = defaultColors(context, dark = true),
        )

        private fun defaultColors(context: Context, dark: Boolean): WidgetColors {
            val config = Configuration(context.resources.configuration)
            val mode = if (dark) Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO
            config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or mode
            val themed = context.createConfigurationContext(config)
            return WidgetColors(
                ground = themed.getColor(R.color.widget_ground),
                name = themed.getColor(R.color.widget_name),
                label = themed.getColor(R.color.widget_label),
                habits = mapOf(
                    "teal" to HabitColors(themed.getColor(R.color.habit_teal), themed.getColor(R.color.habit_teal_tile)),
                    "green" to HabitColors(themed.getColor(R.color.habit_green), themed.getColor(R.color.habit_green_tile)),
                ),
            )
        }

        private fun isDark(context: Context) =
            (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
    }
}
