package com.ngxnhtn.streakky.widget

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.ngxnhtn.streakky.R

/**
 * Placing the widget, or choosing again: lists the active habits the app last wrote, and the one
 * picked is the habit the widget shows. Leaving without picking takes a widget being placed away
 * again. Before the app has written its habits, it says to open the app first.
 */
class WidgetConfigureActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // left without a pick, as by the back button, the widget isn't placed
        setResult(RESULT_CANCELED)
        val widgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID,
        )
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return finish()

        setContentView(R.layout.widget_configure)
        val summaries = WidgetStore.summaries(this)
        val habits = summaries.orEmpty().values.filter { !it.archived }
        findViewById<TextView>(R.id.empty).apply {
            visibility = if (habits.isEmpty()) View.VISIBLE else View.GONE
            setText(if (summaries == null) R.string.widget_open_first else R.string.widget_none)
        }
        val list = findViewById<ListView>(R.id.habits)
        list.adapter = object : ArrayAdapter<WidgetSummary>(this, R.layout.widget_configure_item, habits) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val row = super.getView(position, convertView, parent) as TextView
                val habit = habits[position]
                row.text = habit.name
                row.compoundDrawableTintList = ContextCompat.getColorStateList(
                    context,
                    StreakWidget.colorsOf(habit.color).count,
                )
                return row
            }
        }
        list.setOnItemClickListener { _, _, position, _ -> pick(widgetId, habits[position]) }
    }

    private fun pick(widgetId: Int, habit: WidgetSummary) {
        WidgetStore.setHabit(this, widgetId, habit.id)
        StreakWidget.render(this, AppWidgetManager.getInstance(this), widgetId)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
        finish()
    }
}
