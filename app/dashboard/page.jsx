"use client";

import { useUser } from "@clerk/nextjs";
import { Briefcase, Mail, MessageSquareText, PenTool, TrendingUp } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { getDashboardStats, getProgressTrend } from "@/actions/dbActions";
import { Skeleton } from "@/components/ui/skeleton";
import AddNewInterview from "./_components/AddNewInterview";
import InterviewList from "./_components/InterviewList";
import ScoreTrend from "./_components/ScoreTrend";

const STAT_CARDS = [
  {
    key: "totalInterviews",
    label: "Interviews created",
    icon: Briefcase,
    tone: "text-primary",
  },
  {
    key: "averageScore",
    label: "Average score",
    icon: TrendingUp,
    tone: "text-emerald-600 dark:text-emerald-400",
    suffix: " / 10",
    empty: "--",
  },
  {
    key: "totalAnswers",
    label: "Answers graded",
    icon: MessageSquareText,
    tone: "text-sky-600 dark:text-sky-400",
  },
  {
    key: "grammarUsage",
    label: "Grammar checks",
    icon: PenTool,
    tone: "text-purple-600 dark:text-purple-400",
  },
  {
    key: "emailUsage",
    label: "Emails polished",
    icon: Mail,
    tone: "text-amber-600 dark:text-amber-400",
  },
];

function Dashboard() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statsResult, trendResult] = await Promise.all([
        getDashboardStats(),
        getProgressTrend(10),
      ]);
      setStats(statsResult);
      setTrend(trendResult);
    } catch (error) {
      // The stat strip is supplementary; a failure here must not blank the page.
      console.error("Could not load dashboard stats:", error);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && user) loadStats();
  }, [isLoaded, user, loadStats, refreshKey]);

  const refreshAll = () => setRefreshKey((key) => key + 1);

  const firstName = user?.firstName;

  return (
    <div className="space-y-10 p-1 md:p-4">
      <header>
        <h1 className="bg-gradient-to-r from-blue-700 to-indigo-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-blue-400 dark:to-indigo-300">
          {firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        </h1>
        <p className="mt-1 font-medium text-muted-foreground">
          Track your progress and run a new AI mock interview.
        </p>
      </header>

      <section aria-label="Your stats">
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STAT_CARDS.map((card) => (
              <Skeleton key={card.key} className="h-[104px] rounded-2xl" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {STAT_CARDS.map(({ key, label, icon: Icon, tone, suffix, empty }) => {
              const value = stats[key];
              const isEmpty = value === null || value === undefined;

              return (
                <div
                  key={key}
                  className="flex flex-col justify-center gap-2 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm"
                >
                  <span className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </span>
                  <span className="text-3xl font-bold tabular-nums">
                    {isEmpty ? (empty ?? 0) : value}
                    {!isEmpty && suffix ? (
                      <span className="text-base font-medium text-muted-foreground">{suffix}</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {!statsLoading ? <ScoreTrend data={trend} /> : null}

      <AddNewInterview onCreated={refreshAll} />

      <section>
        <h2 className="mb-4 text-xl font-bold">Your mock interviews</h2>
        <InterviewList refreshKey={refreshKey} onChanged={loadStats} />
      </section>
    </div>
  );
}

export default Dashboard;
