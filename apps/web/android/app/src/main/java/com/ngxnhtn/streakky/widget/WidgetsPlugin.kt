package com.ngxnhtn.streakky.widget

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The app's way to the widgets: `update` keeps the summaries of every active and archived habit,
 * as core's `widgetSummary` makes them, and the app's look (`widgetLook`), draws every placed
 * widget again, and brings the widget list's preview into the look.
 */
@CapacitorPlugin(name = "StreakkyWidgets")
class WidgetsPlugin : Plugin() {
    @PluginMethod
    fun update(call: PluginCall) {
        val summaries = call.getArray("summaries") ?: return call.reject("No summaries")
        // no look when the app couldn't measure it: the widgets keep their last one
        WidgetStore.save(context, summaries.toString(), call.getObject("look")?.toString())
        StreakWidget.updateAll(context)
        StreakWidget.publishPreview(context)
        call.resolve()
    }
}
