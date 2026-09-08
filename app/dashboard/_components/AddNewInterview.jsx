"use client";

import { FileText, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useRef, useState } from "react";
import { toast } from "sonner";

import { createMockInterview } from "@/actions/aiActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const EMPTY_FORM = {
  jobPosition: "",
  jobDescription: "",
  experience: "",
  interviewType: "Technical",
  difficulty: "Medium",
  questionCount: 5,
};

function AddNewInterview({ onCreated }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resumeFile, setResumeFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | parsing | generating
  const fileInputRef = useRef(null);
  const router = useRouter();

  const loading = status !== "idle";

  const setField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_RESUME_BYTES) {
      toast.error("That resume is over 5MB. Please upload a smaller PDF.");
      event.target.value = "";
      setResumeFile(null);
      return;
    }

    setResumeFile(file);
  };

  const clearResume = () => {
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseResume = async () => {
    if (!resumeFile) return "";

    setStatus("parsing");
    const body = new FormData();
    body.append("file", resumeFile);

    try {
      const response = await fetch("/api/parse-pdf", { method: "POST", body });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // A bad resume should not sink the whole interview - warn and carry on.
        toast.warning(data.error || "Could not read that resume. Continuing without it.");
        return "";
      }

      return data.text || "";
    } catch (error) {
      console.error("Resume parsing failed:", error);
      toast.warning("Could not read that resume. Continuing without it.");
      return "";
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const resumeText = await parseResume();

    setStatus("generating");

    try {
      const result = await createMockInterview({ ...form, resumeText });

      if (!result?.success) {
        toast.error(result?.error || "Something went wrong. Please try again.");
        return;
      }

      toast.success(`${result.questionCount} questions ready. Good luck!`);
      setOpenDialog(false);
      resetForm();
      onCreated?.();
      router.push(`/dashboard/interview/${result.mockid}`);
    } catch (error) {
      console.error("Interview creation failed:", error);
      toast.error("Could not reach the server. Please check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenDialog(true)}
        className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/10 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span className="rounded-full bg-primary/10 p-2 transition-colors duration-300 group-hover:bg-primary">
          <Plus className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
        </span>
        <span className="text-lg font-semibold text-primary">Start a new interview</span>
      </button>

      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          if (loading) return; // don't drop an in-flight generation
          setOpenDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="text-primary" />
              Tell us about the role
            </DialogTitle>
            <DialogDescription>
              The more detail you give, the sharper the questions. Adding a resume lets the
              AI ask about your actual projects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="jobPosition">Job role / position</Label>
                <Input
                  id="jobPosition"
                  placeholder="Ex. Full Stack Developer"
                  required
                  maxLength={200}
                  value={form.jobPosition}
                  onChange={setField("jobPosition")}
                />
              </div>
              <div>
                <Label htmlFor="interviewType">Interview type</Label>
                <Select
                  id="interviewType"
                  value={form.interviewType}
                  onChange={setField("interviewType")}
                >
                  <option value="Technical">Technical</option>
                  <option value="HR">HR / Behavioral</option>
                  <option value="Mixed">Mixed (Tech + HR)</option>
                  <option value="System Design">System Design</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="jobDescription">Job description / tech stack</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the job description, or list the stack: React, Node.js, PostgreSQL, REST APIs..."
                required
                minLength={10}
                maxLength={5000}
                value={form.jobDescription}
                onChange={setField("jobDescription")}
                className="min-h-[110px]"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {form.jobDescription.length}/5000
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="experience">Years of experience</Label>
                <Input
                  id="experience"
                  placeholder="Ex. 3"
                  min="0"
                  max="50"
                  type="number"
                  required
                  value={form.experience}
                  onChange={setField("experience")}
                />
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select id="difficulty" value={form.difficulty} onChange={setField("difficulty")}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="questionCount">Questions</Label>
                <Select
                  id="questionCount"
                  value={form.questionCount}
                  onChange={setField("questionCount")}
                >
                  <option value={3}>3 questions</option>
                  <option value={5}>5 questions</option>
                  <option value={8}>8 questions</option>
                  <option value={10}>10 questions</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="resume">Resume (optional PDF, max 5MB)</Label>
              {resumeFile ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{resumeFile.name}</span>
                  </span>
                  <Button
                    type="button"
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
                <Input
                  id="resume"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeChange}
                  className="file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:font-semibold file:text-primary"
                />
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => setOpenDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[200px]">
                {loading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {status === "parsing" ? "Reading resume..." : "Generating questions..."}
                  </>
                ) : (
                  "Start interview"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddNewInterview;
