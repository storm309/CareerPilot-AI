import { Lightbulb } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import React from "react";

/**
 * Shared frame for the sign-in and sign-up pages. Both used to hardcode
 * `bg-white`, which left the auth screens stuck in light mode.
 */
export default function AuthShell({ children, note }) {
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-12">
      <section className="relative flex h-32 items-end bg-slate-900 lg:col-span-5 lg:h-full xl:col-span-6">
        <div className="hidden lg:block lg:p-12">
          <Link href="/" className="block" aria-label="CareerPilot AI home">
            <Logo className="text-white" markClassName="h-9 w-9" />
          </Link>

          <h2 className="mt-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            Practice the interview before it happens
          </h2>

          <p className="mt-4 leading-relaxed text-white/80">
            CareerPilot AI writes interview questions for the exact role you are applying to,
            listens to your answers, and grades each one with specific, actionable feedback -
            so you walk in having already had the conversation once.
          </p>

          {note ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-white">
              <p className="flex items-center gap-2 font-semibold">
                <Lightbulb className="h-5 w-5" />
                {note.title}
              </p>
              <div className="mt-2 space-y-1 text-sm text-white/80">{note.body}</div>
            </div>
          ) : null}
        </div>
      </section>

      <main className="flex items-center justify-center px-6 py-10 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
