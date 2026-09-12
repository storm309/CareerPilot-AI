"use server";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/utils/db";
import {
  codingSessions,
  emailHistory,
  grammarHistory,
  mockinterview,
  resumeAnalysis,
  userAnswers,
} from "@/utils/schema";
import { requireUser } from "@/utils/serverAuth";
import { deliveryScore } from "@/utils/speechMetrics";

const DAY_MS = 24 * 60 * 60 * 1000;

// Ratings are varchar. Take only a leading number so a legacy value like
// "8/10" reads as 8 rather than being stripped to 810.
const NUMERIC_RATING = sql`least(nullif(substring(${userAnswers.rating} from '^([0-9]+(?:\.[0-9]+)?)'), '')::numeric, 10)`;

function toDayKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // Local calendar day, so "yesterday" means what the user's clock says.
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dayKeyFromOffset(offset) {
  return toDayKey(new Date(Date.now() - offset * DAY_MS));
}

/**
 * Current and longest run of consecutive days with any activity.
 *
 * A streak survives today being empty - it only breaks once yesterday is also
 * empty - so opening the app in the morning does not show a zeroed streak.
 */
function computeStreak(dayKeys) {
  const days = [...new Set(dayKeys.filter(Boolean))].sort();
  if (days.length === 0) return { current: 0, longest: 0, activeDays: 0, lastActive: null };

  const daySet = new Set(days);
  const today = dayKeyFromOffset(0);
  const yesterday = dayKeyFromOffset(1);

  let current = 0;
  if (daySet.has(today) || daySet.has(yesterday)) {
    let offset = daySet.has(today) ? 0 : 1;
    while (daySet.has(dayKeyFromOffset(offset))) {
      current += 1;
      offset += 1;
    }
  }

  let longest = 1;
  let run = 1;
  for (let index = 1; index < days.length; index++) {
    const previous = new Date(`${days[index - 1]}T00:00:00`);
    const currentDay = new Date(`${days[index]}T00:00:00`);
    const gapDays = Math.round((currentDay - previous) / DAY_MS);

    run = gapDays === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  return {
    current,
    longest,
    activeDays: days.length,
    lastActive: days[days.length - 1],
  };
}

/** The last 12 weeks as a contribution-style grid. */
function buildHeatmap(dayKeys) {
  const counts = new Map();
  for (const key of dayKeys) {
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days = [];
  for (let offset = 83; offset >= 0; offset--) {
    const key = dayKeyFromOffset(offset);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return days;
}

export async function getProgressOverview() {
  const { email } = await requireUser();

  const [interviews, answers, grammar, emails, resumes, coding] = await Promise.all([
    db
      .select({ createdat: mockinterview.createdat, mockid: mockinterview.mockid })
      .from(mockinterview)
      .where(eq(mockinterview.createdby, email)),
    db
      .select({
        createdat: userAnswers.createdat,
        question: userAnswers.question,
        // mapWith(Number) would turn an unrated answer's NULL into 0, which
        // then counts as a real score of zero and drags every average down.
        rating: NUMERIC_RATING.mapWith((value) => (value == null ? null : Number(value))),
        delivery: userAnswers.delivery,
        mockidRef: userAnswers.mockidRef,
        attempt: userAnswers.attempt,
      })
      .from(userAnswers)
      .where(eq(userAnswers.userEmail, email)),
    db
      .select({ createdat: grammarHistory.createdat })
      .from(grammarHistory)
      .where(eq(grammarHistory.userEmail, email)),
    db
      .select({ createdat: emailHistory.createdat })
      .from(emailHistory)
      .where(eq(emailHistory.userEmail, email)),
    db
      .select({ createdat: resumeAnalysis.createdat, atsScore: resumeAnalysis.atsScore })
      .from(resumeAnalysis)
      .where(eq(resumeAnalysis.userEmail, email)),
    db
      .select({
        createdat: codingSessions.createdat,
        reviewScore: codingSessions.reviewScore,
        testVerdict: codingSessions.testVerdict,
      })
      .from(codingSessions)
      .where(eq(codingSessions.userEmail, email)),
  ]);

  const dayKeys = [
    ...interviews.map((row) => toDayKey(row.createdat)),
    ...answers.map((row) => toDayKey(row.createdat)),
    ...grammar.map((row) => toDayKey(row.createdat)),
    ...emails.map((row) => toDayKey(row.createdat)),
    ...resumes.map((row) => toDayKey(row.createdat)),
    ...coding.map((row) => toDayKey(row.createdat)),
  ];

  const scored = answers.filter((row) => Number.isFinite(row.rating));
  const average = (values) =>
    values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;

  // Delivery metrics only exist on answers recorded since the coaching feature
  // shipped, so older rows are simply skipped rather than counted as zero.
  const deliveries = answers
    .map((row) => {
      try {
        return row.delivery ? JSON.parse(row.delivery) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const withPace = deliveries.filter((entry) => Number.isFinite(entry.wordsPerMinute));

  const skills = [
    { skill: "Answer content", score: average(scored.map((row) => row.rating)) },
    { skill: "Delivery", score: average(deliveries.map((entry) => deliveryScore(entry)).filter(Boolean)) },
    {
      skill: "STAR structure",
      score: average(deliveries.map((entry) => (entry.star?.score ?? 0) * 2.5)),
    },
    {
      skill: "Fluency",
      // 0 fillers per 100 words is 10; 10+ per 100 words floors at 0.
      score: average(
        deliveries.map((entry) => Math.max(0, 10 - (entry.fillerRate ?? 0)))
      ),
    },
    {
      skill: "Resume fit",
      score: average(
        resumes.filter((row) => Number.isFinite(row.atsScore)).map((row) => row.atsScore / 10)
      ),
    },
    {
      skill: "Coding",
      score: average(
        coding
          .map((row) => Number.parseFloat(row.reviewScore))
          .filter((value) => Number.isFinite(value))
      ),
    },
  ];

  const weakest = [...scored]
    .sort((a, b) => a.rating - b.rating)
    .slice(0, 5)
    .map((row) => ({ question: row.question, rating: row.rating, mockid: row.mockidRef }));

  return {
    streak: computeStreak(dayKeys),
    heatmap: buildHeatmap(dayKeys),
    skills,
    weakest,
    totals: {
      interviews: interviews.length,
      answers: answers.length,
      resumes: resumes.length,
      coding: coding.length,
      codingPassed: coding.filter((row) => row.testVerdict === "passed").length,
      writing: grammar.length + emails.length,
    },
    pace: {
      averageWpm: average(withPace.map((entry) => entry.wordsPerMinute)),
      averageFillerRate: average(deliveries.map((entry) => entry.fillerRate ?? 0)),
      samples: deliveries.length,
    },
  };
}

/**
 * Per-attempt averages for one interview, so a retake can be compared against
 * the run before it.
 */
export async function getAttemptComparison(mockid) {
  const { email } = await requireUser();

  const [interview] = await db
    .select({ createdby: mockinterview.createdby, jobposition: mockinterview.jobposition })
    .from(mockinterview)
    .where(eq(mockinterview.mockid, mockid))
    .limit(1);

  if (!interview || interview.createdby !== email) {
    throw new Error("Interview not found.");
  }

  const rows = await db
    .select({
      attempt: userAnswers.attempt,
      average: sql`avg(${NUMERIC_RATING})`,
      answered: sql`count(*)`.mapWith(Number),
    })
    .from(userAnswers)
    .where(eq(userAnswers.mockidRef, mockid))
    .groupBy(userAnswers.attempt)
    .orderBy(userAnswers.attempt);

  return {
    jobposition: interview.jobposition,
    attempts: rows.map((row) => ({
      attempt: row.attempt,
      answered: row.answered,
      average: row.average == null ? null : Number(Number(row.average).toFixed(1)),
    })),
  };
}

export async function getRecentActivity(limit = 8) {
  const { email } = await requireUser();

  const [interviews, resumes, coding] = await Promise.all([
    db
      .select({
        mockid: mockinterview.mockid,
        label: mockinterview.jobposition,
        createdat: mockinterview.createdat,
      })
      .from(mockinterview)
      .where(eq(mockinterview.createdby, email))
      .orderBy(desc(mockinterview.id))
      .limit(limit),
    db
      .select({
        id: resumeAnalysis.id,
        label: resumeAnalysis.jobTitle,
        score: resumeAnalysis.atsScore,
        createdat: resumeAnalysis.createdat,
      })
      .from(resumeAnalysis)
      .where(eq(resumeAnalysis.userEmail, email))
      .orderBy(desc(resumeAnalysis.id))
      .limit(limit),
    db
      .select({
        problemId: codingSessions.problemId,
        label: codingSessions.title,
        score: codingSessions.reviewScore,
        createdat: codingSessions.createdat,
      })
      .from(codingSessions)
      .where(eq(codingSessions.userEmail, email))
      .orderBy(desc(codingSessions.id))
      .limit(limit),
  ]);

  return [
    ...interviews.map((row) => ({
      kind: "interview",
      label: row.label,
      href: `/dashboard/interview/${row.mockid}/feedback`,
      createdat: row.createdat,
      score: null,
    })),
    ...resumes.map((row) => ({
      kind: "resume",
      label: row.label || "Resume report",
      href: "/dashboard/resume",
      createdat: row.createdat,
      score: row.score == null ? null : `${row.score}/100`,
    })),
    ...coding.map((row) => ({
      kind: "coding",
      label: row.label,
      href: `/dashboard/coding/${row.problemId}`,
      createdat: row.createdat,
      score: row.score ? `${row.score}/10` : null,
    })),
  ]
    .sort((a, b) => new Date(b.createdat ?? 0) - new Date(a.createdat ?? 0))
    .slice(0, limit);
}
