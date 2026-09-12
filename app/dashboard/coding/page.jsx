"use client";

import {
  CheckCircle2,
  CircleDashed,
  Code2,
  LoaderCircle,
  Terminal,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  deleteCodingSession,
  generateCodingProblem,
  getCodingHistory,
} from "@/actions/codingActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const TOPICS = [
  "Arrays & Strings",
  "Hash Maps",
  "Two Pointers",
  "Sliding Window",
  "Recursion",
  "Trees",
  "Graphs",
  "Dynamic Programming",
  "Sorting & Searching",
  "Stacks & Queues",
];

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", runs: true },
  { id: "typescript", label: "TypeScript", runs: false },
  { id: "python", label: "Python", runs: false },
  { id: "java", label: "Java", runs: false },
  { id: "cpp", label: "C++", runs: false },
];

// Generation takes the better part of a minute, so the button says what is
// happening rather than spinning silently.
const GENERATION_STEPS = [
  "Picking a problem...",
  "Writing the statement...",
  "Building test cases...",
  "Checking the expected answers...",
  "Almost there...",
];

function VerdictBadge({ session }) {
  if (session.testVerdict === "passed") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {session.testsPassed}/{session.testsTotal} passed
      </Badge>
    );
  }

  if (session.testVerdict === "failed") {
    return (
      <Badge variant="danger">
        <XCircle className="h-3.5 w-3.5" />
        {session.testsPassed ?? 0}/{session.testsTotal ?? 0} passed
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <CircleDashed className="h-3.5 w-3.5" />
      Not run
    </Badge>
  );
}

export default function CodingPage() {
  const router = useRouter();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [language, setLanguage] = useState("javascript");
  const [role, setRole] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await getCodingHistory());
    } catch (error) {
      console.error("Could not load coding history:", error);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Advance the status text on a timer; the request gives us no progress of
  // its own, and a 40-second silent spinner reads as a hang.
  useEffect(() => {
    if (!generating) return undefined;
    setStep(0);
    const timer = setInterval(
      () => setStep((current) => Math.min(current + 1, GENERATION_STEPS.length - 1)),
      7000
    );
    return () => clearInterval(timer);
  }, [generating]);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);

    try {
      const result = await generateCodingProblem({ topic, difficulty, language, role });

      if (!result?.success) {
        toast.error(result?.error || "Could not generate a problem. Please try again.");
        return;
      }

      toast.success("Problem ready. Good luck.");
      router.push(`/dashboard/coding/${result.problemId}`);
    } catch (error) {
      console.error("Problem generation failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setGenerating(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteCodingSession(pendingDelete.problemId);
    toast.success("Problem deleted.");
    setPendingDelete(null);
    loadHistory();
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-primary">Practice</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Terminal className="h-7 w-7 text-primary" />
          Coding round
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Get an original problem, solve it in the editor, run it against real test cases, then
          have a senior engineer review your approach and complexity.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">New problem</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Select id="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
              {TOPICS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              id="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">Language</Label>
            <Select
              id="language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.runs ? " - runs your tests" : " - AI review only"}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="role">Target role (optional)</Label>
            <Input
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Ex. Backend Engineer"
              maxLength={200}
            />
          </div>
        </div>

        {language !== "javascript" ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            Heads up: only JavaScript executes. It runs in a sandbox inside your own browser -{" "}
            {LANGUAGES.find((item) => item.id === language)?.label} would need a server-side
            runner, which this app doesn&apos;t have. You still get the problem, the editor and a
            full AI review of your solution; the test cases just won&apos;t run.
          </p>
        ) : null}

        <Button className="mt-5 min-w-[260px]" size="lg" onClick={generate} disabled={generating}>
          {generating ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> {GENERATION_STEPS[step]}
            </>
          ) : (
            <>
              <Code2 className="mr-2 h-4 w-4" /> Generate problem
            </>
          )}
        </Button>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Your problems</h2>

        {history === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No problems yet. Generate one above - every attempt is saved with its test results and
            review.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((session) => (
              <li
                key={session.problemId}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{session.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{session.difficulty}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {session.language}
                    </span>
                    <VerdictBadge session={session} />
                    {session.reviewScore ? (
                      <Badge variant={Number(session.reviewScore) >= 7 ? "success" : "warning"}>
                        Review {session.reviewScore}/10
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/coding/${session.problemId}`)}
                >
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${session.title}`}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setPendingDelete(session)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        destructive
        title="Delete this problem?"
        description={`"${pendingDelete?.title}", your solution and its review will be removed permanently.`}
        confirmLabel="Delete problem"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
