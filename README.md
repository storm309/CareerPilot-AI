# CareerPilot AI

<div align="center">
  <img src="public/logo.svg" alt="CareerPilot AI" width="260"/>
</div>

**CareerPilot AI** generates a mock interview for the exact role you are applying to, listens to
your answers, and grades each one twice: once for what you said, once for how you said it.

## Features

### Interviews

- **Questions written for the role.** Job title, description, experience, interview type
  (Technical / HR / Mixed / System Design), difficulty and question count all feed the prompt.
  Upload a PDF resume and at least two questions reference your actual projects.
- **Answer by voice or by typing.** Speech-to-text transcribes into an editable box, appended to
  whatever you already typed rather than replacing it.
- **Content scoring.** Every answer returns a score out of 10 plus strengths, weaknesses,
  concrete improvements, a confidence read, and the answer a strong candidate would have given.
- **Delivery coaching.** Words per minute, filler-word density (English *and* Hinglish) and STAR
  coverage, measured deterministically from the transcript - not asked of the model. A separate
  delivery score out of 10 catches the rambling that a content score hides.
- **Attempts.** Each complete run is its own attempt, comparable side by side from the feedback
  page. Nothing is overwritten.
- **PDF reports.** Export any feedback page as a flat, fully expanded report and save it through
  the browser's own print dialog.
- **Optional proctoring.** Screen sharing, fullscreen and tab-switch detection, with three
  warnings before the interview ends. Practice mode skips all of it and still grades you.

### Coding rounds

- Original problems generated per topic and difficulty, with a starter stub and 5-8 test cases.
- **Your JavaScript actually runs**, inside a sandboxed Web Worker in your browser - an infinite
  loop is terminated on a deadline, and the code cannot touch the DOM or your session.
- AI review of correctness, time and space complexity, edge cases and the optimal approach.
- Autosave, a visible timer, and hints behind a disclosure.

### Resume & writing

- **ATS scoring** against one job description: a 0-100 score, matched and missing keywords ranked
  by impact, per-section breakdown, and rewritten versions of up to five of your real bullets.
- **Cover letters and LinkedIn bios** generated only from facts you supply - nothing invented.
- **Grammar checker and email rewriter**, all with saved history.

### Progress

- Activity streak, 12-week heatmap, skill breakdown across six measured dimensions, and your five
  lowest-scoring answers with a direct link back to each.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Styling | Tailwind CSS, shadcn/ui primitives, dark-first theme |
| Database | PostgreSQL (Supabase / Neon) via Drizzle ORM and `pg` |
| Auth | Clerk |
| AI | Google Gemini (`@google/generative-ai`) |
| Editor | Monaco (`@monaco-editor/react`, loaded on demand) |
| Media | `react-webcam`, `react-hook-speech-to-text`, `pdf-parse` |

## Architecture notes

**All AI calls and all database access run on the server.** `utils/Geminimodel.js`, `utils/db.js`,
`utils/serverAuth.js`, `utils/rateLimit.js` and `utils/validation.js` are marked `server-only`, so
importing any of them from a client component is a build error rather than a silent leak.

**Server actions derive the user from the Clerk session, never from a prop.** Every action that
takes a `mockid`, `problemId` or report id loads the row and checks ownership against the session
email before returning or mutating anything.

```
actions/
  aiActions.js       -> createMockInterview, beginAttempt, submitAnswer, improveText
  codingActions.js   -> generateCodingProblem, saveCodeProgress, reviewCode, history
  resumeActions.js   -> analyzeResume, history, delete
  progressActions.js -> streak, heatmap, skill breakdown, attempt comparison
  dbActions.js       -> reads, stats, delete (all ownership-checked)
utils/
  Geminimodel.js     -> server-only Gemini client with retries + JSON repair
  serverAuth.js      -> requireUser(): the single source of caller identity
  rateLimit.js       -> per-user, per-action limiter on the paid endpoints
  validation.js      -> input cleaning, length caps, enum allowlists
  speechMetrics.js   -> filler words, pace, STAR - shared by browser and server
app/dashboard/coding/_components/runTests.js -> the Web Worker code sandbox
```

**Brand assets are vector-first.** The mark lives as inline SVG in
`components/Logo.jsx` and `app/icon.svg`; `scripts/render-brand-assets.mjs` renders the PNGs that
iOS and link scrapers require. The wordmark is real text in the app's font, not baked into an
image. Regenerate the rasters only when the mark changes:

```bash
npm install --no-save sharp && node scripts/render-brand-assets.mjs
```

**The one external runtime dependency** is the Monaco editor bundle, fetched from jsDelivr at a
pinned version (`app/dashboard/coding/_components/monacoSetup.js`). It is ~24MB unpacked, which is
too large to serve from `/public`. Everything else is self-hosted.

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

Fill in `.env.local`. **Do not prefix `DATABASE_URL`, `GEMINI_API_KEY` or `CLERK_SECRET_KEY` with
`NEXT_PUBLIC_`** - that prefix inlines the value into the browser bundle.

### 3. Create or upgrade the schema

```bash
npm run db-push
```

Upgrading an existing database instead? `db/migrations/` holds idempotent, non-destructive SQL
scripts you can run directly, in filename order:

| File | Adds |
|---|---|
| `2026-09-08_attempt_and_indexes.sql` | `attempt` column, widened columns, query indexes |
| `2026-09-12_resume_coding_delivery.sql` | `delivery` column, `resumeAnalysis` and `codingSessions` tables |

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
- Candidate code runs in a Web Worker with no DOM or session access, on a hard timeout.
- AI endpoints are rate limited per user, and all input is length-capped and stripped of control
  characters before reaching a prompt.
- Answers, resumes and code are sent to the Gemini API for grading. Do not paste anything
  confidential.

## License

Built to help you ace your next interview.
