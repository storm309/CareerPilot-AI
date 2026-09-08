"use client";

import { AlertCircle, Inbox } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

import { getInterviewList } from "@/actions/dbActions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import InterviewcardList from "./InterviewcardList";

function InterviewList({ refreshKey = 0, onChanged }) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The email is no longer passed from the browser: the server action reads the
  // signed-in user from the Clerk session, so the list cannot be spoofed.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setInterviews(await getInterviewList());
    } catch (fetchError) {
      console.error("Could not load interviews:", fetchError);
      setError("We couldn't load your interviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleChanged = () => {
    load();
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[190px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="font-medium text-destructive">{error}</p>
        <Button variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-12 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/40" />
        <p className="font-semibold">No interviews yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create your first mock interview above and it will show up here with your scores.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {interviews.map((interview) => (
        <InterviewcardList
          key={interview.mockid}
          interview={interview}
          onDelete={handleChanged}
        />
      ))}
    </div>
  );
}

export default InterviewList;
