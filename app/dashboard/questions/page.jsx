"use client";

import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import React, { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const FAQ_GROUPS = [
  {
    group: "Interviews",
    items: [
      {
        q: "How does CareerPilot AI build my questions?",
        a: "Your job title, job description, years of experience, interview type and difficulty all go into the prompt, so the questions are about that specific role rather than a generic bank. Upload a resume and at least two questions will reference the projects and skills actually on it.",
      },
      {
        q: "How is my answer scored?",
        a: "Twice, separately. Content gets a 1-10 from an AI hiring manager, plus strengths, weaknesses, concrete improvements and the answer a strong candidate would have given. Delivery gets its own 1-10 measured from your transcript: speaking pace, filler-word density and STAR coverage.",
      },
      {
        q: "What counts as a filler word?",
        a: "The usual English ones - um, uh, like, basically, actually, honestly, you know, I mean - plus common Hinglish ones like matlab, yaar and toh. They're counted as whole words, so 'so' inside 'software' never counts, and the score uses fillers per 100 words so a long answer isn't punished for its length.",
      },
      {
        q: "What is proctoring, and can I skip it?",
        a: "A proctored run asks to share your screen and puts the page in fullscreen. Switching tabs, losing window focus, leaving fullscreen or stopping the share each count as a warning, and three warnings end the interview. Prefer to just rehearse? Choose 'Practice without proctoring' - your answers are still graded and saved identically.",
      },
      {
        q: "Can I retake an interview?",
        a: "As many times as you like. Each complete run is saved as its own attempt, so you can compare a retake against an earlier run from the attempt picker on the feedback page. Nothing is overwritten.",
      },
      {
        q: "Can I export my feedback?",
        a: "Yes. On any feedback page, 'Export as PDF' opens a flat, fully expanded version of the report - then choose 'Save as PDF' as the destination in your browser's print dialog.",
      },
    ],
  },
  {
    group: "Coding rounds",
    items: [
      {
        q: "Does my code actually run?",
        a: "In JavaScript, yes. Your solution executes against the generated test cases inside a sandboxed Web Worker in your own browser, so an infinite loop can't freeze the page and the code can't touch your session. You see which cases passed, what was expected and what you returned.",
      },
      {
        q: "Why can't I run Python or Java?",
        a: "Only JavaScript can execute in a browser sandbox without a backend runner. Pick another language and you still get the problem, the editor and a full AI code review of correctness, complexity and edge cases - the test cases just don't execute.",
      },
      {
        q: "Is my code saved if I refresh?",
        a: "Yes. The editor autosaves a few seconds after you stop typing, and again after every test run, so a refresh or a closed tab won't lose your work.",
      },
    ],
  },
  {
    group: "Resume & writing",
    items: [
      {
        q: "What does the ATS score mean?",
        a: "How likely your resume is to survive a screen for that one job description - not a universal rating. 80+ means it would almost certainly pass, below 50 means it would likely be filtered out. You also get the keywords you matched, the ones you're missing ranked by impact, a per-section breakdown, and rewritten versions of up to five of your real bullet points.",
      },
      {
        q: "Will the cover letter invent things about me?",
        a: "No. The cover letter and LinkedIn writers use only facts present in the notes you paste. If a metric isn't in your notes, it won't appear in the output - which is why the more detail you give, the better the result.",
      },
      {
        q: "Why did my resume upload fail?",
        a: "Only PDFs up to 5MB are supported, and the text has to be selectable. Scanned or photographed resumes are images with no text layer, so nothing can be read from them. Export a fresh PDF from Word, Google Docs or your resume builder instead.",
      },
    ],
  },
  {
    group: "Account & privacy",
    items: [
      {
        q: "Is my data private?",
        a: "Your interviews, answers, code, resumes and feedback are tied to your signed-in account, and the server checks ownership on every single request - another account can do nothing with your interview id. Your answers and resume text are sent to Google's Gemini API for grading, so don't paste anything confidential.",
      },
      {
        q: "How is my streak calculated?",
        a: "Any activity counts - an answer, a coding run, a resume check, a grammar fix. A streak only breaks once you've missed both today and yesterday, so opening the app in the morning never shows a zeroed streak.",
      },
      {
        q: "Does this work on a phone?",
        a: "The dashboard, resume check and writing tools work anywhere. For a proctored interview or a coding round, use a desktop browser like Chrome or Edge - mobile browsers can't share a screen, and the code editor needs a keyboard.",
      },
    ],
  },
];

export default function Questions() {
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const groups = FAQ_GROUPS.map((group) => ({
    ...group,
    items: normalized
      ? group.items.filter(
          (item) =>
            item.q.toLowerCase().includes(normalized) || item.a.toLowerCase().includes(normalized)
        )
      : group.items,
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <MessageCircleQuestion className="mx-auto h-9 w-9 text-primary" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Help</h1>
        <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
          How the interviews, scoring, coding rounds and resume checks actually work.
        </p>
      </header>

      <div className="mt-8">
        <label htmlFor="faq-search" className="sr-only">
          Search help
        </label>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search - try 'filler words' or 'ATS'"
          className="flex h-11 w-full rounded-lg border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing matches &ldquo;{query}&rdquo;. Try a different word, or message us below.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.group}>
              <h2 className="mono-label mb-3 text-primary">{group.group}</h2>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Collapsible
                    // The key changes when a search starts or clears, which
                    // remounts the item so `defaultOpen` is re-applied -
                    // otherwise search results stayed collapsed.
                    key={`${item.q}:${normalized ? "search" : "browse"}`}
                    defaultOpen={Boolean(normalized)}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 p-4 text-left font-medium transition-colors hover:bg-accent">
                      {item.q}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border bg-muted/30 p-4 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
        <p className="font-medium">Still stuck?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Message us on WhatsApp and we&apos;ll get back to you.
        </p>
        <a
          href="https://wa.me/918252980774"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-4 inline-block"
        >
          <Button variant="outline">Message us on WhatsApp</Button>
        </a>
      </div>
    </div>
  );
}
