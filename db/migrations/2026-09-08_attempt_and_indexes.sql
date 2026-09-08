-- CareerPilot AI schema upgrade.
--
-- Every statement is idempotent and non-destructive: it only adds a column,
-- widens a column, or creates an index. No existing data is dropped or
-- rewritten, so it is safe to run against a live database more than once.
--
-- Equivalent to `npm run db-push`; run this directly if you would rather not
-- let drizzle-kit diff the database.

-- Long job descriptions were being rejected by varchar(1000).
ALTER TABLE "mockinterview"
  ALTER COLUMN "jobdescription" TYPE text;

-- Questions can exceed the default varchar length once the AI gets specific.
ALTER TABLE "userAnswers"
  ALTER COLUMN "question" TYPE text;

-- Groups answers into retakes so the feedback page can show one run at a time
-- instead of every answer ever recorded for the interview.
ALTER TABLE "userAnswers"
  ADD COLUMN IF NOT EXISTS "attempt" integer NOT NULL DEFAULT 1;

-- Every query filters on one of these; without them each page load was a
-- sequential scan of the whole table.
CREATE INDEX IF NOT EXISTS "mockinterview_createdby_idx" ON "mockinterview" ("createdby");
CREATE INDEX IF NOT EXISTS "mockinterview_mockid_idx"    ON "mockinterview" ("mockid");
CREATE INDEX IF NOT EXISTS "userAnswers_mockid_idx"      ON "userAnswers" ("mockid");
CREATE INDEX IF NOT EXISTS "userAnswers_userEmail_idx"   ON "userAnswers" ("userEmail");
CREATE INDEX IF NOT EXISTS "grammarHistory_userEmail_idx" ON "grammarHistory" ("userEmail");
CREATE INDEX IF NOT EXISTS "emailHistory_userEmail_idx"   ON "emailHistory" ("userEmail");
