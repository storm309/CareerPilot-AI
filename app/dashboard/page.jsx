"use client";

import { useUser } from "@clerk/nextjs";
import {
  ArrowUpRight,
  Braces,
  Briefcase,
  FileSearch,
  Flame,
  Mail,
  MessageSquareText,
  PenTool,
  Terminal,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import { getDashboardStats, getProgressTrend } from "@/actions/dbActions";
import { getProgressOverview, getRecentActivity } from "@/actions/progressActions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile, StatTileGrid } from "@/components/ui/stat-tile";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewList from "./_components/InterviewList";
import ScoreTrend from "./_components/ScoreTrend";

const QUICK_ACTIONS = [
  {
    href: "/dashboard/coding",
    label: "Coding round",
    blurb: "Solve a problem, run the tests, get reviewed.",
    icon: Terminal,
  },
  {
    href: "/dashboard/resume",
    label: "Resume ATS check",
    blurb: "Score your resume against one job description.",
    icon: FileSearch,
  },
  {
    href: "/dashboard/preparation",
    label: "Writing tools",
    blurb: "Cover letters, emails and your LinkedIn bio.",
    icon: PenTool,
  },
];

const ACTIVITY_ICONS = {
  interview: MessageSquareText,
  resume: FileSearch,
  coding: Braces,
};

function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Dashboard() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [streak, setStreak] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      // Settled, not all: one slow or failing panel must not blank the others.
      const [statsResult, trendResult, overviewResult, activityResult] =
        await Promise.allSettled([
          getDashboardStats(),
          getProgressTrend(10),
          getProgressOverview(),
          getRecentActivity(6),
        ]);

      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (trendResult.status === "fulfilled") setTrend(trendResult.value);
      if (overviewResult.status === "fulfilled") setStreak(overviewResult.value.streak);
      if (activityResult.status === "fulfilled") setActivity(activityResult.value);

      for (const result of [statsResult, trendResult, overviewResult, activityResult]) {
        if (result.status === "rejected") {
          console.error("Dashboard panel failed:", result.reason);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) loadOverview();
  }, [isLoaded, user, loadOverview, refreshKey]);

  const firstName = user?.firstName;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono-label text-primary">Practice</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Pick up where you left off, or start something new.
          </p>
        </div>

        {streak?.current > 0 ? (
          <Link href="/dashboard/progress">
            <Badge variant="default" className="gap-1.5 px-3 py-1.5 text-sm">
              <Flame className="h-4 w-4" />
              {streak.current} day streak
            </Badge>
          </Link>
        ) : null}
      </header>

      <section aria-label="Your stats">
        {loading ? (
          <StatTileGrid>
            {[0, 1, 2, 3, 4].map((index) => (
              <Skeleton key={index} className="h-[92px] rounded-xl" />
            ))}
          </StatTileGrid>
        ) : stats ? (
          <StatTileGrid>
            <StatTile
              label="Interviews"
              value={stats.totalInterviews}
              icon={Briefcase}
              tone="text-primary"
            />
            <StatTile
              label="Avg score"
              value={stats.averageScore}
              suffix="/10"
              icon={TrendingUp}
              tone="text-emerald-500"
            />
            <StatTile label="Answers graded" value={stats.totalAnswers} icon={MessageSquareText} />
            <StatTile label="Grammar checks" value={stats.grammarUsage} icon={PenTool} />
            <StatTile label="Emails polished" value={stats.emailUsage} icon={Mail} />
          </StatTileGrid>
        ) : null}
      </section>

      <AddNewInterview onCreated={() => setRefreshKey((key) => key + 1)} />

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">
          Other things to practice
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map(({ href, label, blurb, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-3 font-semibold">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {!loading ? <ScoreTrend data={trend} /> : null}

      {activity.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {activity.map((item, index) => {
              const Icon = ACTIVITY_ICONS[item.kind] ?? MessageSquareText;

              return (
                <li key={`${item.kind}-${index}`}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="mono-label text-muted-foreground">{item.kind}</span>
                    </span>
                    {item.score ? (
                      <span className="font-mono text-sm tabular-nums">{item.score}</span>
                    ) : null}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(item.createdat)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Your mock interviews</h2>
        <InterviewList refreshKey={refreshKey} onChanged={loadOverview} />
      </section>
    </div>
  );
}

export default Dashboard;
