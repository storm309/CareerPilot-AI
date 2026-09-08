"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/utils/db";
import { requireUser } from "@/utils/serverAuth";
import {
  emailHistory,
  grammarHistory,
  mockinterview,
  userAnswers,
} from "@/utils/schema";

/**
 * Loads an interview and proves the caller owns it.
 *
 * Every mockid-addressed action funnels through here. Without it, a mockid is a
 * bearer token: anyone who guesses or is shown one could read another person's
 * answers or delete their interview.
 */
async function loadOwnedInterview(mockid, email) {
  if (typeof mockid !== "string" || !mockid.trim()) {
    throw new Error("Invalid interview id.");
  }

  const [interview] = await db
    .select()
    .from(mockinterview)
    .where(eq(mockinterview.mockid, mockid))
    .limit(1);

  if (!interview) throw new Error("Interview not found.");
  if (interview.createdby !== email) throw new Error("Interview not found.");

  return interview;
}

export async function getInterviewList() {
  const { email } = await requireUser();

  return db
    .select({
      id: mockinterview.id,
      mockid: mockinterview.mockid,
      jobposition: mockinterview.jobposition,
      jobdescription: mockinterview.jobdescription,
      jobexp: mockinterview.jobexp,
      interviewType: mockinterview.interviewType,
      createdat: mockinterview.createdat,
    })
    .from(mockinterview)
    .where(eq(mockinterview.createdby, email))
    .orderBy(desc(mockinterview.id));
}

export async function getInterviewDetails(mockid) {
  const { email } = await requireUser();
  const interview = await loadOwnedInterview(mockid, email);

  let questions = [];
  try {
    const parsed = JSON.parse(interview.jsonmockresp);
    questions = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Stored interview questions are not valid JSON:", error);
  }

  // resumeText is deliberately not returned: the browser never needs it, and
  // keeping it server-side avoids shipping a full resume into the page payload.
  return {
    mockid: interview.mockid,
    jobposition: interview.jobposition,
    jobdescription: interview.jobdescription,
    jobexp: interview.jobexp,
    interviewType: interview.interviewType,
    createdat: interview.createdat,
    questions,
  };
}

export async function getFeedbackByMockId(mockid, { attempt } = {}) {
  const { email } = await requireUser();
  await loadOwnedInterview(mockid, email);

  const rows = await db
    .select()
    .from(userAnswers)
    .where(eq(userAnswers.mockidRef, mockid))
    .orderBy(userAnswers.attempt, userAnswers.id);

  const attempts = [...new Set(rows.map((row) => row.attempt ?? 1))].sort((a, b) => a - b);
  const selectedAttempt = attempts.includes(attempt)
    ? attempt
    : attempts[attempts.length - 1] ?? 1;

  const answers = rows.filter((row) => (row.attempt ?? 1) === selectedAttempt);

  const scored = answers
    .map((row) => Number.parseFloat(row.rating))
    .filter((value) => Number.isFinite(value));

  return {
    answers,
    attempts,
    selectedAttempt,
    averageRating: scored.length
      ? (scored.reduce((sum, value) => sum + value, 0) / scored.length).toFixed(1)
      : null,
  };
}

export async function getDashboardStats() {
  const { email } = await requireUser();

  try {
    // Aggregate in the database rather than pulling every row over the wire and
    // counting in JS - this used to fetch the user's entire history on each
    // dashboard load.
    const [[interviewStats], [answerStats], [grammarStats], [emailStats], [latest]] =
      await Promise.all([
        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(mockinterview)
          .where(eq(mockinterview.createdby, email)),
        db
          .select({
            count: sql`count(*)`.mapWith(Number),
            // rating is a varchar. Take only a leading number so a legacy value
            // like "8/10" reads as 8 rather than being stripped to 810.
            average: sql`avg(least(nullif(substring(${userAnswers.rating} from '^([0-9]+(?:\.[0-9]+)?)'), '')::numeric, 10))`,
          })
          .from(userAnswers)
          .where(eq(userAnswers.userEmail, email)),
        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(grammarHistory)
          .where(eq(grammarHistory.userEmail, email)),
        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(emailHistory)
          .where(eq(emailHistory.userEmail, email)),
        db
          .select({
            mockid: mockinterview.mockid,
            jobposition: mockinterview.jobposition,
            createdat: mockinterview.createdat,
          })
          .from(mockinterview)
          .where(eq(mockinterview.createdby, email))
          .orderBy(desc(mockinterview.id))
          .limit(1),
      ]);

    const average = answerStats?.average == null ? null : Number(answerStats.average);

    return {
      totalInterviews: interviewStats?.count ?? 0,
      totalAnswers: answerStats?.count ?? 0,
      averageScore: Number.isFinite(average) ? average.toFixed(1) : null,
      grammarUsage: grammarStats?.count ?? 0,
      emailUsage: emailStats?.count ?? 0,
      latestInterview: latest ?? null,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw new Error("Could not load your dashboard stats.");
  }
}

export async function getProgressTrend(limit = 10) {
  const { email } = await requireUser();

  const rows = await db
    .select({
      mockid: mockinterview.mockid,
      jobposition: mockinterview.jobposition,
      createdat: mockinterview.createdat,
      average: sql`avg(least(nullif(substring(${userAnswers.rating} from '^([0-9]+(?:\.[0-9]+)?)'), '')::numeric, 10))`,
      answered: sql`count(${userAnswers.id})`.mapWith(Number),
    })
    .from(mockinterview)
    .leftJoin(userAnswers, eq(userAnswers.mockidRef, mockinterview.mockid))
    .where(eq(mockinterview.createdby, email))
    .groupBy(mockinterview.id, mockinterview.mockid, mockinterview.jobposition, mockinterview.createdat)
    .orderBy(desc(mockinterview.id))
    .limit(Math.min(50, Math.max(1, limit)));

  return rows
    .filter((row) => row.answered > 0 && row.average != null)
    .map((row) => ({ ...row, average: Number(Number(row.average).toFixed(1)) }))
    .reverse();
}

export async function deleteInterview(mockid) {
  const { email } = await requireUser();
  await loadOwnedInterview(mockid, email);

  await db.delete(userAnswers).where(eq(userAnswers.mockidRef, mockid));
  await db.delete(mockinterview).where(
    and(eq(mockinterview.mockid, mockid), eq(mockinterview.createdby, email))
  );

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPrepHistory() {
  const { email } = await requireUser();

  const [grammar, emails] = await Promise.all([
    db
      .select()
      .from(grammarHistory)
      .where(eq(grammarHistory.userEmail, email))
      .orderBy(desc(grammarHistory.id))
      .limit(20),
    db
      .select()
      .from(emailHistory)
      .where(eq(emailHistory.userEmail, email))
      .orderBy(desc(emailHistory.id))
      .limit(20),
  ]);

  return { grammar, emails };
}
