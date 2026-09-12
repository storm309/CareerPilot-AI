"use client";

import React from "react";

const MAX = 10;

/**
 * Skill strength across the six things the app measures.
 *
 * Horizontal bars rather than a radar: a reader can compare bar lengths
 * accurately, where radar area distorts with the order the axes happen to sit
 * in. One series, so the heading names it and no legend is needed.
 */
export default function SkillBars({ skills = [] }) {
  const measured = skills.filter((skill) => Number.isFinite(skill.score));

  if (measured.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Skill breakdown</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Answer a few interview questions and run a resume check - your strengths and gaps will
          show up here.
        </p>
      </section>
    );
  }

  const weakest = measured.reduce((low, skill) => (skill.score < low.score ? skill : low));

  return (
    <section
      aria-labelledby="skills-heading"
      className="rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="skills-heading" className="text-base font-semibold">
        Skill breakdown
      </h2>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Each scored out of {MAX}. Weakest right now:{" "}
        <span className="font-semibold text-foreground">{weakest.skill}</span>.
      </p>

      <ul className="space-y-3.5">
        {skills.map((skill) => {
          const hasScore = Number.isFinite(skill.score);
          const percent = hasScore ? (skill.score / MAX) * 100 : 0;

          return (
            <li key={skill.skill}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className={hasScore ? "font-medium" : "text-muted-foreground"}>
                  {skill.skill}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {hasScore ? skill.score.toFixed(1) : "not measured yet"}
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                {hasScore ? (
                  <div
                    role="img"
                    aria-label={`${skill.skill}: ${skill.score.toFixed(1)} out of ${MAX}`}
                    // A floor keeps a score of 0.2 visible instead of vanishing.
                    style={{ width: `max(4px, ${percent}%)` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      skill.score >= 8
                        ? "bg-emerald-500"
                        : skill.score >= 5
                          ? "bg-[hsl(var(--chart-1))]"
                          : "bg-amber-500"
                    }`}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <table className="sr-only">
        <caption>Skill scores out of {MAX}</caption>
        <thead>
          <tr>
            <th scope="col">Skill</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill) => (
            <tr key={skill.skill}>
              <td>{skill.skill}</td>
              <td>{Number.isFinite(skill.score) ? skill.score.toFixed(1) : "Not measured"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
