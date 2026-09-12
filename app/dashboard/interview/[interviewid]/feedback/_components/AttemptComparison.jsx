"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

const MAX = 10;

function delta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return Number((current - previous).toFixed(1));
}

/**
 * Attempt-over-attempt averages for one interview.
 *
 * One series, oldest on the left, so the only question it answers - "am I
 * getting better at this interview?" - is readable at a glance. The change
 * against the previous attempt is stated in words as well as colour.
 */
export default function AttemptComparison({ attempts = [], selectedAttempt }) {
  const scored = attempts.filter((entry) => Number.isFinite(entry.average));
  if (scored.length < 2) return null;

  const latest = scored[scored.length - 1];
  const previous = scored[scored.length - 2];
  const change = delta(latest.average, previous.average);

  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const tone =
    change > 0 ? "text-emerald-500" : change < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <section
      aria-labelledby="attempts-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="attempts-heading" className="text-base font-semibold">
          Attempt over attempt
        </h2>
        <p className={`flex items-center gap-1.5 text-sm font-medium ${tone}`}>
          <Icon className="h-4 w-4" aria-hidden />
          {change > 0
            ? `Up ${change} on your last attempt`
            : change < 0
              ? `Down ${Math.abs(change)} on your last attempt`
              : "Level with your last attempt"}
        </p>
      </div>

      <ol className="flex items-end gap-3">
        {scored.map((entry) => {
          const isSelected = entry.attempt === selectedAttempt;

          return (
            <li key={entry.attempt} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-mono text-sm font-semibold tabular-nums">
                {entry.average.toFixed(1)}
              </span>
              <div className="flex h-24 w-full items-end">
                <div
                  role="img"
                  aria-label={`Attempt ${entry.attempt}: ${entry.average.toFixed(1)} out of ${MAX} across ${entry.answered} answers`}
                  title={`Attempt ${entry.attempt} · ${entry.answered} answers`}
                  // A floor keeps a low score visible rather than collapsing it.
                  style={{ height: `max(4px, ${(entry.average / MAX) * 100}%)` }}
                  className={`w-full rounded-t transition-all duration-500 ${
                    isSelected ? "bg-[hsl(var(--chart-1))]" : "bg-[hsl(var(--chart-1))]/35"
                  }`}
                />
              </div>
              <span
                className={`mono-label ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
              >
                #{entry.attempt}
              </span>
            </li>
          );
        })}
      </ol>

      <table className="sr-only">
        <caption>Average score by attempt</caption>
        <thead>
          <tr>
            <th scope="col">Attempt</th>
            <th scope="col">Answers</th>
            <th scope="col">Average out of {MAX}</th>
          </tr>
        </thead>
        <tbody>
          {scored.map((entry) => (
            <tr key={entry.attempt}>
              <td>{entry.attempt}</td>
              <td>{entry.answered}</td>
              <td>{entry.average.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
