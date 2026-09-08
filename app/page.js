import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  AtomIcon,
  Focus,
  PenTool,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import LandingHeader from "./_components/LandingHeader";

const STEPS = [
  {
    icon: ReceiptText,
    title: "Add the job details",
    body: "Paste the job title and description, set your experience, difficulty and how many questions you want. Add a resume and the questions will reference your actual projects.",
    accent: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950",
  },
  {
    icon: Focus,
    title: "Face the AI interviewer",
    body: "Answer out loud with your camera and microphone on, or type your answers. Edit the transcript until it reads the way you would actually say it.",
    accent: "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950",
  },
  {
    icon: AtomIcon,
    title: "Get graded instantly",
    body: "Every answer comes back with a score out of 10, your strengths and weaknesses, concrete improvements and the answer a strong candidate would have given.",
    accent: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950",
  },
];

const FEATURES = [
  {
    icon: Video,
    title: "Realistic simulation",
    body: "Webcam, microphone and voice-to-text put you under the same pressure as the real thing, so the practice actually transfers.",
    accent: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950",
  },
  {
    icon: ShieldCheck,
    title: "Optional proctoring",
    body: "Run it proctored - screen sharing, fullscreen and tab-switch detection - or in practice mode when you just want to rehearse.",
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950",
  },
  {
    icon: PenTool,
    title: "Prep tools and history",
    body: "Polish your grammar, rewrite an email to a recruiter, and track every attempt with its score in one place.",
    accent: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950",
  },
];

export default function Home() {
  const { userId } = auth();

  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-background to-cyan-50 dark:from-background dark:via-background dark:to-background">
      <LandingHeader />

      <main>
        <section className="relative z-10 mx-auto max-w-screen-xl px-4 pb-16 pt-20 text-center lg:px-12 lg:pt-28">
          <p className="mb-7 inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800 shadow-sm dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300">
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            <span className="tracking-wide">AI-powered interview preparation</span>
          </p>

          <h1 className="mb-6 text-balance text-5xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
            <span>Master your interviews with </span>
            <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              CareerPilot AI
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg font-medium text-muted-foreground lg:text-xl">
            Practice against questions written for the exact role you are applying to, then get a
            score and specific feedback on every single answer.
          </p>

          <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row lg:mb-16">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="w-full rounded-full px-8 py-6 text-lg shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/30 sm:w-auto"
              >
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full px-8 py-6 text-lg sm:w-auto"
              >
                See how it works
              </Button>
            </Link>
          </div>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="relative z-10 mx-auto max-w-screen-xl px-4 py-16 text-center lg:px-12 lg:py-24"
        >
          <div className="mb-12">
            <h2 id="how-it-works-heading" className="mb-4 text-3xl font-extrabold md:text-4xl">
              How it works
            </h2>
            <p className="mx-auto max-w-2xl text-lg font-medium text-muted-foreground">
              Three steps between you and a sharper interview.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body, accent }, index) => (
              <div
                key={title}
                className="group relative rounded-2xl border border-border bg-card/60 p-8 text-left shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${accent}`}
                >
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <h3 className="mb-3 text-xl font-bold">
                  {index + 1}. {title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-heading"
          className="relative z-10 mx-auto max-w-screen-xl px-4 py-16 text-center lg:px-12 lg:py-24"
        >
          <div className="mb-12">
            <h2 id="features-heading" className="mb-4 text-3xl font-extrabold md:text-4xl">
              Built for real preparation
            </h2>
            <p className="mx-auto max-w-2xl text-lg font-medium text-muted-foreground">
              Everything you need to walk in confident.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, accent }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-8 text-left shadow-sm"
              >
                <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mb-3 text-xl font-bold">{title}</h3>
                <p className="leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto max-w-screen-xl px-4 pb-24 lg:px-12">
          <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm md:p-16">
            <h2 className="text-3xl font-extrabold md:text-4xl">Ready for your next interview?</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Create your first mock interview in under a minute. No card required.
            </p>
            <Link href="/dashboard" className="mt-8 inline-block">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg">
                Start practicing
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} CareerPilot AI. Built to help you ace your next interview.</p>
      </footer>

      {/* Decorative only - hidden from assistive tech and non-interactive. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-indigo-200 opacity-30 mix-blend-multiply blur-3xl animate-blob dark:bg-indigo-900 dark:opacity-20 dark:mix-blend-normal" />
        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-cyan-200 opacity-30 mix-blend-multiply blur-3xl animate-blob animation-delay-2000 dark:bg-cyan-900 dark:opacity-20 dark:mix-blend-normal" />
        <div className="absolute -bottom-40 left-1/2 h-96 w-96 rounded-full bg-purple-200 opacity-30 mix-blend-multiply blur-3xl animate-blob animation-delay-4000 dark:bg-purple-900 dark:opacity-20 dark:mix-blend-normal" />
      </div>
    </div>
  );
}
