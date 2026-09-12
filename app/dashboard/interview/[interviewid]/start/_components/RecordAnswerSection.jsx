"use client";

import {
  CheckCircle2,
  Gauge,
  LoaderCircle,
  Mic,
  Send,
  StopCircle,
  VideoOff,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import { toast } from "sonner";

import { submitAnswer } from "@/actions/aiActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DELIVERY_TIPS, buildDeliveryMetrics, deliveryScore } from "@/utils/speechMetrics";

// react-webcam touches `navigator` at import time, so it must stay client-only.
const Webcam = dynamic(() => import("react-webcam"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

const MIN_ANSWER_LENGTH = 10;

function formatClock(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function DeliveryPanel({ metrics, compact }) {
  if (!metrics) return null;

  const score = metrics.score ?? deliveryScore(metrics);
  const starParts = Object.entries(metrics.star?.covered ?? {});

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Gauge className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Delivery</span>
        {score != null ? (
          <Badge variant={score >= 7 ? "success" : score >= 5 ? "warning" : "danger"}>
            {score}/10
          </Badge>
        ) : null}
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="mono-label text-muted-foreground">Words</dt>
          <dd className="font-mono text-lg font-semibold tabular-nums">{metrics.words}</dd>
        </div>
        <div>
          <dt className="mono-label text-muted-foreground">Pace</dt>
          <dd
            className={`font-mono text-lg font-semibold tabular-nums ${
              metrics.pace === "good"
                ? "text-emerald-500"
                : metrics.pace === "unknown"
                  ? "text-muted-foreground"
                  : "text-amber-500"
            }`}
          >
            {metrics.wordsPerMinute ?? "--"}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">wpm</span>
          </dd>
        </div>
        <div>
          <dt className="mono-label text-muted-foreground">Fillers</dt>
          <dd
            className={`font-mono text-lg font-semibold tabular-nums ${
              metrics.fillerRate > 5 ? "text-amber-500" : "text-emerald-500"
            }`}
          >
            {metrics.fillerCount}
          </dd>
        </div>
      </dl>

      {!compact ? (
        <>
          <div className="mt-3">
            <p className="mono-label mb-1.5 text-muted-foreground">STAR coverage</p>
            <div className="flex gap-1.5">
              {starParts.map(([part, present]) => (
                <span
                  key={part}
                  title={`${part}: ${present ? "covered" : "missing"}`}
                  className={`flex-1 rounded px-1 py-1 text-center text-[10px] font-semibold uppercase ${
                    present
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-muted text-muted-foreground/60"
                  }`}
                >
                  {part.slice(0, 3)}
                  <span className="sr-only">
                    {part}: {present ? "covered" : "missing"}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">{DELIVERY_TIPS[metrics.pace]}</p>

          {Object.keys(metrics.fillerBreakdown ?? {}).length > 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Most used:{" "}
              {Object.entries(metrics.fillerBreakdown)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([word, count]) => `"${word}" ${count}x`)
                .join(", ")}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function RecordAnswerSection({ questions, activeIndex, mockid, attempt, onAnswerSaved }) {
  // Drafts are keyed by question, so moving between questions no longer carries
  // the previous answer over into the next one.
  const [drafts, setDrafts] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [spokenSeconds, setSpokenSeconds] = useState({});

  const baseTextRef = useRef("");
  const startedAtRef = useRef(null);

  const answer = drafts[activeIndex] ?? "";
  const result = results[activeIndex] ?? null;

  const {
    error: speechError,
    interimResult,
    isRecording,
    results: speechResults,
    startSpeechToText,
    stopSpeechToText,
    setResults: setSpeechResults,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    interimResults: true,
  });

  const setAnswer = useCallback(
    (value) => setDrafts((current) => ({ ...current, [activeIndex]: value })),
    [activeIndex]
  );

  // Transcripts are appended to whatever is already in the box. The old effect
  // replaced the whole textarea, wiping out anything typed by hand.
  useEffect(() => {
    if (!speechResults?.length) return;

    const transcript = speechResults.map((entry) => entry.transcript).join(" ");
    const merged = `${baseTextRef.current} ${transcript}`.replace(/\s+/g, " ").trim();

    setDrafts((current) => ({ ...current, [activeIndex]: merged }));
  }, [speechResults, activeIndex]);

  // Recording must not bleed across questions.
  useEffect(() => {
    if (isRecording) stopSpeechToText();
    setSpeechResults([]);
    baseTextRef.current = "";
    startedAtRef.current = null;
    setElapsed(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Words-per-minute needs a duration, so the recording is clocked.
  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = setInterval(() => {
      setElapsed(Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (speechError) {
      toast.error(
        "Voice input isn't available in this browser. You can type your answer instead."
      );
    }
  }, [speechError]);

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeechToText();

      // Accumulate across takes: stopping and restarting on one question should
      // not reset the duration the pace is calculated from.
      const taken = Math.round((Date.now() - (startedAtRef.current ?? Date.now())) / 1000);
      setSpokenSeconds((current) => ({
        ...current,
        [activeIndex]: (current[activeIndex] ?? 0) + taken,
      }));
      startedAtRef.current = null;
      return;
    }

    baseTextRef.current = answer;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setSpeechResults([]);
    startSpeechToText();
    toast.info("Recording. Speak clearly, then stop when you're done.");
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (isRecording) stopSpeechToText();

    const trimmed = answer.trim();
    if (trimmed.length < MIN_ANSWER_LENGTH) {
      toast.error(`Your answer needs at least ${MIN_ANSWER_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    try {
      const response = await submitAnswer({
        mockid,
        questionIndex: activeIndex,
        userAnswer: trimmed,
        attempt,
        spokenSeconds: spokenSeconds[activeIndex] ?? null,
      });

      if (!response?.success) {
        toast.error(response?.error || "Could not save your answer. Please try again.");
        return;
      }

      setResults((current) => ({ ...current, [activeIndex]: response }));
      onAnswerSaved?.(questions[activeIndex]?.question, response);
      toast.success(`Answer saved. Score: ${response.score ?? "-"}/10`);
    } catch (error) {
      console.error("Answer submission failed:", error);
      toast.error("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const tooShort = answer.trim().length < MIN_ANSWER_LENGTH;

  // Live metrics while drafting; the server recomputes them on submit.
  const totalSeconds = (spokenSeconds[activeIndex] ?? 0) + (isRecording ? elapsed : 0);
  const liveMetrics = answer.trim().length >= MIN_ANSWER_LENGTH
    ? buildDeliveryMetrics(answer, totalSeconds || null)
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-black">
        {webcamError ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-slate-300">
            <VideoOff className="h-10 w-10 opacity-60" />
            <p className="text-sm">
              Camera unavailable. Check your browser permissions - you can still answer by typing
              or by voice.
            </p>
          </div>
        ) : (
          <Webcam
            mirrored
            audio={false}
            onUserMediaError={() => setWebcamError(true)}
            className="h-full w-full object-cover"
          />
        )}

        {isRecording ? (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-mono text-xs font-semibold tabular-nums text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {formatClock(elapsed)}
          </span>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <label htmlFor="answer" className="text-sm font-semibold">
            Your answer
          </label>
          <span
            className={`font-mono text-xs tabular-nums ${
              tooShort ? "text-muted-foreground" : "text-emerald-500"
            }`}
          >
            {answer.trim().length} chars
          </span>
        </div>
        <Textarea
          id="answer"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          readOnly={isRecording}
          className="min-h-[150px] rounded-xl p-4 text-base"
          placeholder="Record your answer, or type it here. You can edit the transcript before submitting."
        />
        {isRecording && interimResult ? (
          <p className="mt-2 text-sm italic text-muted-foreground">{interimResult}</p>
        ) : null}
      </div>

      {/* Live coaching while drafting; the graded version lands after submit. */}
      {liveMetrics && !result ? <DeliveryPanel metrics={liveMetrics} /> : null}

      <div className="flex flex-wrap gap-3">
        <Button
          variant={isRecording ? "destructive" : "outline"}
          className="gap-2"
          onClick={toggleRecording}
          disabled={loading || Boolean(speechError)}
        >
          {isRecording ? (
            <>
              <StopCircle className="h-5 w-5" /> Stop recording
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" /> Record answer
            </>
          )}
        </Button>

        <Button className="gap-2" onClick={handleSubmit} disabled={loading || tooShort}>
          {loading ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" /> Grading...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" /> {result ? "Resubmit answer" : "Submit answer"}
            </>
          )}
        </Button>
      </div>

      {result ? (
        <div className="animate-slide-up space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold">Answer graded</span>
            <Badge variant={Number(result.score) >= 7 ? "success" : "warning"}>
              Content {result.score ?? "-"}/10
            </Badge>
            {result.confidenceLevel ? (
              <Badge variant="outline">Confidence: {result.confidenceLevel}</Badge>
            ) : null}
          </div>

          {result.feedback ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{result.feedback}</p>
          ) : null}

          <DeliveryPanel metrics={result.delivery} />

          <p className="text-xs text-muted-foreground">
            Full breakdown, including the ideal answer, is on the feedback page.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default RecordAnswerSection;
