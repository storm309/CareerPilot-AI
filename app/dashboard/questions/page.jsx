"use client";

import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import React from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const FAQS = [
  {
    q: "How does CareerPilot AI build my questions?",
    a: "Your job title, job description, years of experience, chosen interview type and difficulty are all sent to Google's Gemini model, which writes questions specific to that role. Upload a resume and it will also ask about the projects and skills listed on it.",
  },
  {
    q: "How is my answer scored?",
    a: "Each answer is graded on its own against the bar for your stated experience level. You get a score out of 10 plus strengths, weaknesses, concrete improvements, a confidence read and the answer a strong candidate would have given.",
  },
  {
    q: "What is proctoring, and can I skip it?",
    a: "A proctored run asks to share your screen and puts the page in fullscreen. Switching tabs, losing window focus, leaving fullscreen or stopping the share each count as a warning, and three warnings end the interview. If you would rather just rehearse, choose 'Practice without proctoring' - your answers are still graded and saved.",
  },
  {
    q: "Can I retake an interview?",
    a: "Yes, as many times as you like. Each full run is saved as a separate attempt, so you can compare a later attempt against an earlier one from the attempt picker on the feedback page.",
  },
  {
    q: "Do I have to speak my answers?",
    a: "No. Voice recording transcribes into the answer box, but you can type or edit freely before submitting. If your browser does not support speech recognition, typing works exactly the same.",
  },
  {
    q: "Is my data private?",
    a: "Your interviews, answers and feedback are tied to your signed-in account and only ever returned to you - the server checks ownership on every request. Answers are sent to Google's Gemini API for grading; do not paste anything confidential.",
  },
  {
    q: "Why did my resume upload fail?",
    a: "Only PDFs up to 5MB are supported, and the text has to be selectable. Scanned or photographed resumes are images with no text layer, so nothing can be read from them. Export a fresh PDF from your editor instead.",
  },
  {
    q: "Does this work on a phone?",
    a: "The dashboard and prep tools work on any device. For a proctored interview use a desktop browser such as Chrome or Edge - mobile browsers cannot share a screen.",
  },
];

export default function Questions() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="space-y-3 text-center">
        <MessageCircleQuestion className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Frequently asked questions</h1>
        <p className="mx-auto max-w-lg text-muted-foreground">
          Everything about how the interviews, scoring and proctoring work.
        </p>
      </header>

      <div className="mt-10 space-y-3">
        {FAQS.map((item) => (
          <Collapsible
            key={item.q}
            className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 p-5 text-left font-semibold transition-colors hover:bg-accent">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border bg-muted/30 p-5 text-sm leading-relaxed text-muted-foreground">
              {item.a}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Still stuck?{" "}
        <a
          href="https://wa.me/918252980774"
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Message us on WhatsApp
        </a>
        .
      </p>
    </div>
  );
}
