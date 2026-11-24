package com.ngxnhtn.streakky.widget

import java.time.Instant
import java.util.TimeZone
import org.junit.Assert.assertEquals
import org.junit.Test

/** The widget's today: the day in the time zone the app's settings name, not the phone's. */
class WidgetTodayTest {
    @Test
    fun isTheChosenZonesDay() {
        val moment = Instant.parse("2026-11-25T17:30:00Z").toEpochMilli()
        val days = listOf("Asia/Ho_Chi_Minh", "America/New_York").map { today(TimeZone.getTimeZone(it), moment) }
        // 00:30 on the 26th in Saigon, 12:30 on the 25th in New York
        assertEquals(listOf("2026-11-26", "2026-11-25"), days)
    }
}
