package com.ngxnhtn.streakky.widget

import android.content.Context
import org.json.JSONArray

/**
 * What the widgets read, kept in the app's own preferences: the summaries of every active and
 * archived habit, in the person's order, as the app last wrote them through the widgets plugin,
 * and the habit each placed widget shows. A habit missing from the summaries was deleted, or the
 * device signed out. Clearing the app's data clears both, until the app writes again.
 */
object WidgetStore {
    private const val PREFERENCES = "streakky.widgets"
    private const val SUMMARIES = "summaries"
    private fun widgetKey(widgetId: Int) = "widget.$widgetId"

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

    /**
     * The habits by id, in the person's order; null if the app hasn't written them since it was
     * installed or its data was cleared.
     */
    fun summaries(context: Context): Map<String, WidgetSummary>? {
        val json = preferences(context).getString(SUMMARIES, null) ?: return null
        val array = JSONArray(json)
        return (0 until array.length())
            .map { WidgetSummary.from(array.getJSONObject(it)) }
            .associateBy { it.id }
    }

    /** Keeps the summaries the app wrote, a JSON array. */
    fun saveSummaries(context: Context, json: String) {
        preferences(context).edit().putString(SUMMARIES, json).apply()
    }

    /** The habit a widget shows; null before one is picked, or once the app's data is cleared. */
    fun habitOf(context: Context, widgetId: Int): String? =
        preferences(context).getString(widgetKey(widgetId), null)

    fun setHabit(context: Context, widgetId: Int, habitId: String) {
        preferences(context).edit().putString(widgetKey(widgetId), habitId).apply()
    }

    /** Forgets the habits of widgets taken off the home screen. */
    fun forget(context: Context, widgetIds: IntArray) {
        preferences(context).edit().apply { widgetIds.forEach { remove(widgetKey(it)) } }.apply()
    }
}
