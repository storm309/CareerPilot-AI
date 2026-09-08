# CareerPilot AI

<div align="center">
  <img src="public/logo.png" alt="CareerPilot AI Logo" width="200"/>
</div>

**CareerPilot AI** generates a mock interview for the exact role you are applying to, listens to
your answers, and grades each one with a score and specific, actionable feedback.

## Features

- **Questions written for the role.** Job title, description, experience, interview type
  (Technical / HR / Mixed / System Design), difficulty and question count all feed the prompt.
  Upload a PDF resume and the questions reference your actual projects.
- **Answer by voice or by typing.** Speech-to-text transcribes into an editable box, so you can
  fix the transcript before submitting. Typing works identically if voice input is unavailable.
- **Per-answer grading.** Every answer returns a score out of 10 plus strengths, weaknesses,
  concrete improvements, a confidence read, and the answer a strong candidate would have given.
- **Attempts.** Each complete run is stored as its own attempt, so you can compare a retake
  against an earlier run from the feedback page.
- **Optional proctoring.** A proctored run requires screen sharing and fullscreen, and counts tab
  switches, focus loss, fullscreen exits and stopped shares as warnings - three ends the
  interview. Practice mode skips all of it and still grades your answers.
- **Prep tools.** A grammar checker and an email rewriter, both with saved history.
- **Progress tracking.** Dashboard stats and a score-per-interview chart.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Styling | Tailwind CSS, shadcn/ui primitives |
| Database | PostgreSQL (Supabase / Neon) via Drizzle ORM and `pg` |
| Auth | Clerk |
| AI | Google Gemini (`@google/generative-ai`) |
| Media | `react-webcam`, `react-hook-speech-to-text`, `pdf-parse` |

## Architecture notes

**All AI calls and all database access run on the server.** `utils/Geminimodel.js`,
`utils/db.js`, `utils/serverAuth.js`, `utils/rateLimit.js` and `utils/validation.js` are marked
`server-only`, so importing any of them from a client component is a build error rather than a
silent leak.

**Server actions derive the user from the Clerk session, never from a prop.** Every action that
takes a `mockid` loads the row and checks `createdby` against the session email before returning
or mutating anything, so one user's interview id is useless to another account.

```
actions/
  aiActions.js   -> createMockInterview, beginAttempt, submitAnswer, improveText
  dbActions.js   -> reads, stats, delete (all ownership-checked)
utils/
  Geminimodel.js -> server-only Gemini client with retries + JSON repair
  serverAuth.js  -> requireUser(): the single source of caller identity
  rateLimit.js   -> per-user, per-action limiter on the paid endpoints
  validation.js  -> input cleaning, length caps, enum allowlists
```

## Getting started

### Prerequisites

- Node.js 18.18 or newer
- A PostgreSQL database (Supabase or Neon)
- A Google AI Studio API key
- A Clerk application

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Fill in `.env.local`. **Do not prefix `DATABASE_URL`, `GEMINI_API_KEY` or `CLERK_SECRET_KEY`
with `NEXT_PUBLIC_`** - that prefix inlines the value into the browser bundle.

### 3. Create the schema

```bash
npm run db-push
```

Upgrading an existing database instead? `db/migrations/` holds an idempotent, non-destructive
SQL script that adds the `attempt` column and the query indexes; run it directly if you would
rather not let `drizzle-kit` diff your database.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

### Docker

```bash
docker build -t careerpilot-ai .
docker run -p 3000:3000 --env-file .env.local careerpilot-ai
```

The image builds with `BUILD_STANDALONE=true` so Next.js emits `.next/standalone`. Vercel
deployments leave that unset and use the native output.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run db-push` | Sync `utils/schema.js` to the database |
| `npm run db-generate` | Emit SQL migrations from the schema |
| `npm run db-studio` | Drizzle Studio |

## Security

- Secrets are server-side only; `server-only` enforces it at build time.
- Every server action authenticates via Clerk and authorizes by row ownership.
- `/api/parse-pdf` requires a session, caps uploads at 5MB, verifies the `%PDF-` header, and is
  rate limited.
- AI endpoints are rate limited per user, and all user input is length-capped and stripped of
  control characters before it reaches a prompt.
- Answers and resumes are sent to the Gemini API for grading. Do not paste anything confidential.

## License

Built to help you ace your next interview.
