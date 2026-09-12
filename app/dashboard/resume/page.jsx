"use client";

import {
  ArrowRight,
  Check,
  Copy,
  FileSearch,
  FileText,
  History,
  LoaderCircle,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  analyzeResume,
  deleteResumeAnalysis,
  getResumeHistory,
} from "@/actions/resumeActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function scoreTone(score) {
  if (score >= 80) return { label: "Strong match", variant: "success", bar: "bg-emerald-500" };
  if (score >= 60) return { label: "Needs work", variant: "warning", bar: "bg-amber-500" };
  return { label: "Would be filtered", variant: "danger", bar: "bg-destructive" };
}

function CopyButton({ value, label = "Copy" }) {
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
      {copied ? "Copied" : label}
    </Button>
  );
}

export default function ResumePage() {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState("idle"); // idle | parsing | analyzing
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const fileInputRef = useRef(null);

  const busy = status !== "idle";

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await getResumeHistory());
    } catch (error) {
      console.error("Could not load resume history:", error);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFile = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF. Word files aren't supported yet.");
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      toast.error("That file is over 5MB. Please upload a smaller PDF.");
      return;
    }

    setStatus("parsing");
    const body = new FormData();
    body.append("file", file);

    try {
      const response = await fetch("/api/parse-pdf", { method: "POST", body });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Could not read that PDF.");
        return;
      }

      setResumeText(data.text || "");
      setFileName(file.name);
      toast.success(`Read ${data.pages || 1} page(s) from ${file.name}.`);
    } catch (error) {
      console.error("Resume parsing failed:", error);
      toast.error("Could not read that PDF. Please try another file.");
    } finally {
      setStatus("idle");
    }
  };

  const clearResume = () => {
    setResumeText("");
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runAnalysis = async () => {
    if (busy) return;

    if (resumeText.trim().length < 100) {
      toast.error("Upload a resume PDF, or paste at least 100 characters of resume text.");
      return;
    }

    if (jobDescription.trim().length < 50) {
      toast.error("Paste at least 50 characters of the job description to score against.");
      return;
    }

    setStatus("analyzing");
    setReport(null);

    try {
      const result = await analyzeResume({ resumeText, jobTitle, jobDescription });

      if (!result?.success) {
        toast.error(result?.error || "Analysis failed. Please try again.");
        return;
      }

      setReport(result);
      toast.success(`ATS score: ${result.atsScore}/100`);
      loadHistory();
    } catch (error) {
      console.error("Resume analysis failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setStatus("idle");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteResumeAnalysis(pendingDelete.id);
    toast.success("Report deleted.");
    setPendingDelete(null);
    loadHistory();
    setReport((current) => (current?.id === pendingDelete.id ? null : current));
  };

  const tone = report ? scoreTone(report.atsScore) : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="mono-label text-primary">Toolkit</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <FileSearch className="h-7 w-7 text-primary" />
          Resume ATS check
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Score your resume against one specific job description the way an applicant tracking
          system plus a human screener would, then rewrite the bullets that are letting you down.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* ---------------- Inputs ---------------- */}
        <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <Label htmlFor="resume-file">Your resume</Label>

            {fileName ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{fileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {resumeText.length.toLocaleString()} chars
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Remove resume"
                  onClick={clearResume}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="resume-file"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {status === "parsing" ? (
                  <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {status === "parsing" ? "Reading your PDF..." : "Drop a PDF, or click to browse"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Text-based PDF, max 5MB. Scanned resumes can&apos;t be read.
                </span>
              </label>
            )}

            <input
              ref={fileInputRef}
              id="resume-file"
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          {!fileName ? (
            <div>
              <Label htmlFor="resume-text">Or paste your resume text</Label>
              <Textarea
                id="resume-text"
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste the full text of your resume here..."
                className="min-h-[120px] font-mono text-xs"
              />
            </div>
          ) : null}

          <div>
            <Label htmlFor="job-title">Job title</Label>
            <Input
              id="job-title"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Ex. Senior Frontend Engineer"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="job-description">Job description</Label>
            <Textarea
              id="job-description"
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the full job posting - requirements, responsibilities, the lot. The more complete it is, the more accurate the keyword match."
              maxLength={5000}
              className="min-h-[180px]"
            />
            <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
              {jobDescription.length}/5000
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={runAnalysis} disabled={busy}>
            {status === "analyzing" ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Scoring your resume...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" /> Score my resume
              </>
            )}
          </Button>
        </section>

        {/* ---------------- Report ---------------- */}
        <section className="min-h-[400px] rounded-2xl border border-border bg-card p-5">
          {status === "analyzing" ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : report ? (
            <div className="animate-fade-in space-y-6">
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="mono-label text-muted-foreground">ATS match score</p>
                    <p className="mt-1 font-mono text-5xl font-bold tabular-nums">
                      {report.atsScore}
                      <span className="text-xl font-normal text-muted-foreground">/100</span>
                    </p>
                  </div>
                  <Badge variant={tone.variant}>{tone.label}</Badge>
                </div>
                <Progress
                  value={report.atsScore}
                  className="mt-4"
                  indicatorClassName={tone.bar}
                />
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {report.summary}
                </p>
              </div>

              {report.missingKeywords.length > 0 ? (
                <div>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <TriangleAlert className="h-4 w-4 text-amber-500" />
                    Missing keywords
                    <span className="font-normal text-muted-foreground">
                      ({report.missingKeywords.length})
                    </span>
                  </h2>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Highest impact first. Only add the ones you can genuinely back up.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {report.missingKeywords.map((keyword) => (
                      <Badge key={keyword} variant="danger">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {report.matchedKeywords.length > 0 ? (
                <div>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Already matched
                    <span className="font-normal text-muted-foreground">
                      ({report.matchedKeywords.length})
                    </span>
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {report.matchedKeywords.map((keyword) => (
                      <Badge key={keyword} variant="success">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {report.sectionScores.length > 0 ? (
                <div>
                  <h2 className="mb-3 text-sm font-semibold">Section breakdown</h2>
                  <ul className="space-y-3">
                    {report.sectionScores.map((section) => (
                      <li key={section.section}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-medium">{section.section}</span>
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {section.score}/10
                          </span>
                        </div>
                        <Progress
                          value={section.score * 10}
                          className="h-1.5"
                          indicatorClassName={
                            section.score >= 8
                              ? "bg-emerald-500"
                              : section.score >= 5
                                ? "bg-amber-500"
                                : "bg-destructive"
                          }
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{section.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.bulletRewrites.length > 0 ? (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Rewritten bullet points
                  </h2>
                  <ul className="space-y-3">
                    {report.bulletRewrites.map((rewrite, index) => (
                      <li
                        key={`${index}-${rewrite.before.slice(0, 20)}`}
                        className="rounded-xl border border-border bg-background p-3"
                      >
                        <p className="text-xs text-muted-foreground line-through">
                          {rewrite.before}
                        </p>
                        <div className="mt-2 flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <p className="flex-1 text-sm leading-relaxed">{rewrite.after}</p>
                          <CopyButton value={rewrite.after} label="" />
                        </div>
                        {rewrite.why ? (
                          <p className="mt-2 text-xs text-primary/80">{rewrite.why}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Target className="h-14 w-14 opacity-20" />
              <p className="max-w-xs text-sm">
                Upload your resume and paste a job description. Your score, missing keywords and
                rewritten bullets will appear here.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* ---------------- History ---------------- */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <History className="h-5 w-5 text-muted-foreground" />
          Past reports
        </h2>

        {history === null ? (
          <div className="space-y-2">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reports yet. Every resume you score is saved here so you can track the score going
            up.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => {
              const itemTone = scoreTone(item.atsScore ?? 0);

              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold tabular-nums",
                      item.atsScore >= 80
                        ? "bg-emerald-500/10 text-emerald-500"
                        : item.atsScore >= 60
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {item.atsScore ?? "--"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.jobTitle || "Untitled role"}</p>
                    <p className="text-xs text-muted-foreground">
                      {itemTone.label}
                      {item.missingKeywords.length
                        ? ` · ${item.missingKeywords.length} keywords missing`
                        : ""}
                    </p>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => setReport(item)}>
                    Open report
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete report for ${item.jobTitle || "untitled role"}`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setPendingDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        destructive
        title="Delete this report?"
        description={`The ATS report for "${pendingDelete?.jobTitle || "this role"}" will be removed permanently.`}
        confirmLabel="Delete report"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
