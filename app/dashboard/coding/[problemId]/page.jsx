"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Lightbulb,
  LoaderCircle,
  Play,
  RotateCcw,
  Save,
  Sparkles,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { EDITOR_OPTIONS, configureMonaco } from "../_components/monacoSetup";
import { runJavaScriptTests } from "../_components/runTests";

// Monaco is large and touches the DOM on import, so it is loaded on demand and
// never becomes part of the initial dashboard bundle.
const MonacoEditor = dynamic(
  async () => {
    const editorModule = await import("@monaco-editor/react");
    configureMonaco();
    return editorModule;
  },
  { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-none" /> }
);

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
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
  const [saving, setSaving] = useState(false);
  const [testRun, setTestRun] = useState(null);
  const [review, setReview] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getCodingSession(problemId);
        if (cancelled) return;

        setSession(data);
        setCode(data.code || data.problem?.starterCode || "");
        setReview(data.review ?? null);
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

  // A visible clock: interview coding rounds are timed, so practice should be.
  useEffect(() => {
    if (loadState !== "ready") return undefined;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [loadState]);

  const persist = useCallback(
    async (passed, total) => {
      try {
        await saveCodeProgress({
          problemId,
          code,
          language: session?.language,
          testsPassed: passed,
          testsTotal: total,
        });
        dirtyRef.current = false;
        setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch (error) {
        console.error("Could not save code:", error);
      }
    },
    [problemId, code, session?.language]
  );

  // Autosave a few seconds after typing stops, so a refresh does not lose work.
  useEffect(() => {
    if (loadState !== "ready" || !dirtyRef.current) return undefined;
    const timer = setTimeout(() => persist(testRun?.passed ?? null, testRun?.total ?? null), 4000);
    return () => clearTimeout(timer);
  }, [code, loadState, persist, testRun]);

  const isJavaScript = session?.language === "javascript";
  const problem = session?.problem;

  const handleRun = async () => {
    if (!isJavaScript || running) return;

    setRunning(true);
    setTestRun(null);

    const outcome = await runJavaScriptTests({
      code,
      functionName: problem.functionName,
      testCases: problem.testCases,
    });

    setRunning(false);

    if (outcome.error) {
      setTestRun({ error: outcome.error, results: [], logs: outcome.logs ?? [] });
      toast.error(outcome.error);
      return;
    }

    const passed = outcome.results.filter((result) => result.passed).length;
    const total = outcome.results.length;

    setTestRun({ results: outcome.results, logs: outcome.logs ?? [], passed, total });
    await persist(passed, total);

    if (passed === total) toast.success(`All ${total} tests passed.`);
    else toast.error(`${passed} of ${total} tests passed.`);
  };

  const handleReview = async () => {
    if (reviewing) return;
    setReviewing(true);

    try {
      const result = await reviewCode({
        problemId,
        code,
        language: session?.language,
        testsPassed: testRun?.passed ?? session?.testsPassed,
        testsTotal: testRun?.total ?? session?.testsTotal,
      });

      if (!result?.success) {
        toast.error(result?.error || "Could not review your code.");
        return;
      }

      setReview(result);
      toast.success(`Reviewed. Score: ${result.score ?? "-"}/10`);
    } catch (error) {
      console.error("Code review failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setReviewing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await persist(testRun?.passed ?? null, testRun?.total ?? null);
    setSaving(false);
    toast.success("Code saved.");
  };

  if (loadState === "loading") {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[520px] rounded-2xl" />
        <Skeleton className="h-[520px] rounded-2xl" />
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
          Back to coding round
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to problem list"
            onClick={() => router.push("/dashboard/coding")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{problem.title}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{problem.difficulty}</Badge>
              <Badge variant="outline">{problem.topic}</Badge>
            </div>
          </div>
        </div>

        <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted-foreground">
          <Clock className="h-4 w-4" />
          {formatElapsed(elapsed)}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ---------------- Problem ---------------- */}
        <section className="space-y-4 overflow-y-auto rounded-2xl border border-border bg-card p-5 lg:max-h-[calc(100vh-12rem)]">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{problem.statement}</p>

          {problem.signature ? (
            <div>
              <p className="mono-label mb-1 text-muted-foreground">Signature</p>
              <code className="block overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs">
                {problem.signature}
              </code>
            </div>
          ) : null}

          {problem.examples?.length > 0 ? (
            <div>
              <p className="mono-label mb-2 text-muted-foreground">Examples</p>
              <ul className="space-y-2">
                {problem.examples.map((example, index) => (
                  <li
                    key={index}
                    className="overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-xs"
                  >
                    <p>
                      <span className="text-muted-foreground">in </span>
                      {example.input}
                    </p>
                    <p>
                      <span className="text-muted-foreground">out </span>
                      {example.output}
                    </p>
                    {example.explanation ? (
                      <p className="mt-1 font-sans text-muted-foreground">{example.explanation}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {problem.constraints?.length > 0 ? (
            <div>
              <p className="mono-label mb-2 text-muted-foreground">Constraints</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {problem.constraints.map((constraint) => (
                  <li key={constraint}>{constraint}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {problem.hints?.length > 0 ? (
            <Collapsible className="overflow-hidden rounded-lg border border-border">
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium transition-colors hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Show hints ({problem.hints.length})
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border bg-muted/30 p-3">
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  {problem.hints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </section>

        {/* ---------------- Editor ---------------- */}
        <section className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                solution.{session.language === "javascript" ? "js" : session.language}
                {savedAt ? (
                  <span className="text-emerald-500">saved {savedAt}</span>
                ) : (
                  <span>autosaves as you type</span>
                )}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset code
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save now
                </Button>
              </div>
            </div>

            <div className="h-[380px]">
              <MonacoEditor
                height="100%"
                language={session.language}
                theme={resolvedTheme === "light" ? "vs" : "vs-dark"}
                value={code}
                onChange={(value) => {
                  setCode(value ?? "");
                  dirtyRef.current = true;
                }}
                options={EDITOR_OPTIONS}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {isJavaScript ? (
              <Button onClick={handleRun} disabled={running}>
                {running ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Running tests...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" /> Run tests
                  </>
                )}
              </Button>
            ) : null}

            <Button variant={isJavaScript ? "outline" : "default"} onClick={handleReview} disabled={reviewing}>
              {reviewing ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Reviewing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Get code review
                </>
              )}
            </Button>
          </div>

          {/* ---------------- Test results ---------------- */}
          {testRun ? (
            <div className="animate-slide-up overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                {testRun.error ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : testRun.passed === testRun.total ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-semibold">
                  {testRun.error
                    ? "Run failed"
                    : `${testRun.passed} of ${testRun.total} tests passed`}
                </span>
              </div>

              <div className="max-h-[280px] overflow-y-auto p-3">
                {testRun.error ? (
                  <p className="font-mono text-xs text-destructive">{testRun.error}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {testRun.results.map((result) => (
                      <li
                        key={result.index}
                        className={`rounded-lg border p-2.5 font-mono text-xs ${
                          result.passed
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-destructive/30 bg-destructive/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {result.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          )}
                          <span className="font-semibold">Case {result.index + 1}</span>
                        </div>
                        <p className="mt-1.5 break-all text-muted-foreground">
                          args {result.args}
                        </p>
                        {!result.passed ? (
                          <>
                            <p className="break-all text-muted-foreground">
                              want {result.expected}
                            </p>
                            <p className="break-all text-destructive">got {result.actual}</p>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {testRun.logs?.length > 0 ? (
                  <div className="mt-3 rounded-lg border border-border bg-background p-2.5">
                    <p className="mono-label mb-1 text-muted-foreground">console</p>
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                      {testRun.logs.join("\n")}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* ---------------- Review ---------------- */}
      {review ? (
        <section className="animate-slide-up space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Code review</h2>
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

          {review.verdict ? <p className="text-sm font-medium">{review.verdict}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Correctness", body: review.correctness },
              { title: "Strengths", body: review.strengths },
              { title: "Improvements", body: review.improvements },
              { title: "Optimal approach", body: review.optimalApproach },
            ]
              .filter((block) => block.body)
              .map((block) => (
                <div key={block.title} className="rounded-xl border border-border bg-background p-4">
                  <h3 className="mono-label mb-1.5 text-muted-foreground">{block.title}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.body}</p>
                </div>
              ))}
          </div>

          {review.edgeCases?.length > 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h3 className="mono-label mb-1.5 text-amber-500">Edge cases to handle</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {review.edgeCases.map((edgeCase) => (
                  <li key={edgeCase}>{edgeCase}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        destructive
        title="Reset to the starter code?"
        description="Everything you have written for this problem is replaced by the original stub. This cannot be undone."
        confirmLabel="Reset code"
        onConfirm={() => {
          setCode(problem.starterCode || "");
          dirtyRef.current = true;
          setTestRun(null);
        }}
      />
    </div>
  );
}
