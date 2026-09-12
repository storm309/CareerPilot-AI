"use client";

import { ArrowRight, Check, FileSearch, PenTool, Sparkles, Terminal, X } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "careerpilot:onboarding-dismissed";

/**
 * First-run checklist.
 *
 * Four separate tools are easy to miss when the dashboard opens on the
 * interview list, so each one gets named once, ticks itself off from the
 * user's real activity, and the whole card disappears for good once all four
 * are done.
 */
export default function GettingStarted({ totals, onAction }) {
  const [dismissed, setDismissed] = useState(true);

  // Read after mount: localStorage does not exist on the server, and reading it
  // during render would make the markup disagree with what React hydrates.
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!totals) return null;

  const steps = [
    {
      done: totals.interviews > 0,
      label: "Run a mock interview",
      blurb: "Paste a job description and answer five questions out loud.",
      href: null,
      icon: Sparkles,
      cta: "Start one",
    },
    {
      done: totals.resumes > 0,
      label: "Score your resume",
      blurb: "See which keywords from the posting your resume is missing.",
      href: "/dashboard/resume",
      icon: FileSearch,
      cta: "Check resume",
    },
    {
      done: totals.coding > 0,
      label: "Solve a coding problem",
      blurb: "Real test cases, run in your browser, then reviewed.",
      href: "/dashboard/coding",
      icon: Terminal,
      cta: "Open editor",
    },
    {
      done: totals.writing > 0,
      label: "Write something you'll send",
      blurb: "A cover letter, a recruiter email, or your LinkedIn bio.",
      href: "/dashboard/preparation",
      icon: PenTool,
      cta: "Open tools",
    },
  ];

  const completed = steps.filter((step) => step.done).length;

  // Nothing left to nudge about.
  if (dismissed || completed === steps.length) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Blocked storage: it will reappear next visit, which is acceptable.
    }
  };

  return (
    <section
      aria-labelledby="getting-started-heading"
      className="animate-fade-in relative rounded-2xl border border-primary/25 bg-primary/[0.04] p-5"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss getting started"
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground"
        onClick={dismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="pr-8">
        <p className="mono-label text-primary">Getting started</p>
        <h2 id="getting-started-heading" className="mt-1 text-lg font-semibold">
          Try all four in one sitting
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {completed} of {steps.length} done. Each takes a couple of minutes.
        </p>
      </div>

      <Progress value={(completed / steps.length) * 100} className="mt-4" />

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {steps.map(({ done, label, blurb, href, icon: Icon, cta }) => (
          <li
            key={label}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 transition-colors",
              done ? "border-border bg-background/40" : "border-border bg-card"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                done ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  done && "text-muted-foreground line-through"
                )}
              >
                {label}
              </p>
              {!done ? (
                <>
                  <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
                  {href ? (
                    <Link
                      href={href}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={onAction}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      {cta}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
