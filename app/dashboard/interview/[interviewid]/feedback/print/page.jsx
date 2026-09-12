"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { getFeedbackByMockId } from "@/actions/dbActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function parseDelivery(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * A flat, fully expanded version of the feedback for saving as a PDF.
 *
 * The interactive page hides each answer inside a collapsible, and Radix
 * unmounts closed content - printing that would silently drop most of the
 * report. This route renders everything open and lets the browser's own print
 * dialog produce the PDF, which avoids shipping a PDF library to the client.
 */
export default function FeedbackPrintPage({ params }) {
  const { interviewid } = params;
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loadState, setLoadState] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getFeedbackByMockId(interviewid);
        if (cancelled) return;
        setData(result);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load report:", error);
        setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [interviewid]);

  if (loadState === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadState === "error" || !data?.answers?.length) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border p-10 text-center">
        <h1 className="text-xl font-bold">Nothing to export</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This interview has no graded answers yet.
        </p>
        <Button className="mt-6" onClick={() => router.push(`/dashboard/interview/${interviewid}/feedback`)}>
          Back to feedback
        </Button>
      </div>
    );
  }

  const { answers, averageRating, selectedAttempt } = data;

  return (
    <div data-print-root className="mx-auto max-w-3xl">
      <div data-print-hide className="mb-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Save as PDF
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Choose &ldquo;Save as PDF&rdquo; as the destination in your browser&apos;s print dialog.
        </p>
      </div>

      <header className="mb-8 border-b border-border pb-6">
        <p className="mono-label text-muted-foreground">CareerPilot AI &middot; Interview report</p>
        <h1 className="mt-2 text-3xl font-bold">Interview feedback</h1>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Overall rating: </span>
            <span className="font-mono font-semibold">{averageRating ?? "--"}/10</span>
          </p>
          <p>
            <span className="text-muted-foreground">Questions answered: </span>
            <span className="font-mono font-semibold">{answers.length}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Attempt: </span>
            <span className="font-mono font-semibold">{selectedAttempt}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Generated: </span>
            <span className="font-mono">{new Date().toLocaleDateString()}</span>
          </p>
        </div>
      </header>

      <div className="space-y-8">
        {answers.map((answer, index) => {
          const delivery = parseDelivery(answer.delivery);

          return (
            <article key={answer.id} data-print-block className="border-b border-border pb-6 last:border-0">
              <div className="mb-3 flex items-start justify-between gap-4">
                <h2 className="text-base font-semibold">
                  Q{index + 1}. {answer.question}
                </h2>
                <span className="shrink-0 font-mono text-sm font-semibold">
                  {answer.rating ?? "-"}/10
                </span>
              </div>

              {delivery ? (
                <p className="mb-3 font-mono text-xs text-muted-foreground">
                  {delivery.words} words
                  {delivery.wordsPerMinute ? ` · ${delivery.wordsPerMinute} wpm` : ""}
                  {` · ${delivery.fillerCount} filler words`}
                  {delivery.star ? ` · STAR ${delivery.star.score}/4` : ""}
                  {delivery.score != null ? ` · delivery ${delivery.score}/10` : ""}
                </p>
              ) : null}

              {[
                { label: "Your answer", body: answer.useranswer },
                { label: "Ideal answer", body: answer.correctanswer },
                { label: "Feedback", body: answer.feedback },
                { label: "Strengths", body: answer.strengths },
                { label: "Weaknesses", body: answer.weaknesses },
                { label: "How to improve", body: answer.improvements },
              ]
                .filter((section) => section.body)
                .map((section) => (
                  <div key={section.label} className="mb-3">
                    <h3 className="mono-label mb-1 text-muted-foreground">{section.label}</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{section.body}</p>
                  </div>
                ))}
            </article>
          );
        })}
      </div>

      <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        Generated by CareerPilot AI.
      </footer>
    </div>
  );
}
