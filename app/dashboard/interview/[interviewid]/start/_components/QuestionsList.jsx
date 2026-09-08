"use client";

import { CheckCircle2, Lightbulb, Square, Volume2 } from "lucide-react";
import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function QuestionsList({
  questions = [],
  activeIndex = 0,
  answeredQuestions = [],
  onSelect,
}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  // Speech kept playing after navigating away or switching questions.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    return () => window.speechSynthesis.cancel();
  }, [activeIndex]);

  const current = questions[activeIndex];

  const toggleSpeech = () => {
    if (!supported || !current?.question) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(current.question);

    // getVoices() is empty until the voice list loads, and the old code also
    // read a non-existent `voice.gender` field, so no voice was ever selected.
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((voice) => /female|samantha|zira|aria/i.test(voice.name) && voice.lang.startsWith("en")) ??
      voices.find((voice) => voice.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  if (questions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <nav aria-label="Questions">
        <ol className="flex flex-wrap gap-2">
          {questions.map((question, index) => {
            const isAnswered = answeredQuestions.includes(question.question);
            const isActive = activeIndex === index;

            return (
              <li key={`${index}-${question.question.slice(0, 24)}`}>
                <button
                  type="button"
                  onClick={() => onSelect?.(index)}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isAnswered
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                  )}
                >
                  {isAnswered && !isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  Q{index + 1}
                  <span className="sr-only">
                    {isAnswered ? " (answered)" : " (not answered)"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <h2 className="my-6 text-lg leading-relaxed md:text-xl">{current?.question}</h2>

      {supported ? (
        <Button variant="outline" size="sm" onClick={toggleSpeech} className="gap-2">
          {speaking ? (
            <>
              <Square className="h-4 w-4" /> Stop reading
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" /> Read question aloud
            </>
          )}
        </Button>
      ) : null}

      <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-primary">
          <Lightbulb className="h-5 w-5" />
          Tip
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Record or type your answer, edit it until it reads the way you would say it, then
          submit. You will get a score and detailed feedback the moment you do, and you can
          revisit any question before you finish.
        </p>
      </div>
    </div>
  );
}

export default QuestionsList;
