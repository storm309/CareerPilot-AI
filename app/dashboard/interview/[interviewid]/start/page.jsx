"use client";

import {
  ArrowLeft,
  ArrowRight,
  Flag,
  LoaderCircle,
  MonitorPlay,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { beginAttempt } from "@/actions/aiActions";
import { getInterviewDetails } from "@/actions/dbActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import QuestionsList from "./_components/QuestionsList";
import RecordAnswerSection from "./_components/RecordAnswerSection";
import { useProctoring } from "./_components/useProctoring";

function StartInterview({ params }) {
  const { interviewid } = params;
  const router = useRouter();

  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answered, setAnswered] = useState([]);
  const [attempt, setAttempt] = useState(1);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [sessionMode, setSessionMode] = useState(null); // null | proctored | practice
  const [startingSession, setStartingSession] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const goToFeedback = useCallback(() => {
    router.push(`/dashboard/interview/${interviewid}/feedback`);
  }, [router, interviewid]);

  const proctoring = useProctoring({
    onViolation: (reason, count, max) => {
      toast.error(`Warning ${count}/${max}: ${reason}`, { duration: 6000 });
    },
    onTerminate: (reason) => {
      toast.error(`Interview ended: ${reason}`, { duration: 8000 });
      goToFeedback();
    },
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [details, attemptInfo] = await Promise.all([
          getInterviewDetails(interviewid),
          beginAttempt(interviewid),
        ]);

        if (cancelled) return;

        setInterview(details);
        setQuestions(details.questions);

        if (attemptInfo?.success) {
          setAttempt(attemptInfo.attempt);
          setAnswered(attemptInfo.answeredQuestions ?? []);

          // Resume where the candidate left off rather than restarting at Q1.
          const firstUnanswered = details.questions.findIndex(
            (question) => !attemptInfo.answeredQuestions?.includes(question.question)
          );
          if (firstUnanswered > 0) setActiveIndex(firstUnanswered);
        }

        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load interview:", error);
        setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [interviewid]);

  const startProctored = async () => {
    setStartingSession(true);
    const outcome = await proctoring.start();
    setStartingSession(false);

    if (!outcome.ok) {
      toast.error(outcome.error);
      return;
    }

    setSessionMode("proctored");
    toast.success("Proctoring active. Stay in this window until you finish.");
  };

  const startPractice = () => {
    setSessionMode("practice");
    toast.info("Practice mode. Nothing is monitored - your answers are still scored.");
  };

  const handleAnswerSaved = useCallback((question) => {
    setAnswered((current) => (current.includes(question) ? current : [...current, question]));
  }, []);

  const finish = () => {
    proctoring.stop();
    goToFeedback();
  };

  const answeredCount = useMemo(
    () => questions.filter((question) => answered.includes(question.question)).length,
    [questions, answered]
  );

  if (loadState === "loading") {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-[420px] rounded-2xl" />
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    );
  }

  if (loadState === "error" || questions.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <h1 className="text-xl font-bold text-destructive">Interview unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t load this interview. It may have been deleted, or it belongs to a
          different account.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  // The proctoring gate: getDisplayMedia and requestFullscreen both need a real
  // click, so the session cannot begin from a mount effect.
  if (!sessionMode) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MonitorPlay className="h-6 w-6 text-primary" />
          Ready to begin?
        </h1>
        <p className="mt-2 text-muted-foreground">
          {interview?.jobposition} &middot; {questions.length} questions
          {attempt > 1 ? ` · attempt ${attempt}` : ""}
        </p>

        <ul className="mt-6 space-y-3 text-sm">
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>
              <strong>Proctored run:</strong> your browser will ask to share your screen and the
              page goes fullscreen. Switching tabs, losing focus, leaving fullscreen or stopping
              the share counts as a warning. Three warnings end the interview.
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <span>
              <strong>Practice run:</strong> nothing is monitored. Your answers are still graded
              and saved exactly the same way.
            </span>
          </li>
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={startProctored} disabled={startingSession}>
            {startingSession ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Starting...
              </>
            ) : (
              "Start proctored interview"
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={startPractice} disabled={startingSession}>
            Practice without proctoring
          </Button>
        </div>
      </div>
    );
  }

  const isLast = activeIndex === questions.length - 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{interview?.jobposition}</h1>
          <p className="text-sm text-muted-foreground">
            Question {activeIndex + 1} of {questions.length} &middot; {answeredCount} answered
          </p>
        </div>
        <Badge variant={sessionMode === "proctored" ? "success" : "outline"}>
          {sessionMode === "proctored" ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5" /> Proctored
            </>
          ) : (
            <>
              <ShieldOff className="h-3.5 w-3.5" /> Practice mode
            </>
          )}
        </Badge>
      </div>

      <Progress value={(answeredCount / questions.length) * 100} />

      {proctoring.violations > 0 ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {proctoring.violations} of {proctoring.maxViolations} warnings used. The interview ends
          at {proctoring.maxViolations}.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <QuestionsList
          questions={questions}
          activeIndex={activeIndex}
          answeredQuestions={answered}
          onSelect={setActiveIndex}
        />
        <RecordAnswerSection
          questions={questions}
          activeIndex={activeIndex}
          mockid={interviewid}
          attempt={attempt}
          onAnswerSaved={handleAnswerSaved}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-6">
        <Button
          variant="outline"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Previous
        </Button>
        <Button
          variant="outline"
          disabled={isLast}
          onClick={() => setActiveIndex((index) => Math.min(questions.length - 1, index + 1))}
        >
          Next <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
        <Button onClick={() => setConfirmFinish(true)}>
          <Flag className="mr-1.5 h-4 w-4" /> End interview
        </Button>
      </div>

      <ConfirmDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        title="End the interview?"
        description={
          answeredCount < questions.length
            ? `You've answered ${answeredCount} of ${questions.length} questions. Unanswered questions won't be scored, but you can come back and finish this attempt later.`
            : "You've answered every question. Let's look at your feedback."
        }
        confirmLabel="End and see feedback"
        onConfirm={finish}
      />
    </div>
  );
}

export default StartInterview;
