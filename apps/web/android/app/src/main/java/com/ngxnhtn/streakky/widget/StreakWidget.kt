package com.ngxnhtn.streakky.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import com.ngxnhtn.streakky.MainActivity
import com.ngxnhtn.streakky.R
import java.util.Calendar

/**
 * The home-screen widget (ticket 20): one habit's current streak, in its colour, worked out from
 * the summary the app last wrote and today, so it stays right after midnight without the app. It
 * takes the app's palette and theme (ticket 21), which the app writes with the summaries.
 * Tapping it opens the app on that habit. It only shows; there's nothing to check in from it.
 */
class StreakWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, widgetIds: IntArray) {
        for (widgetId in widgetIds) render(context, manager, widgetId)
        scheduleMidnight(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        manager: AppWidgetManager,
        widgetId: Int,
        options: Bundle,
    ) {
        // resized: before Android 12 the widget picks its layout for its size itself
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) render(context, manager, widgetId)
    }

    override fun onDeleted(context: Context, widgetIds: IntArray) {
        WidgetStore.forget(context, widgetIds)
    }

    override fun onDisabled(context: Context) {
        alarms(context).cancel(midnight(context))
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        // the day may have changed: just after midnight, or the clock or time zone moved
        if (intent.action in DAY_CHANGES) updateAll(context)
    }

    companion object {
        private const val ACTION_MIDNIGHT = "com.ngxnhtn.streakky.widget.MIDNIGHT"
        private val DAY_CHANGES = setOf(
            ACTION_MIDNIGHT,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
        )

        /** Draws every placed widget again, as after the app writes new summaries. */
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val widgetIds = manager.getAppWidgetIds(ComponentName(context, StreakWidget::class.java))
            for (widgetId in widgetIds) render(context, manager, widgetId)
            if (widgetIds.isNotEmpty()) scheduleMidnight(context)
        }

        /** The smallest size, in dp, for the full layout; below it either way, the small one. */
        private val FULL = SizeF(110f, 110f)
        private val SMALL = SizeF(40f, 40f)

        /**
         * Draws one widget from its habit's summary, or says why it can't show one, in the layout
         * that fits its size. Launchers may let a widget get smaller than its info allows.
         */
        fun render(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val summaries = WidgetStore.summaries(context)
            val habitId = WidgetStore.habitOf(context, widgetId)
            val look = WidgetStore.look(context)
            val draw = { layout: Int -> drawn(context, widgetId, layout, summaries, habitId, look) }
            val views = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // the launcher shows the biggest that fits, and the smallest when none does
                RemoteViews(mapOf(FULL to draw(R.layout.widget_streak), SMALL to draw(R.layout.widget_streak_small)))
            } else {
                val full = fitsFull(manager.getAppWidgetOptions(widgetId))
                draw(if (full) R.layout.widget_streak else R.layout.widget_streak_small)
            }
            manager.updateAppWidget(widgetId, views)
        }

        /** Before Android 12: whether the widget, held upright, is big enough for the full layout. */
        private fun fitsFull(options: Bundle): Boolean {
            val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
            val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
            // no size told yet: as placed, two cells square
            return width == 0 || (width >= FULL.width && height >= FULL.height)
        }

        /** One layout of the widget, filled in for its habit. */
        private fun drawn(
            context: Context,
            widgetId: Int,
            layout: Int,
            summaries: Map<String, WidgetSummary>?,
            habitId: String?,
            look: WidgetLook,
        ): RemoteViews {
            val views = RemoteViews(context.packageName, layout)
            val summary = habitId?.let { summaries?.get(it) }
            paintHabit(context, views, look, summary?.color)
            when {
                summary == null -> {
                    val note = when {
                        // just installed, or its data cleared: the app hasn't written its habits yet
                        summaries == null -> R.string.widget_open
                        // its pick forgotten with the app's data: tapping it picks again
                        habitId == null -> R.string.widget_pick
                        else -> R.string.widget_gone
                    }
                    views.setTextViewText(R.id.name, context.getString(R.string.app_name))
                    views.setViewVisibility(R.id.count, View.GONE)
                    views.setTextViewText(R.id.label, context.getString(note))
                }
                summary.archived -> {
                    views.setTextViewText(R.id.name, summary.name)
                    views.setViewVisibility(R.id.count, View.GONE)
                    views.setTextViewText(R.id.label, context.getString(R.string.widget_archived))
                    views.setContentDescription(
                        R.id.widget,
                        context.getString(R.string.widget_says_archived, summary.name),
                    )
                }
                else -> {
                    val count = countFromSummary(summary, today(WidgetStore.timeZone(context)))
                    val label = counterLabel(summary.kind, count)
                    views.setTextViewText(R.id.name, summary.name)
                    views.setViewVisibility(R.id.count, View.VISIBLE)
                    views.setTextViewText(R.id.count, count.toString())
                    views.setTextViewText(R.id.label, label)
                    views.setContentDescription(
                        R.id.widget,
                        context.getString(R.string.widget_says_count, summary.name, count, label),
                    )
                }
            }
            val tap = if (summaries != null && habitId == null) {
                picking(context, widgetId)
            } else {
                opening(context, widgetId, summary?.id)
            }
            views.setOnClickPendingIntent(R.id.widget, tap)
            return views
        }

        /** Colours a layout's tile, name, count and label in the look, for a habit colour. */
        private fun paintHabit(context: Context, views: RemoteViews, look: WidgetLook, color: String?) {
            look.paint(context, views, R.id.tile, "setColorFilter") { it.of(color).tile }
            look.paint(context, views, R.id.count, "setTextColor") { it.of(color).count }
            look.paint(context, views, R.id.name, "setTextColor") { it.name }
            look.paint(context, views, R.id.label, "setTextColor") { it.label }
        }

        /**
         * On Android 15 and later, the widget list's preview in the app's look, once it has
         * changed: before, and until then, the list draws it from the app's resources, in teal.
         * Android limits how often an app may publish one; one it refuses is tried again with the
         * app's next write. Launchers may keep drawing the resources' preview: Lawnchair does.
         */
        fun publishPreview(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return
            val written = WidgetStore.lookJson(context) ?: return
            if (written == WidgetStore.previewLook(context)) return
            val views = RemoteViews(context.packageName, R.layout.widget_streak_preview)
            // the preview's habit, Morning run, is green
            paintHabit(context, views, WidgetStore.look(context), "green")
            val published = AppWidgetManager.getInstance(context).setWidgetPreview(
                ComponentName(context, StreakWidget::class.java),
                AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN,
                views,
            )
            if (published) WidgetStore.setPreviewLook(context, written)
        }

        /** Opens the habit chooser for a widget that has none, as after the app's data is cleared. */
        private fun picking(context: Context, widgetId: Int): PendingIntent = PendingIntent.getActivity(
            context,
            widgetId,
            Intent(context, WidgetConfigureActivity::class.java)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        /** Opens the app on the habit, through its link; with no habit, on Home. */
        private fun opening(context: Context, widgetId: Int, habitId: String?): PendingIntent {
            val intent = Intent(context, MainActivity::class.java)
            if (habitId != null) {
                intent.action = Intent.ACTION_VIEW
                val scheme = context.getString(R.string.custom_url_scheme)
                intent.data = Uri.parse("$scheme://habit/${Uri.encode(habitId)}")
            }
            return PendingIntent.getActivity(
                context,
                widgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        private fun alarms(context: Context) = context.getSystemService(AlarmManager::class.java)

        private fun midnight(context: Context): PendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, StreakWidget::class.java).setAction(ACTION_MIDNIGHT),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        /** How late Android may draw the widgets after midnight: its shortest window without exact alarms. */
        private const val MIDNIGHT_WINDOW_MS = 10 * 60 * 1000L

        /**
         * Draws the widgets again within ten minutes of the coming midnight. It doesn't wake the
         * phone: with its screen off then, they're drawn as it comes on, before they can be seen.
         */
        private fun scheduleMidnight(context: Context) {
            // the midnight of the zone days follow, which may not be the phone's
            val next = Calendar.getInstance(WidgetStore.timeZone(context)).apply {
                add(Calendar.DAY_OF_MONTH, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 5)
                set(Calendar.MILLISECOND, 0)
            }
            alarms(context).setWindow(AlarmManager.RTC, next.timeInMillis, MIDNIGHT_WINDOW_MS, midnight(context))
        }
    }
}
