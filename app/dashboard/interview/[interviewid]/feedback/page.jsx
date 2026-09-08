"use client";

import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Lightbulb,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

import { getFeedbackByMockId } from "@/actions/dbActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function scoreTone(score) {
  const value = Number.parseFloat(score);
  if (!Number.isFinite(value)) return "outline";
  if (value >= 8) return "success";
  if (value >= 5) return "warning";
  return "danger";
}

function verdict(average) {
  const value = Number.parseFloat(average);
  if (!Number.isFinite(value)) return "Not scored yet";
  if (value >= 8) return "Strong performance - you're interview ready.";
  if (value >= 6) return "Solid, with clear room to sharpen your answers.";
  if (value >= 4) return "A reasonable start. Work through the improvements below.";
  return "Plenty to work on. Rerun this interview after reviewing the ideal answers.";
}

function DetailBlock({ icon: Icon, title, tone, children }) {
  if (!children) return null;

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function Feedback({ params }) {
  const { interviewid } = params;
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [attempt, setAttempt] = useState(undefined);

  const load = useCallback(
    async (requestedAttempt) => {
      setLoadState("loading");
      try {
        const result = await getFeedbackByMockId(interviewid, { attempt: requestedAttempt });
        setData(result);
        setAttempt(result.selectedAttempt);
        setLoadState("ready");
      } catch (error) {
        console.error("Could not load feedback:", error);
        setLoadState("error");
      }
    },
    [interviewid]
  );

  useEffect(() => {
    load(undefined);
  }, [load]);

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <h1 className="text-xl font-bold text-destructive">Feedback unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This interview may have been deleted, or it belongs to a different account.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const { answers, attempts, averageRating } = data;
  const percent = Number.parseFloat(averageRating);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {answers.length === 0 ? (
        // The old page opened with "Congratulations!" even when nothing had been
        // answered at all.
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h1 className="mt-4 text-xl font-bold">No feedback yet</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            You haven&apos;t submitted any answers for this interview. Answers are graded the
            moment you submit them.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Back to dashboard
            </Button>
            <Button onClick={() => router.push(`/dashboard/interview/${interviewid}/start`)}>
              Take the interview
            </Button>
          </div>
        </div>
      ) : (
        <>
          <header>
            <h1 className="bg-gradient-to-r from-emerald-500 to-emerald-700 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-emerald-400 dark:to-emerald-500">
              Interview complete
            </h1>
            <p className="mt-1 text-muted-foreground">
              {answers.length} {answers.length === 1 ? "answer" : "answers"} graded.
            </p>
          </header>

          <section className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall rating</p>
                <p className="text-4xl font-bold tabular-nums">
                  {averageRating ?? "--"}
                  <span className="text-xl font-medium text-muted-foreground">/10</span>
                </p>
              </div>

              {attempts.length > 1 ? (
                <div className="w-44">
                  <label htmlFor="attempt" className="mb-1.5 block text-xs font-semibold">
                    Attempt
                  </label>
                  <Select
                    id="attempt"
                    value={attempt ?? ""}
                    onChange={(event) => load(Number(event.target.value))}
                  >
                    {attempts.map((value) => (
                      <option key={value} value={value}>
                        Attempt {value}
                        {value === attempts[attempts.length - 1] ? " (latest)" : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>

            <Progress
              value={Number.isFinite(percent) ? percent * 10 : 0}
              className="mt-4"
              indicatorClassName={
                percent >= 8
                  ? "bg-emerald-500"
                  : percent >= 5
                    ? "bg-amber-500"
                    : "bg-destructive"
              }
            />
            <p className="mt-3 text-sm text-muted-foreground">{verdict(averageRating)}</p>
          </section>

          <div className="space-y-4">
            {answers.map((answer, index) => (
              <Collapsible
                key={answer.id}
                className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
              >
                <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 p-4 text-left font-semibold transition-colors hover:bg-accent">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
                      Q{index + 1}
                    </span>
                    <span className="min-w-0 flex-1">{answer.question}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={scoreTone(answer.rating)}>{answer.rating ?? "-"}/10</Badge>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 border-t border-border bg-muted/30 p-4">
                  {answer.confidenceLevel ? (
                    <Badge variant="outline">Confidence read: {answer.confidenceLevel}</Badge>
                  ) : null}

                  <DetailBlock
                    icon={ClipboardList}
                    title="Your answer"
                    tone="border-border bg-card"
                  >
                    {answer.useranswer}
                  </DetailBlock>

                  <DetailBlock
                    icon={Sparkles}
                    title="Ideal answer"
                    tone="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                  >
                    {answer.correctanswer}
                  </DetailBlock>

                  <DetailBlock
                    icon={Lightbulb}
                    title="Feedback"
                    tone="border-primary/25 bg-primary/5"
                  >
                    {answer.feedback}
                  </DetailBlock>

                  {/* These columns were being written to the database on every
                      answer but never shown anywhere. */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailBlock
                      icon={ThumbsUp}
                      title="Strengths"
                      tone="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                    >
                      {answer.strengths}
                    </DetailBlock>
                    <DetailBlock
                      icon={TriangleAlert}
                      title="Weaknesses"
                      tone="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                    >
                      {answer.weaknesses}
                    </DetailBlock>
                  </div>

                  <DetailBlock
                    icon={RotateCcw}
                    title="How to improve"
                    tone="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
                  >
                    {answer.improvements}
                  </DetailBlock>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to dashboard
        </Button>
        {answers.length > 0 ? (
          <Button onClick={() => router.push(`/dashboard/interview/${interviewid}/start`)}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> Retake this interview
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default Feedback;
