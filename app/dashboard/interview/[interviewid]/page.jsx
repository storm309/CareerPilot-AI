"use client";

import { Briefcase, Camera, Info, ListChecks, VideoOff } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

import { getInterviewDetails } from "@/actions/dbActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const Webcam = dynamic(() => import("react-webcam"), { ssr: false });

function Interview({ params }) {
  const { interviewid } = params;
  const router = useRouter();

  const [interview, setInterview] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [webcamOn, setWebcamOn] = useState(false);
  const [webcamError, setWebcamError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const details = await getInterviewDetails(interviewid);
        if (cancelled) return;
        setInterview(details);
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

  if (loadState === "loading") {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-[320px] rounded-2xl" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <h1 className="text-xl font-bold text-destructive">Interview not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This interview may have been deleted, or it belongs to a different account.
        </p>
        <Button className="mt-6" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Let&apos;s get started</h1>
        <p className="mt-1 text-muted-foreground">
          Check your setup, then begin whenever you are ready.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
            <h2 className="flex items-center gap-2 font-semibold">
              <Briefcase className="h-5 w-5 text-primary" />
              Role details
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Job position</dt>
                <dd className="text-muted-foreground">{interview.jobposition}</dd>
              </div>
              <div>
                <dt className="font-semibold">Job description / tech stack</dt>
                <dd className="whitespace-pre-wrap text-muted-foreground">
                  {interview.jobdescription}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Experience</dt>
                <dd className="text-muted-foreground">{interview.jobexp} years</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {interview.interviewType ? (
                <Badge variant="secondary">{interview.interviewType}</Badge>
              ) : null}
              <Badge variant="outline">
                <ListChecks className="h-3.5 w-3.5" />
                {interview.questions.length} questions
              </Badge>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
            <h2 className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
              <Info className="h-5 w-5" />
              Before you begin
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-amber-900 dark:text-amber-200">
              <li>Allow camera and microphone access so you can record answers by voice.</li>
              <li>
                A proctored run asks to share your screen and goes fullscreen. Switching tabs or
                leaving fullscreen counts as a warning, and three warnings end the interview.
              </li>
              <li>Prefer to rehearse first? You can start in practice mode instead.</li>
              <li>Every answer is scored and saved, so you can review the feedback afterwards.</li>
            </ul>
          </section>
        </div>

        <section className="flex flex-col items-center gap-4">
          <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary">
            {webcamError ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
                <VideoOff className="h-10 w-10 opacity-50" />
                <p className="text-sm">{webcamError}</p>
              </div>
            ) : webcamOn ? (
              <Webcam
                mirrored
                audio={false}
                className="h-full w-full object-cover"
                onUserMediaError={() =>
                  setWebcamError(
                    "Camera access was blocked. You can still take the interview by typing your answers."
                  )
                }
              />
            ) : (
              <Camera className="h-20 w-20 text-muted-foreground/40" />
            )}
          </div>

          {!webcamOn && !webcamError ? (
            <Button variant="outline" onClick={() => setWebcamOn(true)}>
              <Camera className="mr-2 h-4 w-4" /> Enable camera
            </Button>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push(`/dashboard/interview/${interviewid}/start`)}
          >
            Continue to interview
          </Button>
        </section>
      </div>
    </div>
  );
}

export default Interview;
