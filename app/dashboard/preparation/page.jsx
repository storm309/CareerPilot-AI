"use client";

import {
  Check,
  CheckCircle,
  Copy,
  History,
  LoaderCircle,
  Mail,
  PenTool,
  Sparkles,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { improveText } from "@/actions/aiActions";
import { getPrepHistory } from "@/actions/dbActions";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 6000;
const MIN_LENGTH = 10;

const MODES = {
  grammar: {
    label: "Grammar checker",
    icon: PenTool,
    inputLabel: "Enter your text to check",
    placeholder: "I has been working here for 3 year and have did many projects...",
  },
  email: {
    label: "Email writer",
    icon: Mail,
    inputLabel: "Paste your email draft",
    placeholder: "Hi Sir, I want a job in ur company, pls reply fast...",
  },
};

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Your browser blocked clipboard access.");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 px-2 text-xs">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function Preparation() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("grammar");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await getPrepHistory());
    } catch (error) {
      console.error("Could not load prep history:", error);
      setHistory({ grammar: [], emails: [] });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleAnalyze = async () => {
    if (loading) return;

    if (text.trim().length < MIN_LENGTH) {
      toast.error(`Please enter at least ${MIN_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Runs as a server action, so the Gemini key is never shipped to the page.
      const response = await improveText({ text, mode });

      if (!response?.success) {
        toast.error(response?.error || "Analysis failed. Please try again.");
        return;
      }

      setResult(response);
      toast.success("Done - saved to your history.");
      loadHistory();
    } catch (error) {
      console.error("Prep tool failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const activeMode = MODES[mode];
  const historyItems =
    mode === "grammar"
      ? (history?.grammar ?? []).map((item) => ({
          id: item.id,
          original: item.originalText,
          output: item.correctedText,
        }))
      : (history?.emails ?? []).map((item) => ({
          id: item.id,
          original: item.originalText,
          output: item.generatedEmail,
        }));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-blue-400 dark:to-indigo-300">
          <Sparkles className="text-blue-700 dark:text-blue-400" /> AI prep tools
        </h1>
        <p className="mt-1 font-medium text-muted-foreground">
          Sharpen the writing you send before the interview even starts.
        </p>
      </header>

      <div role="tablist" aria-label="Prep tool" className="flex flex-wrap gap-3">
        {Object.entries(MODES).map(([key, { label, icon: Icon }]) => (
          <Button
            key={key}
            role="tab"
            aria-selected={mode === key}
            variant={mode === key ? "default" : "outline"}
            onClick={() => {
              setMode(key);
              setResult(null);
            }}
          >
            <Icon className="mr-2 h-4 w-4" /> {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label htmlFor="prep-input" className="font-semibold">
            {activeMode.inputLabel}
          </label>
          <Textarea
            id="prep-input"
            className="min-h-[300px] rounded-xl p-4 text-base"
            placeholder={activeMode.placeholder}
            maxLength={MAX_LENGTH}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Minimum {MIN_LENGTH} characters</span>
            <span className="tabular-nums">
              {text.length}/{MAX_LENGTH}
            </span>
          </div>
          <Button
            size="lg"
            className="rounded-xl py-6 text-base"
            onClick={handleAnalyze}
            disabled={loading || text.trim().length < MIN_LENGTH}
          >
            {loading ? (
              <>
                <LoaderCircle className="mr-2 animate-spin" /> Analyzing...
              </>
            ) : (
              `Analyze ${mode === "grammar" ? "text" : "email"}`
            )}
          </Button>
        </div>

        <div
          className={cn(
            "min-h-[300px] rounded-2xl border border-border bg-muted/30 p-6",
            !result && "flex items-center justify-center"
          )}
        >
          {loading ? (
            <div className="w-full space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : result ? (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="h-5 w-5" /> Polished version
                  </h2>
                  <CopyButton value={result.correctedText} />
                </div>
                <div className="whitespace-pre-wrap rounded-xl border border-emerald-200 bg-card p-4 text-sm leading-relaxed shadow-sm dark:border-emerald-900">
                  {result.correctedText}
                </div>
              </div>
              <div>
                <h2 className="mb-2 flex items-center gap-2 font-bold text-primary">
                  <Sparkles className="h-5 w-5" /> What changed
                </h2>
                <div className="whitespace-pre-wrap rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground">
                  {result.feedback}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <activeMode.icon className="h-14 w-14 opacity-20" />
              <p className="text-sm">Your polished version will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <History className="h-5 w-5 text-muted-foreground" />
          Recent {mode === "grammar" ? "grammar checks" : "emails"}
        </h2>

        {historyLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : historyItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Anything you analyze is saved so you can come back to it.
          </p>
        ) : (
          <div className="space-y-2">
            {historyItems.map((item) => (
              <Collapsible
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <CollapsibleTrigger className="w-full truncate p-3 text-left text-sm transition-colors hover:bg-accent">
                  {item.original?.slice(0, 120) || "(no original text)"}
                </CollapsibleTrigger>
                <CollapsibleContent className="border-t border-border bg-muted/30 p-3">
                  <div className="mb-2 flex justify-end">
                    <CopyButton value={item.output} />
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.output}</p>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Preparation;
