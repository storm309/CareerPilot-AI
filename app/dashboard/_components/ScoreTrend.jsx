"use client";

import React from "react";

const MAX_SCORE = 10;
const GRIDLINES = [10, 7.5, 5, 2.5, 0];

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Average score per interview, oldest to newest.
 *
 * One series, so there is no legend - the heading names it. Only the most recent
 * bar carries a direct label; the rest are read from the hover tooltip, with a
 * screen-reader table underneath carrying the same numbers.
 */
export default function ScoreTrend({ data = [] }) {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const best = data.reduce((max, row) => Math.max(max, row.average), 0);

  return (
    <section
      aria-labelledby="score-trend-heading"
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="score-trend-heading" className="text-base font-semibold">
          Average score per interview
        </h3>
        <p className="text-sm text-muted-foreground">
          Best so far <span className="font-semibold text-foreground">{best.toFixed(1)}</span>
        </p>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Oldest on the left. Scored out of {MAX_SCORE}.
      </p>

      <div className="flex h-52 gap-2">
        {/* Y-axis ticks live in their own column so the plot area's absolute
            positioning is not fighting the axis padding. */}
        <div className="relative w-6 shrink-0">
          {GRIDLINES.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 text-[11px] tabular-nums text-muted-foreground/70"
              style={{ bottom: `${(tick / MAX_SCORE) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {GRIDLINES.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className="absolute inset-x-0 h-px bg-border/60"
              style={{ bottom: `${(tick / MAX_SCORE) * 100}%` }}
            />
          ))}

          <ol className="relative flex h-full items-end gap-[2px]">
          {data.map((row, index) => {
            const isLatest = index === data.length - 1;
            const label = `${row.jobposition}, ${formatDate(row.createdat)}: ${row.average.toFixed(1)} out of ${MAX_SCORE}`;

            return (
              <li
                key={`${row.mockid}-${index}`}
                className="group relative flex h-full flex-1 items-end justify-center"
              >
                {isLatest ? (
                  <span
                    className="absolute z-10 -translate-y-1.5 text-xs font-semibold tabular-nums text-foreground"
                    style={{ bottom: `${(row.average / MAX_SCORE) * 100}%` }}
                  >
                    {row.average.toFixed(1)}
                  </span>
                ) : null}

                <div
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                  title={label}
                  className="w-full max-w-[46px] rounded-t bg-[hsl(var(--chart-1))] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-80"
                  style={{
                    // A floor keeps a score of 1 from collapsing into the axis.
                    height: `max(4px, ${(row.average / MAX_SCORE) * 100}%)`,
                    opacity: isLatest ? 1 : 0.75,
                  }}
                />

                <div
                  role="presentation"
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-xs shadow-lg group-hover:block group-focus-within:block"
                >
                  <p className="font-semibold text-popover-foreground">{row.jobposition}</p>
                  <p className="text-muted-foreground">{formatDate(row.createdat)}</p>
                  <p className="mt-1 font-semibold tabular-nums text-popover-foreground">
                    {row.average.toFixed(1)} / {MAX_SCORE}
                  </p>
                </div>
              </li>
            );
          })}
          </ol>
        </div>
      </div>

      <p className="mt-3 pl-8 text-xs text-muted-foreground">
        Most recent: {latest.jobposition} &middot; {formatDate(latest.createdat)}
      </p>

      {/* Same numbers, reachable without hovering. */}
      <table className="sr-only">
        <caption>Average score per interview</caption>
        <thead>
          <tr>
            <th scope="col">Interview</th>
            <th scope="col">Date</th>
            <th scope="col">Average score out of {MAX_SCORE}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={`${row.mockid}-row-${index}`}>
              <td>{row.jobposition}</td>
              <td>{formatDate(row.createdat)}</td>
              <td>{row.average.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
