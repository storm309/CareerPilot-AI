"use client";

import {
  Check,
  CheckCircle,
  Copy,
  FileSignature,
  History,
  Linkedin,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 6000;

const MODES = {
  grammar: {
    label: "Grammar",
    icon: PenTool,
    blurb: "Fix grammar, punctuation and style without changing your meaning.",
    inputLabel: "Text to check",
    placeholder: "I has been working here for 3 year and have did many projects...",
    minLength: 10,
    action: "Fix my grammar",
    outputLabel: "Corrected text",
    needsContext: false,
    storedAs: "grammar",
  },
  email: {
    label: "Email",
    icon: Mail,
    blurb: "Rewrite a recruiter or follow-up email so it reads professionally.",
    inputLabel: "Your email draft",
    placeholder: "Hi Sir, I want a job in ur company, pls reply fast...",
    minLength: 10,
    action: "Rewrite my email",
    outputLabel: "Polished email",
    needsContext: false,
    storedAs: "Draft Review",
  },
  "cover-letter": {
    label: "Cover letter",
    icon: FileSignature,
    blurb: "Turn your background into a cover letter for one specific role.",
    inputLabel: "Your background, resume text or rough notes",
    placeholder:
      "3 years as a backend dev at Zeta. Built the payments retry system, cut failed charges 40%. Node, Postgres, Redis. Want to move into a platform role...",
    minLength: 60,
    action: "Write my cover letter",
    outputLabel: "Your cover letter",
    needsContext: true,
    storedAs: "Cover Letter",
  },
  linkedin: {
    label: "LinkedIn bio",
    icon: Linkedin,
    blurb: "Rewrite your LinkedIn About section so it actually says something.",
    inputLabel: "Your background, resume text or rough notes",
    placeholder:
      "Frontend dev, 2 years. React and TypeScript. Rebuilt our design system, dropped bundle size by half. Looking for senior frontend roles...",
    minLength: 60,
    action: "Write my LinkedIn bio",
    outputLabel: "Your About section",
    needsContext: true,
    storedAs: "LinkedIn Summary",
  },
};

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Your browser blocked clipboard access.");
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

export default function Preparation() {
  const [mode, setMode] = useState("grammar");
  const [text, setText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(null);

  const activeMode = MODES[mode];

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await getPrepHistory());
    } catch (error) {
      console.error("Could not load writing history:", error);
      setHistory({ grammar: [], emails: [] });
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    if (loading) return;

    if (text.trim().length < activeMode.minLength) {
      toast.error(`Please enter at least ${activeMode.minLength} characters.`);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Runs as a server action, so the Gemini key never reaches the page.
      const response = await improveText({ text, mode, jobTitle, company });

      if (!response?.success) {
        toast.error(response?.error || "That didn't work. Please try again.");
        return;
      }

      setResult(response);
      toast.success("Done - saved to your history.");
      loadHistory();
    } catch (error) {
      console.error("Writing tool failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // History is stored in two tables; emailHistory holds three of the four modes,
  // separated by emailType.
  const historyItems =
    mode === "grammar"
      ? (history?.grammar ?? []).map((item) => ({
          id: item.id,
          original: item.originalText,
          output: item.correctedText,
        }))
      : (history?.emails ?? [])
          .filter((item) => item.emailType === activeMode.storedAs)
          .map((item) => ({
            id: item.id,
            original: item.originalText,
            output: item.generatedEmail,
          }));

  const tooShort = text.trim().length < activeMode.minLength;

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-primary">Toolkit</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Sparkles className="h-7 w-7 text-primary" />
          Writing tools
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Everything you have to write before anyone even sees your face.
        </p>
      </header>

      <div role="tablist" aria-label="Writing tool" className="flex flex-wrap gap-2">
        {Object.entries(MODES).map(([key, { label, icon: Icon }]) => (
          <Button
            key={key}
            role="tab"
            aria-selected={mode === key}
            variant={mode === key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setMode(key);
              setResult(null);
            }}
          >
            <Icon className="mr-2 h-4 w-4" /> {label}
          </Button>
        ))}
      </div>

      <p className="-mt-4 text-sm text-muted-foreground">{activeMode.blurb}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {activeMode.needsContext ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="job-title">Target role</Label>
                <Input
                  id="job-title"
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder="Ex. Platform Engineer"
                  maxLength={200}
                />
              </div>
              {mode === "cover-letter" ? (
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="Ex. Razorpay"
                    maxLength={200}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <Label htmlFor="prep-input">{activeMode.inputLabel}</Label>
            <Textarea
              id="prep-input"
              className="min-h-[280px] rounded-xl p-4 text-base"
              placeholder={activeMode.placeholder}
              maxLength={MAX_LENGTH}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Minimum {activeMode.minLength} characters</span>
              <span className="tabular-nums">
                {text.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          {activeMode.needsContext ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Only facts you write above are used. Nothing is invented - if a metric isn&apos;t in
              your notes, it won&apos;t be in the output.
            </p>
          ) : null}

          <Button size="lg" className="w-full" onClick={handleSubmit} disabled={loading || tooShort}>
            {loading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Writing...
              </>
            ) : (
              activeMode.action
            )}
          </Button>
        </div>

        <div
          className={cn(
            "min-h-[300px] rounded-2xl border border-border bg-card p-5",
            !result && !loading && "flex items-center justify-center"
          )}
        >
          {loading ? (
            <div className="w-full space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : result ? (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-semibold text-emerald-500">
                    <CheckCircle className="h-5 w-5" /> {activeMode.outputLabel}
                  </h2>
                  <CopyButton value={result.correctedText} />
                </div>
                <div className="whitespace-pre-wrap rounded-xl border border-emerald-500/30 bg-background p-4 text-sm leading-relaxed">
                  {result.correctedText}
                </div>
              </div>
              <div>
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-primary">
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
              <p className="text-sm">Your {activeMode.label.toLowerCase()} will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-muted-foreground" />
          Saved {activeMode.label.toLowerCase()} drafts
        </h2>

        {history === null ? (
          <div className="space-y-2">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : historyItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing saved here yet. Everything you generate is kept so you can come back to it.
          </p>
        ) : (
          <ul className="space-y-2">
            {historyItems.map((item) => (
              <Collapsible
                key={item.id}
                asChild
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <li>
                  <CollapsibleTrigger className="w-full truncate p-3 text-left text-sm transition-colors hover:bg-accent">
                    {item.original?.slice(0, 120) || "(no original text)"}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-t border-border bg-muted/30 p-3">
                    <div className="mb-2 flex justify-end">
                      <CopyButton value={item.output} />
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.output}</p>
                  </CollapsibleContent>
                </li>
              </Collapsible>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
