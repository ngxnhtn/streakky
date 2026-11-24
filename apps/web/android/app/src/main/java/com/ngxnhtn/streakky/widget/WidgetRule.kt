package com.ngxnhtn.streakky.widget

import java.util.Calendar
import org.json.JSONObject

/**
 * A habit as its widget shows it, whatever the day: core's `WidgetSummary`
 * (packages/core/src/widget.ts), which the app writes through the widgets plugin.
 */
data class WidgetSummary(
    val id: String,
    val name: String,
    /** the habit's colour id, such as "green" */
    val color: String,
    /** archived, so the widget says so in place of a count */
    val archived: Boolean,
    /** "build" or "quit" */
    val kind: String,
    /** build: the last check-in, YYYY-MM-DD, or null with none */
    val lastCheckIn: String?,
    /** build: how long the streak ending on the last check-in is */
    val streakAtLastCheckIn: Int,
    /** quit: the quit day or the last slip, YYYY-MM-DD */
    val since: String?,
    /** quit: the archived days since then, which don't count */
    val archivedDaysSince: Int,
) {
    companion object {
        fun from(json: JSONObject) = WidgetSummary(
            id = json.getString("id"),
            name = json.getString("name"),
            color = json.getString("color"),
            archived = json.optBoolean("archived"),
            kind = json.getString("kind"),
            lastCheckIn = json.dayOrNull("lastCheckIn"),
            streakAtLastCheckIn = json.optInt("streakAtLastCheckIn"),
            since = json.dayOrNull("since"),
            archivedDaysSince = json.optInt("archivedDaysSince"),
        )

        private fun JSONObject.dayOrNull(key: String) = if (isNull(key)) null else getString(key)
    }
}

/**
 * The habit's current streak on `today` (YYYY-MM-DD), as core's `countFromSummary` works it out:
 * a build habit's streak lives through the day after its last check-in, and a quit habit counts
 * the days since its quit day or last slip, less the archived ones.
 */
fun countFromSummary(summary: WidgetSummary, today: String): Int =
    if (summary.kind == "quit") {
        maxOf(0, daysBetween(summary.since!!, today) - summary.archivedDaysSince)
    } else {
        val last = summary.lastCheckIn
        if (last != null && daysBetween(last, today) <= 1) summary.streakAtLastCheckIn else 0
    }

/** What the count counts, as core's `counterLabel` says it. */
fun counterLabel(kind: String, days: Int): String =
    if (kind == "quit") (if (days == 1) "day free" else "days free") else "day streak"

/** Today on the phone, YYYY-MM-DD, as the app's own days are: local, changing at midnight. */
fun today(): String {
    val now = Calendar.getInstance()
    return "%04d-%02d-%02d".format(
        now.get(Calendar.YEAR),
        now.get(Calendar.MONTH) + 1,
        now.get(Calendar.DAY_OF_MONTH),
    )
}

/** Whole calendar days from one YYYY-MM-DD day to another. */
fun daysBetween(from: String, to: String): Int = dayNumber(to) - dayNumber(from)

/**
 * A YYYY-MM-DD day as a count of days, the same for every phone whatever its time zone (Howard
 * Hinnant's days-from-civil), so no Android 8 date classes are needed on Android 7.
 */
private fun dayNumber(day: String): Int {
    val (year, month, date) = day.split("-").map(String::toInt)
    val y = if (month <= 2) year - 1 else year
    val era = (if (y >= 0) y else y - 399) / 400
    val yearOfEra = y - era * 400
    val dayOfYear = (153 * (month + if (month > 2) -3 else 9) + 2) / 5 + date - 1
    val dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
    return era * 146097 + dayOfEra - 719468
}
