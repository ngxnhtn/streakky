package com.ngxnhtn.streakky.widget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * What the widgets read, kept in the app's own preferences: the summaries of every active and
 * archived habit, in the person's order, and the app's look, as the app last wrote them through
 * the widgets plugin, and the habit each placed widget shows. A habit missing from the summaries
 * was deleted, or the device signed out. Clearing the app's data clears them all, until the app
 * writes again.
 */
object WidgetStore {
    private const val PREFERENCES = "streakky.widgets"
    private const val SUMMARIES = "summaries"
    private const val LOOK = "look"
    private const val PREVIEW_LOOK = "preview.look"
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

    /**
     * Keeps what the app wrote: the summaries, a JSON array, and its look, a JSON object; without a
     * look, as when the app couldn't measure it, the last one stays.
     */
    fun save(context: Context, summaries: String, look: String?) {
        preferences(context).edit().apply {
            putString(SUMMARIES, summaries)
            if (look != null) putString(LOOK, look)
        }.apply()
    }

    /** The app's look as it last wrote it, or the default one before it has. */
    fun look(context: Context): WidgetLook =
        lookJson(context)?.let { WidgetLook.from(JSONObject(it)) } ?: WidgetLook.default(context)

    fun lookJson(context: Context): String? = preferences(context).getString(LOOK, null)

    /** The look the widget list's preview was last published in. */
    fun previewLook(context: Context): String? = preferences(context).getString(PREVIEW_LOOK, null)

    fun setPreviewLook(context: Context, json: String) {
        preferences(context).edit().putString(PREVIEW_LOOK, json).apply()
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
