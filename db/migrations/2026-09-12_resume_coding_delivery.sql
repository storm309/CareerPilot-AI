-- CareerPilot AI: resume analyzer, coding rounds, and delivery coaching.
--
-- Additive and idempotent: new tables, one new column, new indexes. Nothing is
-- dropped or rewritten, so this is safe to run against a live database more
-- than once. Run after 2026-09-08_attempt_and_indexes.sql.

-- Delivery coaching metrics (word count, WPM, filler words, STAR coverage)
-- stored as JSON so the metric set can grow without another migration.
ALTER TABLE "userAnswers"
  ADD COLUMN IF NOT EXISTS "delivery" text;

CREATE TABLE IF NOT EXISTS "resumeAnalysis" (
  "id"              serial PRIMARY KEY NOT NULL,
  "userEmail"       varchar NOT NULL,
  "jobTitle"        varchar(500),
  "jobDescription"  text,
  "resumeText"      text,
  "atsScore"        integer,
  "matchedKeywords" text,
  "missingKeywords" text,
  "sectionScores"   text,
  "bulletRewrites"  text,
  "summary"         text,
  "createdat"       timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "codingSessions" (
  "id"          serial PRIMARY KEY NOT NULL,
  "userEmail"   varchar NOT NULL,
  "problemId"   varchar(255) NOT NULL,
  "title"       varchar(500) NOT NULL,
  "difficulty"  varchar(50),
  "language"    varchar(50),
  "problem"     text NOT NULL,
  "code"        text,
  "testVerdict" varchar(50),
  "testsPassed" integer,
  "testsTotal"  integer,
  "reviewScore" varchar(10),
  "review"      text,
  "createdat"   timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "resumeAnalysis_userEmail_idx"  ON "resumeAnalysis" ("userEmail");
CREATE INDEX IF NOT EXISTS "codingSessions_userEmail_idx"  ON "codingSessions" ("userEmail");
CREATE INDEX IF NOT EXISTS "codingSessions_problemId_idx"  ON "codingSessions" ("problemId");
