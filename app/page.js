import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Braces,
  FileSearch,
  Gauge,
  MessageSquareText,
  PenTool,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import LandingHeader from "./_components/LandingHeader";

const STEPS = [
  {
    n: "01",
    title: "Describe the role",
    body: "Paste the job description, set your experience, difficulty and question count. Add a resume and the questions reference your actual projects.",
  },
  {
    n: "02",
    title: "Answer out loud",
    body: "Camera on, microphone live. Speech-to-text transcribes as you talk and you edit before submitting - or skip the mic and type.",
  },
  {
    n: "03",
    title: "Get graded on both",
    body: "A score for what you said, and a separate one for how you said it: pace, filler words, STAR structure.",
  },
];

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Role-specific interviews",
    body: "Technical, HR, mixed or system design - questions written for the job description you paste in, not a generic question bank.",
  },
  {
    icon: Gauge,
    title: "Delivery coaching",
    body: "Words per minute, filler-word density and STAR coverage measured on every answer. Content scores hide a rambling delivery; this doesn't.",
  },
  {
    icon: Braces,
    title: "Coding rounds that run",
    body: "Original problems with real test cases, executed in a sandboxed worker in your browser, then reviewed for complexity and edge cases.",
  },
  {
    icon: FileSearch,
    title: "Resume ATS scoring",
    body: "Score your resume against one job description. Missing keywords ranked by impact, plus rewritten bullet points you can paste straight in.",
  },
  {
    icon: PenTool,
    title: "Everything you have to write",
    body: "Cover letters, recruiter emails and your LinkedIn About section - generated only from facts you provide, never invented.",
  },
  {
    icon: ShieldCheck,
    title: "Optional proctoring",
    body: "Screen sharing, fullscreen and tab-switch detection when you want real pressure. Practice mode when you just want to rehearse.",
  },
];

export default function Home() {
  const { userId } = auth();

  if (userId) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Blueprint grid, faded toward the edges so it never fights the text. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[800px]">
        <div className="grid-bg grid-fade h-full w-full" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />

      <LandingHeader />

      <main>
        {/* ---------------- Hero ---------------- */}
        <section className="mx-auto max-w-screen-xl px-4 pb-20 pt-20 text-center lg:px-8 lg:pt-28">
          <p className="mono-label inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            AI interviewer &middot; scored in seconds
          </p>

          <h1 className="mx-auto mt-7 max-w-4xl text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Practice the interview
            <br />
            <span className="text-primary">before it happens</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Questions written for the exact role you&apos;re applying to. A score and specific
            feedback on every answer, including how you delivered it.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard">
              <Button size="lg" className="w-full gap-2 px-7 text-base sm:w-auto">
                Start practicing free
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="w-full px-7 text-base sm:w-auto">
                See how it works
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No card required &middot; your first interview takes about a minute to set up
          </p>

          {/* A terminal-styled preview of what the product actually returns. */}
          <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-xl border border-border bg-card text-left shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                feedback &mdash; senior backend engineer
              </span>
            </div>
            <div className="space-y-3 p-5 font-mono text-xs leading-relaxed sm:text-sm">
              <p className="text-muted-foreground">
                <span className="text-primary">Q3</span> &nbsp;How would you make the payment
                retry path idempotent?
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-500">
                  content 8/10
                </span>
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-500">
                  delivery 6/10
                </span>
                <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                  142 wpm
                </span>
                <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                  9 fillers
                </span>
                <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
                  STAR 3/4
                </span>
              </div>
              <p className="text-muted-foreground">
                <span className="text-foreground">&gt;</span> Solid on idempotency keys. You never
                said what happens when the key collides mid-flight, and &ldquo;basically&rdquo;
                appeared six times. Name the failure case first, then the fix.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how-it-works" className="mx-auto max-w-screen-xl px-4 py-20 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mono-label text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Three steps, about a minute
            </h2>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-card p-8">
                <span className="font-mono text-sm font-semibold text-primary">{step.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section id="features" className="mx-auto max-w-screen-xl px-4 py-20 lg:px-8">
          <div className="mb-12 text-center">
            <p className="mono-label text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Six things, all measured
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Not a chatbot with a job-interview prompt. Every number here comes from something the
              app actually computes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="mx-auto max-w-screen-xl px-4 pb-24 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 text-center md:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-40 grid-bg"
            />
            <TrendingUp className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <h2 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
              Your next interview is the practice run
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Unless you make this one the practice run instead.
            </p>
            <Link href="/dashboard" className="mt-8 inline-block">
              <Button size="lg" className="gap-2 px-7 text-base">
                Start practicing free
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted-foreground lg:px-8">
          <p>&copy; {new Date().getFullYear()} CareerPilot AI</p>
          <p className="font-mono text-xs">Built to help you ace your next interview.</p>
        </div>
      </footer>
    </div>
  );
}
