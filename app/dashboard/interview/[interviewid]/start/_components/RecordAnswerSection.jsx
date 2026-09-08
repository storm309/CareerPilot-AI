"use client";

import { CheckCircle2, LoaderCircle, Mic, Send, StopCircle, VideoOff } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";
import { toast } from "sonner";

import { submitAnswer } from "@/actions/aiActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// react-webcam touches `navigator` at import time, so it must stay client-only.
const Webcam = dynamic(() => import("react-webcam"), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full animate-pulse bg-muted" />,
});

const MIN_ANSWER_LENGTH = 10;

function RecordAnswerSection({
  questions,
  activeIndex,
  mockid,
  attempt,
  onAnswerSaved,
}) {
  // Drafts are keyed by question, so moving between questions no longer carries
  // the previous answer over into the next one.
  const [drafts, setDrafts] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [webcamError, setWebcamError] = useState(false);
  const baseTextRef = useRef("");

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
    (value) => {
      setDrafts((current) => ({ ...current, [activeIndex]: value }));
    },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  useEffect(() => {
    if (speechError) {
      toast.error("Voice input is not available in this browser. You can type your answer instead.");
    }
  }, [speechError]);

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeechToText();
      return;
    }

    baseTextRef.current = answer;
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

  return (
    <div className="flex flex-col gap-6">
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-slate-950">
        {webcamError ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-slate-300">
            <VideoOff className="h-10 w-10 opacity-60" />
            <p className="text-sm">
              Camera unavailable. Check your browser permissions - you can still answer by
              typing or by voice.
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
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            REC
          </span>
        ) : null}
      </div>

      <div>
        <div className="mb-1.5 flex items-end justify-between gap-2">
          <label htmlFor="answer" className="text-sm font-semibold">
            Your answer
          </label>
          <span
            className={`text-xs tabular-nums ${tooShort ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {answer.trim().length} characters
          </span>
        </div>
        <Textarea
          id="answer"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          readOnly={isRecording}
          className="min-h-[160px] rounded-xl p-4 text-base"
          placeholder="Record your answer, or type it here. You can edit the transcript before submitting."
        />
        {isRecording && interimResult ? (
          <p className="mt-2 text-sm italic text-muted-foreground">{interimResult}</p>
        ) : null}
      </div>

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
        <div className="animate-slide-up rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <div className="flex flex-wrap items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">Answer graded</span>
            <Badge variant={Number(result.score) >= 7 ? "success" : "warning"}>
              {result.score ?? "-"}/10
            </Badge>
            {result.confidenceLevel ? (
              <Badge variant="outline">Confidence: {result.confidenceLevel}</Badge>
            ) : null}
          </div>
          {result.feedback ? (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{result.feedback}</p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Full breakdown, including the ideal answer, is on the feedback page.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default RecordAnswerSection;
