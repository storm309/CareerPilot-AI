"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { generateJson } from "@/utils/Geminimodel";
import { db } from "@/utils/db";
import { enforceRateLimit } from "@/utils/rateLimit";
import { resumeAnalysis } from "@/utils/schema";
import { requireUser } from "@/utils/serverAuth";
import {
  LIMITS,
  clampInt,
  cleanString,
  cleanStringList,
  requireString,
} from "@/utils/validation";

function fail(message) {
  return { success: false, error: message };
}

/** Rows come back with the JSON columns already parsed. */
function hydrate(row) {
  const parse = (value, fallback) => {
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  return {
    id: row.id,
    jobTitle: row.jobTitle,
    atsScore: row.atsScore,
    summary: row.summary,
    createdat: row.createdat,
    matchedKeywords: parse(row.matchedKeywords, []),
    missingKeywords: parse(row.missingKeywords, []),
    sectionScores: parse(row.sectionScores, []),
    bulletRewrites: parse(row.bulletRewrites, []),
  };
}

/**
 * Scores a resume against one job description.
 *
 * The resume text comes from /api/parse-pdf, which already authenticates the
 * caller and caps the upload - this action re-caps the length anyway, because a
 * server action can be invoked directly with any payload.
 */
export async function analyzeResume(input) {
  let email;

  try {
    ({ email } = await requireUser());
    enforceRateLimit(`resume:${email}`, { limit: 8, windowMs: 60_000 });
  } catch (error) {
    return fail(error.message);
  }

  let resumeText;
  let jobDescription;

  try {
    resumeText = requireString(input?.resumeText, {
      field: "Resume text",
      min: 100,
      max: LIMITS.resumeText,
    });
    jobDescription = requireString(input?.jobDescription, {
      field: "Job description",
      min: 50,
      max: LIMITS.jobDescription,
    });
  } catch (error) {
    return fail(error.message);
  }

  const jobTitle = cleanString(input?.jobTitle ?? "", LIMITS.jobPosition) || "the role";

  const prompt = `You are an applicant tracking system (ATS) combined with a senior technical recruiter.

Target role: ${jobTitle}

Job description:
"""
${jobDescription}
"""

Candidate resume (raw text extracted from a PDF):
"""
${resumeText}
"""

Evaluate how well this resume would score for this specific job, the way a real ATS plus a human screener would.

Rules:
- "atsScore" is 0-100. Be realistic and strict: 80+ means it would almost certainly pass a screen, below 50 means it would be filtered out.
- "matchedKeywords" are skills/technologies/qualifications from the job description that genuinely appear in the resume. Max 20.
- "missingKeywords" are important ones from the job description that are absent or too weakly stated. Max 15. Order by how much they matter.
- "sectionScores" rates each resume area out of 10 with one sentence of reasoning.
- "bulletRewrites" takes up to 5 real bullet points from the resume and rewrites each to be quantified, action-led and matched to this job description. "before" must be copied verbatim from the resume.
- Never invent experience the candidate does not have.

Respond with ONLY this JSON object:
{
  "atsScore": 0,
  "summary": "<3-4 sentences: would this pass, and what is the single biggest gap>",
  "matchedKeywords": ["..."],
  "missingKeywords": ["..."],
  "sectionScores": [
    { "section": "Impact & metrics", "score": 0, "note": "..." },
    { "section": "Keyword match", "score": 0, "note": "..." },
    { "section": "Structure & formatting", "score": 0, "note": "..." },
    { "section": "Clarity & brevity", "score": 0, "note": "..." }
  ],
  "bulletRewrites": [
    { "before": "<verbatim from resume>", "after": "<rewritten>", "why": "<one line>" }
  ]
}`;

  let result;
  try {
    result = await generateJson(prompt);
  } catch (error) {
    console.error("Resume analysis failed:", error);
    return fail(error.message || "The AI could not analyze that resume. Please try again.");
  }

  const atsScore = clampInt(result?.atsScore, { min: 0, max: 100, fallback: null });
  if (atsScore === null) {
    return fail("The AI did not return a usable score. Please try again.");
  }

  const payload = {
    atsScore,
    summary: cleanString(result?.summary, 2000),
    matchedKeywords: cleanStringList(result?.matchedKeywords, { max: 20 }),
    missingKeywords: cleanStringList(result?.missingKeywords, { max: 15 }),
    sectionScores: Array.isArray(result?.sectionScores)
      ? result.sectionScores
          .slice(0, 8)
          .map((entry) => ({
            section: cleanString(entry?.section, 80),
            score: clampInt(entry?.score, { min: 0, max: 10, fallback: 0 }),
            note: cleanString(entry?.note, 400),
          }))
          .filter((entry) => entry.section)
      : [],
    bulletRewrites: Array.isArray(result?.bulletRewrites)
      ? result.bulletRewrites
          .slice(0, 5)
          .map((entry) => ({
            before: cleanString(entry?.before, 600),
            after: cleanString(entry?.after, 600),
            why: cleanString(entry?.why, 300),
          }))
          .filter((entry) => entry.before && entry.after)
      : [],
  };

  let savedId = null;
  try {
    const [row] = await db
      .insert(resumeAnalysis)
      .values({
        userEmail: email,
        jobTitle,
        jobDescription,
        resumeText,
        atsScore: payload.atsScore,
        summary: payload.summary,
        matchedKeywords: JSON.stringify(payload.matchedKeywords),
        missingKeywords: JSON.stringify(payload.missingKeywords),
        sectionScores: JSON.stringify(payload.sectionScores),
        bulletRewrites: JSON.stringify(payload.bulletRewrites),
      })
      .returning({ id: resumeAnalysis.id });

    savedId = row?.id ?? null;
  } catch (error) {
    // The report is still useful even if the history row does not save.
    console.error("Could not save resume analysis:", error);
  }

  revalidatePath("/dashboard/resume");
  return { success: true, id: savedId, ...payload };
}

export async function getResumeHistory() {
  const { email } = await requireUser();

  const rows = await db
    .select()
    .from(resumeAnalysis)
    .where(eq(resumeAnalysis.userEmail, email))
    .orderBy(desc(resumeAnalysis.id))
    .limit(15);

  return rows.map(hydrate);
}

export async function deleteResumeAnalysis(id) {
  const { email } = await requireUser();
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isInteger(parsedId)) return fail("Invalid report id.");

  // The email is part of the WHERE clause, so another user's row is untouchable
  // even if its id is guessed.
  await db
    .delete(resumeAnalysis)
    .where(and(eq(resumeAnalysis.id, parsedId), eq(resumeAnalysis.userEmail, email)));

  revalidatePath("/dashboard/resume");
  return { success: true };
}
