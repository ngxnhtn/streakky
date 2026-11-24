package com.ngxnhtn.streakky.widget

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The widget's own count and label, over the cases core's tests write (widget-cases.json, from
 * packages/core/src/widget.test.ts): each is a summary the app wrote, a later day, and what the
 * widget should show then. Core and the widget can't drift apart while both pass.
 */
class WidgetRuleTest {
    /** The shared cases; failing, and saying why, when there are none to read. */
    private fun cases(): List<JSONObject> {
        val file = javaClass.classLoader?.getResourceAsStream("widget-cases.json")
        assertNotNull("widget-cases.json isn't there: core's widget tests write it", file)
        val array = file!!.bufferedReader().use { JSONArray(it.readText()) }
        assertTrue("widget-cases.json has no cases", array.length() > 0)
        return (0 until array.length()).map(array::getJSONObject)
    }

    private fun summaryOf(case: JSONObject) = WidgetSummary.from(case.getJSONObject("summary"))

    @Test
    fun countsAsCoreDoes() {
        for (case in cases()) {
            val today = case.getString("today")
            assertEquals("count on $today for $case", case.getInt("count"), countFromSummary(summaryOf(case), today))
        }
    }

    @Test
    fun saysWhatItCountsAsCoreDoes() {
        for (case in cases()) {
            val label = counterLabel(summaryOf(case).kind, case.getInt("count"))
            assertEquals("label for $case", case.getString("label"), label)
        }
    }
}
