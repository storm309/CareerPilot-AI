"use client";

import {
  Braces,
  FileSearch,
  Flame,
  Gauge,
  MessageSquareText,
  PenTool,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { getProgressOverview } from "@/actions/progressActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile, StatTileGrid } from "@/components/ui/stat-tile";
import ActivityHeatmap from "./_components/ActivityHeatmap";
import SkillBars from "./_components/SkillBars";

function streakCopy(streak) {
  if (streak.current === 0) {
    return streak.activeDays > 0
      ? "Your streak has lapsed. One answer today starts it again."
      : "Practice something today to start your streak.";
  }

  if (streak.current === 1) return "Day one. Come back tomorrow to keep it going.";
  if (streak.current >= streak.longest) return "This is your longest streak yet. Keep it.";
  return `${streak.longest - streak.current} more days to beat your record of ${streak.longest}.`;
}

export default function ProgressPage() {
  const [data, setData] = useState(null);
  const [loadState, setLoadState] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const overview = await getProgressOverview();
        if (cancelled) return;
        setData(overview);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load progress:", error);
        setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadState === "loading") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <h1 className="text-xl font-bold text-destructive">Couldn&apos;t load your progress</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong fetching your history. Try reloading the page.
        </p>
      </div>
    );
  }

  const { streak, heatmap, skills, weakest, totals, pace } = data;

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-primary">You</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <TrendingUp className="h-7 w-7 text-primary" />
          Progress
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Everything you&apos;ve practiced, what it says about your strengths, and the questions
          worth going back to.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${
              streak.current > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Flame className="h-8 w-8" />
          </span>
          <div>
            <p className="font-mono text-4xl font-bold tabular-nums">
              {streak.current}
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {streak.current === 1 ? "day" : "days"}
              </span>
            </p>
            <p className="mono-label text-muted-foreground">Current streak</p>
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <p className="text-sm text-muted-foreground">{streakCopy(streak)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">Longest {streak.longest}</Badge>
            <Badge variant="outline">{streak.activeDays} active days</Badge>
          </div>
        </div>
      </section>

      <StatTileGrid className="lg:grid-cols-6">
        <StatTile
          label="Interviews"
          value={totals.interviews}
          icon={MessageSquareText}
          tone="text-primary"
        />
        <StatTile label="Answers graded" value={totals.answers} icon={MessageSquareText} />
        <StatTile
          label="Coding solved"
          value={`${totals.codingPassed}/${totals.coding}`}
          icon={Braces}
          hint="all tests passing"
        />
        <StatTile label="Resume checks" value={totals.resumes} icon={FileSearch} />
        <StatTile label="Writing tools" value={totals.writing} icon={PenTool} />
        <StatTile
          label="Speaking pace"
          value={pace.averageWpm}
          suffix=" wpm"
          icon={Gauge}
          hint={pace.samples > 0 ? `${pace.averageFillerRate} fillers/100 words` : "record an answer"}
        />
      </StatTileGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkillBars skills={skills} />
        <ActivityHeatmap days={heatmap} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <TriangleAlert className="h-4 w-4 text-amber-500" />
          Worth revisiting
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Your five lowest-scoring answers. These are where the marks are.
        </p>

        {weakest.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing scored yet. Run an interview and your weak spots will show up here.
            </p>
            <Link href="/dashboard">
              <Button className="mt-4" size="sm">
                Start an interview
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {weakest.map((item, index) => (
              <li
                key={`${item.mockid}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold tabular-nums ${
                    item.rating >= 5
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {item.rating}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm" title={item.question}>
                  {item.question}
                </p>
                <Link href={`/dashboard/interview/${item.mockid}/feedback`}>
                  <Button variant="outline" size="sm">
                    See feedback
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
