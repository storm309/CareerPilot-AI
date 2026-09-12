"use client";

import React from "react";

// Sequential ramp: one hue, light to dark. Level 0 is the empty surface, so an
// inactive day reads as absence rather than as a low value.
const LEVELS = [
  "bg-muted",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

function level(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function formatDate(key) {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Twelve weeks of activity, newest column on the right.
 *
 * The grid is laid out column-major (one column per week) so it reads the way a
 * calendar does, and every cell carries its own label for screen readers.
 */
export default function ActivityHeatmap({ days = [] }) {
  if (days.length === 0) return null;

  const weeks = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-heading" className="text-base font-semibold">
          Last 12 weeks
        </h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">{total}</span> things practiced
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-[3px]">
              {week.map((day) => (
                <span
                  key={day.date}
                  title={`${formatDate(day.date)}: ${day.count} ${day.count === 1 ? "activity" : "activities"}`}
                  className={`h-3 w-3 rounded-[3px] ${LEVELS[level(day.count)]}`}
                >
                  <span className="sr-only">
                    {formatDate(day.date)}: {day.count} activities
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span>Less</span>
        {LEVELS.map((className, index) => (
          <span key={index} aria-hidden className={`h-3 w-3 rounded-[3px] ${className}`} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
