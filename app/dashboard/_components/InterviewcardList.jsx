"use client";

import { CalendarDays, LoaderCircle, MessageSquareText, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

import { deleteInterview } from "@/actions/dbActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function InterviewcardList({ interview, onDelete }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInterview(interview.mockid);
      toast.success("Interview deleted.");
      onDelete?.();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Could not delete that interview. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-primary" title={interview?.jobposition}>
            {interview?.jobposition}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {interview?.jobexp} {Number(interview?.jobexp) === 1 ? "year" : "years"} of experience
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${interview?.jobposition} interview`}
          className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {interview?.interviewType ? (
          <Badge variant="secondary">{interview.interviewType}</Badge>
        ) : null}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(interview?.createdat)}
        </span>
      </div>

      <div className="mt-5 flex gap-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={() => router.push(`/dashboard/interview/${interview?.mockid}/feedback`)}
        >
          <MessageSquareText className="mr-1.5 h-4 w-4" />
          Feedback
        </Button>
        <Button
          size="sm"
          className="w-full"
          onClick={() => router.push(`/dashboard/interview/${interview?.mockid}`)}
        >
          <Play className="mr-1.5 h-4 w-4" />
          Start
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title="Delete this interview?"
        description={`"${interview?.jobposition}" and all of its recorded answers and feedback will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete interview"
        onConfirm={handleDelete}
      />
    </article>
  );
}

export default InterviewcardList;
