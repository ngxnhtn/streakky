package com.ngxnhtn.streakky.widget

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The app's way to the widgets: `update` keeps the summaries of every active and archived habit,
 * as core's `widgetSummary` makes them, and draws every placed widget again.
 */
@CapacitorPlugin(name = "StreakkyWidgets")
class WidgetsPlugin : Plugin() {
    @PluginMethod
    fun update(call: PluginCall) {
        val summaries = call.getArray("summaries") ?: return call.reject("No summaries")
        WidgetStore.saveSummaries(context, summaries.toString())
        StreakWidget.updateAll(context)
        call.resolve()
    }
}
