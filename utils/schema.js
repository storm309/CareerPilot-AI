import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const mockinterview = pgTable(
  "mockinterview",
  {
    id: serial("id").primaryKey().notNull(),
    jsonmockresp: text("jsonmockresp").notNull(),
    jobposition: varchar("jobposition", { length: 1000 }).notNull(),
    // Job descriptions routinely run past a thousand characters; varchar(1000)
    // made long pastes fail the insert outright.
    jobdescription: text("jobdescription").notNull(),
    jobexp: varchar("jobexp", { length: 255 }).notNull(),
    interviewType: varchar("interviewType", { length: 255 }).default("Technical"),
    resumeText: text("resumeText"),
    createdby: varchar("createdby", { length: 255 }).notNull(),
    createdat: timestamp("createdat", { mode: "string" }).defaultNow(),
    mockid: varchar("mockid", { length: 255 }).notNull(),
  },
  (table) => ({
    // Every dashboard query filters on the owner, and every interview page
    // looks a row up by mockid.
    createdByIdx: index("mockinterview_createdby_idx").on(table.createdby),
    mockIdIdx: index("mockinterview_mockid_idx").on(table.mockid),
  })
);

export const userAnswers = pgTable(
  "userAnswers",
  {
    id: serial("id").primaryKey().notNull(),
    mockidRef: varchar("mockid").notNull(),
    question: text("question").notNull(),
    correctanswer: text("correctanswer"),
    useranswer: text("useranswer"),
    feedback: text("feedback"),
    rating: varchar("rating"),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    improvements: text("improvements"),
    confidenceLevel: varchar("confidenceLevel"),
    // Groups answers into retakes so the feedback page can show one attempt at a
    // time instead of every answer ever given for this interview.
    attempt: integer("attempt").default(1).notNull(),
    userEmail: varchar("userEmail"),
    // Kept as varchar: Postgres has no implicit varchar -> timestamp cast, so
    // changing the type here would make `npm run db-push` fail on existing rows.
    createdat: varchar("createdat"),
  },
  (table) => ({
    mockRefIdx: index("userAnswers_mockid_idx").on(table.mockidRef),
    userEmailIdx: index("userAnswers_userEmail_idx").on(table.userEmail),
  })
);

export const grammarHistory = pgTable(
  "grammarHistory",
  {
    id: serial("id").primaryKey().notNull(),
    userEmail: varchar("userEmail").notNull(),
    originalText: text("originalText").notNull(),
    correctedText: text("correctedText").notNull(),
    feedback: text("feedback"),
    createdat: timestamp("createdat", { mode: "string" }).defaultNow(),
  },
  (table) => ({
    userEmailIdx: index("grammarHistory_userEmail_idx").on(table.userEmail),
  })
);

export const emailHistory = pgTable(
  "emailHistory",
  {
    id: serial("id").primaryKey().notNull(),
    userEmail: varchar("userEmail").notNull(),
    emailType: varchar("emailType", { length: 255 }),
    originalText: text("originalText"),
    generatedEmail: text("generatedEmail").notNull(),
    feedback: text("feedback"),
    createdat: timestamp("createdat", { mode: "string" }).defaultNow(),
  },
  (table) => ({
    userEmailIdx: index("emailHistory_userEmail_idx").on(table.userEmail),
  })
);
