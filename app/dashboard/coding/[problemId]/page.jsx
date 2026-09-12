"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  FileText,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Terminal,
  X,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getCodingSession, reviewCode, saveCodeProgress } from "@/actions/codingActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TabList, TabPanel } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { EDITOR_OPTIONS, configureMonaco } from "../_components/monacoSetup";
import { runJavaScriptTests } from "../_components/runTests";

// Monaco is large and touches the DOM on import, so it loads on demand and
// never becomes part of the initial dashboard bundle.
const MonacoEditor = dynamic(
  async () => {
    const editorModule = await import("@monaco-editor/react");
    configureMonaco();
    return editorModule;
  },
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-none" /> }
);

const DIFFICULTY_TONE = {
  Easy: "text-emerald-500",
  Medium: "text-amber-500",
  Hard: "text-rose-500",
};

const LANGUAGE_LABEL = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
};

function formatElapsed(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Renders one argument list the way it would be typed as a call. */
function formatArgs(args) {
  if (typeof args === "string") return args;
  if (!Array.isArray(args)) return String(args);
  return args.map((arg) => JSON.stringify(arg)).join(", ");
}

function SaveState({ state, savedAt }) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderCircle className="h-3 w-3 animate-spin" /> Saving
      </span>
    );
  }

  if (state === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <CloudOff className="h-3 w-3" /> Not saved
      </span>
    );
  }

  if (state === "dirty") {
    return <span className="text-xs text-muted-foreground">Unsaved changes</span>;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Cloud className="h-3 w-3" /> Saved {savedAt}
    </span>
  );
}

export default function CodingProblemPage({ params }) {
  const { problemId } = params;
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [session, setSession] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [testRun, setTestRun] = useState(null);
  const [review, setReview] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);

  const [saveState, setSaveState] = useState("saved"); // saved | dirty | saving | error
  const [savedAt, setSavedAt] = useState(null);

  const [leftTab, setLeftTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("testcase");
  const [activeCase, setActiveCase] = useState(0);

  // The latest code, readable from listeners that must not re-subscribe on
  // every keystroke.
  const codeRef = useRef("");
  codeRef.current = code;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCodingSession(problemId);
        if (cancelled) return;

        setSession(data);
        setCode(data.code || data.problem?.starterCode || "");
        setReview(data.review ?? null);
        if (data.review) setLeftTab("review");
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load problem:", error);
        setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [problemId]);

  // Coding rounds are timed, so practice is too.
  useEffect(() => {
    if (loadState !== "ready") return undefined;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [loadState]);

  const persist = useCallback(
    async (passed, total) => {
      setSaveState("saving");
      try {
        const result = await saveCodeProgress({
          problemId,
          code: codeRef.current,
          language: session?.language,
          testsPassed: passed,
          testsTotal: total,
        });

        if (result?.success === false) throw new Error(result.error);

        setSaveState("saved");
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        return true;
      } catch (error) {
        console.error("Could not save code:", error);
        setSaveState("error");
        return false;
      }
    },
    [problemId, session?.language]
  );

  // Autosave once typing settles.
  useEffect(() => {
    if (loadState !== "ready" || saveState !== "dirty") return undefined;
    const timer = setTimeout(() => persist(testRun?.passed ?? null, testRun?.total ?? null), 2500);
    return () => clearTimeout(timer);
  }, [code, loadState, saveState, persist, testRun]);

  // Switching tabs or closing the laptop is the most common way to lose work,
  // and it fires before unload does.
  useEffect(() => {
    if (loadState !== "ready") return undefined;

    const flush = () => {
      if (document.visibilityState === "hidden" && saveState === "dirty") {
        persist(testRun?.passed ?? null, testRun?.total ?? null);
      }
    };

    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [loadState, saveState, persist, testRun]);

  // Native confirm dialog if work would be lost on navigation.
  useEffect(() => {
    if (saveState !== "dirty" && saveState !== "error") return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const problem = session?.problem;
  const isJavaScript = session?.language === "javascript";

  const handleRun = async () => {
    if (!isJavaScript || running) return;

    setRunning(true);
    setBottomTab("result");

    const startedAt = performance.now();
    const outcome = await runJavaScriptTests({
      code,
      functionName: problem.functionName,
      testCases: problem.testCases,
    });
    const ms = Math.round(performance.now() - startedAt);

    setRunning(false);

    if (outcome.error) {
      setTestRun({ error: outcome.error, results: [], logs: outcome.logs ?? [], ms });
      return;
    }

    const passed = outcome.results.filter((result) => result.passed).length;
    const total = outcome.results.length;

    setTestRun({ results: outcome.results, logs: outcome.logs ?? [], passed, total, ms });
    setActiveCase(outcome.results.findIndex((result) => !result.passed) ?? 0);
    await persist(passed, total);
  };

  const handleSubmit = async () => {
    if (reviewing) return;

    // Submitting means "grade my final answer", so make sure the tests reflect
    // the code actually being graded.
    let passed = testRun?.passed ?? session?.testsPassed;
    let total = testRun?.total ?? session?.testsTotal;

    if (isJavaScript) {
      setRunning(true);
      const outcome = await runJavaScriptTests({
        code,
        functionName: problem.functionName,
        testCases: problem.testCases,
      });
      setRunning(false);

      if (outcome.error) {
        setTestRun({ error: outcome.error, results: [], logs: outcome.logs ?? [] });
        setBottomTab("result");
        toast.error("Fix the error before submitting.");
        return;
      }

      passed = outcome.results.filter((result) => result.passed).length;
      total = outcome.results.length;
      setTestRun({ results: outcome.results, logs: outcome.logs ?? [], passed, total });
    }

    setReviewing(true);
    setLeftTab("review");

    try {
      const result = await reviewCode({
        problemId,
        code,
        language: session?.language,
        testsPassed: passed,
        testsTotal: total,
      });

      if (!result?.success) {
        toast.error(result?.error || "Could not review your code.");
        return;
      }

      setReview(result);
      setSaveState("saved");
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      toast.success(`Submitted. Review score ${result.score ?? "-"}/10`);
    } catch (error) {
      console.error("Code review failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setReviewing(false);
    }
  };

  if (loadState === "loading") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[560px] rounded-2xl" />
        <Skeleton className="h-[560px] rounded-2xl" />
      </div>
    );
  }

  if (loadState === "error" || !problem) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <h1 className="text-xl font-bold text-destructive">Problem unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This problem may have been deleted, or it belongs to a different account.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard/coding")}>
          Back to problems
        </Button>
      </div>
    );
  }

  const accepted = testRun && !testRun.error && testRun.passed === testRun.total;
  const currentCase = testRun?.results?.[activeCase];

  return (
    <div className="space-y-3">
      {/* ------------------------------ top bar ------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to problems"
            onClick={() => router.push("/dashboard/coding")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{problem.title}</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className={cn("font-semibold", DIFFICULTY_TONE[problem.difficulty])}>
                {problem.difficulty}
              </span>
              <span className="text-muted-foreground/40">&middot;</span>
              <span className="text-muted-foreground">{problem.topic}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatElapsed(elapsed)}
          </span>
          <Button variant="outline" size="sm" onClick={handleRun} disabled={running || !isJavaScript}>
            {running ? (
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1.5 h-4 w-4" />
            )}
            Run
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={reviewing || running}>
            {reviewing ? (
              <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" />
            )}
            Submit
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* --------------------------- left panel --------------------------- */}
        <section className="flex max-h-[calc(100vh-11rem)] min-h-[540px] flex-col overflow-hidden rounded-xl border border-border bg-card">
          <TabList
            label="Problem"
            value={leftTab}
            onChange={setLeftTab}
            tabs={[
              { value: "description", label: "Description", icon: FileText },
              { value: "hints", label: "Hints", icon: Lightbulb, badge: problem.hints?.length || null },
              { value: "review", label: "Review", icon: Sparkles, badge: review ? review.score : null },
            ]}
          />

          <div className="flex-1 overflow-y-auto p-5">
            <TabPanel value="description" activeValue={leftTab} className="space-y-6">
              <p className="whitespace-pre-wrap leading-relaxed">{problem.statement}</p>

              {problem.examples?.map((example, index) => (
                <div key={index}>
                  <p className="mb-1.5 text-sm font-semibold">Example {index + 1}:</p>
                  <div className="space-y-1 border-l-2 border-border py-1 pl-4 font-mono text-[13px]">
                    <p className="break-all">
                      <span className="font-semibold">Input: </span>
                      <span className="text-muted-foreground">{example.input}</span>
                    </p>
                    <p className="break-all">
                      <span className="font-semibold">Output: </span>
                      <span className="text-muted-foreground">{example.output}</span>
                    </p>
                    {example.explanation ? (
                      <p className="font-sans">
                        <span className="font-semibold">Explanation: </span>
                        <span className="text-muted-foreground">{example.explanation}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}

              {problem.constraints?.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-sm font-semibold">Constraints:</p>
                  <ul className="list-disc space-y-1 pl-5 font-mono text-[13px] text-muted-foreground">
                    {problem.constraints.map((constraint) => (
                      <li key={constraint}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {problem.signature ? (
                <div>
                  <p className="mb-1.5 text-sm font-semibold">Signature</p>
                  <code className="block overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs">
                    {problem.signature}
                  </code>
                </div>
              ) : null}
            </TabPanel>

            <TabPanel value="hints" activeValue={leftTab}>
              {problem.hints?.length > 0 ? (
                <ol className="space-y-3">
                  {problem.hints.map((hint, index) => (
                    <li key={hint} className="rounded-lg border border-border bg-background p-3">
                      <p className="mono-label mb-1 text-amber-500">Hint {index + 1}</p>
                      <p className="text-sm text-muted-foreground">{hint}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No hints for this one.</p>
              )}
            </TabPanel>

            <TabPanel value="review" activeValue={leftTab} className="space-y-4">
              {reviewing ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : review ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={Number(review.score) >= 7 ? "success" : "warning"}>
                      {review.score ?? "-"}/10
                    </Badge>
                    {review.timeComplexity ? (
                      <Badge variant="outline">Time {review.timeComplexity}</Badge>
                    ) : null}
                    {review.spaceComplexity ? (
                      <Badge variant="outline">Space {review.spaceComplexity}</Badge>
                    ) : null}
                  </div>

                  {review.verdict ? <p className="font-medium">{review.verdict}</p> : null}

                  {[
                    { title: "Correctness", body: review.correctness },
                    { title: "Strengths", body: review.strengths },
                    { title: "Improvements", body: review.improvements },
                    { title: "Optimal approach", body: review.optimalApproach },
                  ]
                    .filter((block) => block.body)
                    .map((block) => (
                      <div key={block.title} className="rounded-lg border border-border bg-background p-3">
                        <p className="mono-label mb-1.5 text-muted-foreground">{block.title}</p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.body}</p>
                      </div>
                    ))}

                  {review.edgeCases?.length > 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="mono-label mb-1.5 text-amber-500">Edge cases</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {review.edgeCases.map((edgeCase) => (
                          <li key={edgeCase}>{edgeCase}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 opacity-20" />
                  <p className="max-w-xs text-sm">
                    Hit <strong className="text-foreground">Submit</strong> to have a senior
                    engineer review your approach, complexity and edge cases.
                  </p>
                </div>
              )}
            </TabPanel>
          </div>
        </section>

        {/* --------------------------- right panel --------------------------- */}
        <section className="flex max-h-[calc(100vh-11rem)] min-h-[540px] flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" />
                {LANGUAGE_LABEL[session.language] ?? session.language}
              </span>
              <div className="flex items-center gap-3">
                <SaveState state={saveState} savedAt={savedAt} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </div>

            <div className="min-h-[260px] flex-1">
              <MonacoEditor
                height="100%"
                language={session.language}
                theme={resolvedTheme === "light" ? "vs" : "vs-dark"}
                value={code}
                onChange={(value) => {
                  setCode(value ?? "");
                  setSaveState("dirty");
                }}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>

          {/* ------------------------ console ------------------------ */}
          <div className="flex max-h-[45%] min-h-[180px] flex-col overflow-hidden rounded-xl border border-border bg-card">
            <TabList
              label="Console"
              value={bottomTab}
              onChange={setBottomTab}
              tabs={[
                { value: "testcase", label: "Testcase" },
                {
                  value: "result",
                  label: "Test Result",
                  badge: testRun && !testRun.error ? `${testRun.passed}/${testRun.total}` : null,
                },
              ]}
            />

            <div className="flex-1 overflow-y-auto p-3">
              <TabPanel value="testcase" activeValue={bottomTab}>
                {!isJavaScript ? (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
                    Test cases only execute for JavaScript - running{" "}
                    {LANGUAGE_LABEL[session.language]} needs a server-side sandbox this app
                    doesn&apos;t have. Submit still gives you a full AI code review.
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {problem.testCases.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveCase(index)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        activeCase === index
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      Case {index + 1}
                    </button>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <p className="mono-label mb-1 text-muted-foreground">Input</p>
                    <pre className="overflow-x-auto rounded-lg border border-border bg-background p-2.5 font-mono text-xs">
                      {formatArgs(problem.testCases[activeCase]?.args)}
                    </pre>
                  </div>
                  <div>
                    <p className="mono-label mb-1 text-muted-foreground">Expected</p>
                    <pre className="overflow-x-auto rounded-lg border border-border bg-background p-2.5 font-mono text-xs">
                      {JSON.stringify(problem.testCases[activeCase]?.expected)}
                    </pre>
                  </div>
                </div>
              </TabPanel>

              <TabPanel value="result" activeValue={bottomTab}>
                {running ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Running your code...
                  </p>
                ) : !testRun ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Run your code to see results.
                  </p>
                ) : testRun.error ? (
                  <div>
                    <p className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                      <XCircle className="h-4 w-4" /> Error
                    </p>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-destructive">
                      {testRun.error}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p
                        className={cn(
                          "flex items-center gap-1.5 text-base font-semibold",
                          accepted ? "text-emerald-500" : "text-destructive"
                        )}
                      >
                        {accepted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {accepted ? "Accepted" : "Wrong Answer"}
                      </p>
                      <span className="font-mono text-xs text-muted-foreground">
                        {testRun.passed}/{testRun.total} cases
                        {testRun.ms != null ? ` · ${testRun.ms}ms` : ""}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {testRun.results.map((result, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveCase(index)}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                            activeCase === index ? "bg-secondary" : "hover:bg-accent",
                            result.passed ? "text-emerald-500" : "text-destructive"
                          )}
                        >
                          {result.passed ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          Case {index + 1}
                        </button>
                      ))}
                    </div>

                    {currentCase ? (
                      <div className="space-y-2">
                        <div>
                          <p className="mono-label mb-1 text-muted-foreground">Input</p>
                          <pre className="overflow-x-auto rounded-lg border border-border bg-background p-2.5 font-mono text-xs">
                            {formatArgs(problem.testCases[activeCase]?.args)}
                          </pre>
                        </div>
                        <div>
                          <p className="mono-label mb-1 text-muted-foreground">Your output</p>
                          <pre
                            className={cn(
                              "overflow-x-auto rounded-lg border p-2.5 font-mono text-xs",
                              currentCase.passed
                                ? "border-border bg-background"
                                : "border-destructive/30 bg-destructive/5 text-destructive"
                            )}
                          >
                            {currentCase.actual}
                          </pre>
                        </div>
                        <div>
                          <p className="mono-label mb-1 text-muted-foreground">Expected</p>
                          <pre className="overflow-x-auto rounded-lg border border-border bg-background p-2.5 font-mono text-xs">
                            {currentCase.expected}
                          </pre>
                        </div>
                      </div>
                    ) : null}

                    {testRun.logs?.length > 0 ? (
                      <div>
                        <p className="mono-label mb-1 text-muted-foreground">Console</p>
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-2.5 font-mono text-xs text-muted-foreground">
                          {testRun.logs.join("\n")}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                )}
              </TabPanel>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        destructive
        title="Reset to the starter code?"
        description="Everything you have written for this problem is replaced by the original stub. This cannot be undone."
        confirmLabel="Reset code"
        onConfirm={() => {
          setCode(problem.starterCode || "");
          setSaveState("dirty");
          setTestRun(null);
        }}
      />
    </div>
  );
}
