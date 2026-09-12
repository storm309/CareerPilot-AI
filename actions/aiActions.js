"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { generateJson } from "@/utils/Geminimodel";
import { db } from "@/utils/db";
import { enforceRateLimit } from "@/utils/rateLimit";
import { requireUser } from "@/utils/serverAuth";
import { buildDeliveryMetrics, deliveryScore } from "@/utils/speechMetrics";
import {
  emailHistory,
  grammarHistory,
  mockinterview,
  userAnswers,
} from "@/utils/schema";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  LIMITS,
  QUESTION_COUNTS,
  WRITING_MODES,
  clampExperience,
  cleanString,
  pickFromList,
  requireString,
} from "@/utils/validation";

/**
 * Every AI prompt runs here, on the server, so the Gemini key never reaches the
 * browser. Callers get a plain `{ success, ... }` object rather than a thrown
 * error, because Next.js replaces server-action error messages with a generic
 * digest in production builds.
 */
function fail(message) {
  return { success: false, error: message };
}

async function loadOwnedInterview(mockid, email) {
  if (typeof mockid !== "string" || !mockid.trim()) {
    throw new Error("Invalid interview id.");
  }

  const [interview] = await db
    .select()
    .from(mockinterview)
    .where(eq(mockinterview.mockid, mockid))
    .limit(1);

  // Same message for "missing" and "not yours" so a mockid cannot be probed.
  if (!interview || interview.createdby !== email) {
    throw new Error("Interview not found.");
  }

  return interview;
}

function parseQuestions(interview) {
  try {
    const parsed = JSON.parse(interview.jsonmockresp);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeQuestions(payload, expectedCount) {
  // The model sometimes answers with a bare array and sometimes wraps it under
  // a key, so accept both shapes instead of failing the whole request.
  const list = Array.isArray(payload)
    ? payload
    : (payload?.questions ?? payload?.interviewQuestions ?? payload?.data);

  if (!Array.isArray(list)) return [];

  return list
    .map((item) => ({
      question: cleanString(item?.question ?? item?.q ?? "", 2000),
      answer: cleanString(item?.answer ?? item?.expectedAnswer ?? item?.a ?? "", 5000),
    }))
    .filter((item) => item.question.length > 0)
    .slice(0, expectedCount);
}

export async function createMockInterview(input) {
  let email;

  try {
    ({ email } = await requireUser());
    enforceRateLimit(`interview:${email}`, { limit: 10, windowMs: 60_000 });
  } catch (error) {
    return fail(error.message);
  }

  let jobPosition;
  let jobDescription;
  let experience;

  try {
    jobPosition = requireString(input?.jobPosition, {
      field: "Job role",
      min: 2,
      max: LIMITS.jobPosition,
    });
    jobDescription = requireString(input?.jobDescription, {
      field: "Job description",
      min: 10,
      max: LIMITS.jobDescription,
    });
    experience = clampExperience(input?.experience);
  } catch (error) {
    return fail(error.message);
  }

  const interviewType = pickFromList(input?.interviewType, INTERVIEW_TYPES, "Technical");
  const difficulty = pickFromList(input?.difficulty, DIFFICULTIES, "Medium");
  const questionCount = QUESTION_COUNTS.includes(Number(input?.questionCount))
    ? Number(input.questionCount)
    : 5;
  const resumeText = cleanString(input?.resumeText ?? "", LIMITS.resumeText);

  const resumeBlock = resumeText
    ? `Candidate resume (use it to personalize the questions):\n"""\n${resumeText}\n"""`
    : "";
  const resumeRule = resumeText
    ? "- At least two questions must reference specific projects or skills from the resume."
    : "";

  const prompt = `You are a senior hiring manager preparing an interview.

Role: ${jobPosition}
Job description / tech stack: ${jobDescription}
Candidate experience: ${experience} years
Interview type: ${interviewType}
Difficulty: ${difficulty}
${resumeBlock}

Write exactly ${questionCount} interview questions calibrated to a ${difficulty.toLowerCase()} ${interviewType} interview for someone with ${experience} years of experience.

Rules:
- Each question must be answerable out loud in 1-3 minutes.
- Do not number the questions.
- Ground every question in the job description above, not generic trivia.
${resumeRule}
- "answer" must be the model answer a strong candidate would give, 3-6 sentences.

Respond with ONLY a JSON array: [{"question": "...", "answer": "..."}]`;

  let questions;

  try {
    questions = normalizeQuestions(await generateJson(prompt), questionCount);
  } catch (error) {
    console.error("Question generation failed:", error);
    return fail(error.message || "The AI could not generate questions. Please try again.");
  }

  if (questions.length === 0) {
    return fail("The AI returned no usable questions. Please try again.");
  }

  const mockid = uuidv4();

  try {
    await db.insert(mockinterview).values({
      mockid,
      jsonmockresp: JSON.stringify(questions),
      jobposition: jobPosition,
      jobdescription: jobDescription,
      jobexp: experience,
      interviewType,
      resumeText: resumeText || null,
      createdby: email,
    });
  } catch (error) {
    console.error("Error inserting mock interview:", error);
    return fail("Could not save your interview. Please try again.");
  }

  revalidatePath("/dashboard");
  return { success: true, mockid, questionCount: questions.length };
}

/**
 * Decides which attempt new answers belong to.
 *
 * A run that already has an answer for every question is finished, so the next
 * one starts a fresh attempt; a partial run is resumed in place. Feedback for
 * earlier attempts is never overwritten.
 */
export async function beginAttempt(mockid) {
  let email;
  let interview;

  try {
    ({ email } = await requireUser());
    interview = await loadOwnedInterview(mockid, email);
  } catch (error) {
    return fail(error.message);
  }

  const questions = parseQuestions(interview);

  const rows = await db
    .select({ attempt: userAnswers.attempt, question: userAnswers.question })
    .from(userAnswers)
    .where(eq(userAnswers.mockidRef, mockid));

  if (rows.length === 0) {
    return { success: true, attempt: 1, answeredQuestions: [] };
  }

  const latest = Math.max(...rows.map((row) => row.attempt ?? 1));
  const answeredInLatest = rows
    .filter((row) => (row.attempt ?? 1) === latest)
    .map((row) => row.question);

  const isComplete =
    questions.length > 0 &&
    questions.every((question) => answeredInLatest.includes(question.question));

  return isComplete
    ? { success: true, attempt: latest + 1, answeredQuestions: [] }
    : { success: true, attempt: latest, answeredQuestions: answeredInLatest };
}

export async function submitAnswer({
  mockid,
  questionIndex,
  userAnswer,
  attempt,
  spokenSeconds,
}) {
  let email;

  try {
    ({ email } = await requireUser());
    enforceRateLimit(`answer:${email}`, { limit: 30, windowMs: 60_000 });
  } catch (error) {
    return fail(error.message);
  }

  const answer = cleanString(userAnswer, LIMITS.answer);
  if (answer.length < 10) {
    return fail("Your answer needs to be at least 10 characters.");
  }

  let interview;
  try {
    interview = await loadOwnedInterview(mockid, email);
  } catch (error) {
    return fail(error.message);
  }

  const questions = parseQuestions(interview);
  const question = questions[Number(questionIndex)];

  if (!question?.question) {
    return fail("That question does not belong to this interview.");
  }

  // Delivery is measured, not asked of the model: filler density, pace and STAR
  // coverage are deterministic, so they are recomputed here rather than trusted
  // from the browser.
  const seconds = Number(spokenSeconds);
  const delivery = buildDeliveryMetrics(
    answer,
    Number.isFinite(seconds) && seconds > 0 && seconds < 3600 ? seconds : null
  );
  delivery.score = deliveryScore(delivery);

  const prompt = `Act as a strict but fair senior technical hiring manager reviewing one interview answer.

Role being interviewed for: ${interview.jobposition}
Candidate experience: ${interview.jobexp} years
Interview type: ${interview.interviewType || "Technical"}

Question: ${question.question}

Candidate's answer:
"""
${answer}
"""

Score honestly against the bar for a candidate with ${interview.jobexp} years of experience. A rambling, evasive or off-topic answer scores 1-3. A correct but shallow answer scores 4-6. Only a complete, well-structured, specific answer scores 9-10.

Respond with ONLY this JSON object:
{
  "score": "<integer 1-10 as a string>",
  "feedback": "<2-4 sentences on how the answer landed>",
  "strengths": "<what the candidate did well, or 'None identified.'>",
  "weaknesses": "<what was missing, vague or wrong>",
  "improvements": "<concrete, actionable next steps>",
  "expectedAnswer": "<how a strong candidate would answer, 4-8 sentences>",
  "confidenceLevel": "<Low | Medium | High>"
}`;

  let evaluation;
  try {
    evaluation = await generateJson(prompt);
  } catch (error) {
    console.error("Answer evaluation failed:", error);
    return fail(error.message || "The AI could not grade your answer. Please try again.");
  }

  const rawScore = Number.parseFloat(evaluation?.score ?? evaluation?.rating);
  const score = Number.isFinite(rawScore)
    ? String(Math.min(10, Math.max(1, Math.round(rawScore))))
    : null;

  try {
    const [existing] = await db
      .select({ maxAttempt: sql`max(${userAnswers.attempt})`.mapWith(Number) })
      .from(userAnswers)
      .where(eq(userAnswers.mockidRef, mockid));

    const highest = existing?.maxAttempt ?? 0;
    const requested = Number(attempt);
    // Trust the client only within the range it could legitimately be in.
    const resolvedAttempt =
      Number.isInteger(requested) && requested >= 1 && requested <= highest + 1
        ? requested
        : Math.max(1, highest);

    // Re-answering the same question inside one attempt replaces the previous
    // row instead of piling up duplicates in the feedback list.
    await db
      .delete(userAnswers)
      .where(
        and(
          eq(userAnswers.mockidRef, mockid),
          eq(userAnswers.attempt, resolvedAttempt),
          eq(userAnswers.question, question.question)
        )
      );

    await db.insert(userAnswers).values({
      mockidRef: mockid,
      question: question.question,
      correctanswer: cleanString(evaluation?.expectedAnswer, 5000) || question.answer || null,
      useranswer: answer,
      feedback: cleanString(evaluation?.feedback, 3000) || null,
      rating: score,
      strengths: cleanString(evaluation?.strengths, 2000) || null,
      weaknesses: cleanString(evaluation?.weaknesses, 2000) || null,
      improvements: cleanString(evaluation?.improvements, 2000) || null,
      confidenceLevel: cleanString(evaluation?.confidenceLevel, 20) || null,
      delivery: JSON.stringify(delivery),
      attempt: resolvedAttempt,
      userEmail: email,
      createdat: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  } catch (error) {
    console.error("Error saving user answer:", error);
    return fail("Your answer was graded but could not be saved. Please try again.");
  }

  revalidatePath(`/dashboard/interview/${mockid}/feedback`);

  return {
    success: true,
    score,
    feedback: evaluation?.feedback ?? null,
    strengths: evaluation?.strengths ?? null,
    weaknesses: evaluation?.weaknesses ?? null,
    improvements: evaluation?.improvements ?? null,
    confidenceLevel: evaluation?.confidenceLevel ?? null,
    delivery,
  };
}

const WRITING_PROMPTS = {
  grammar: ({ text }) => `Act as an English writing coach. Correct the text below for grammar, punctuation, spelling and style without changing its meaning.

Text:
"""
${text}
"""

Respond with ONLY this JSON object:
{
  "correctedText": "<the fully corrected text>",
  "feedback": "<a short markdown bullet list naming each correction and why it was needed>"
}`,

  email: ({ text }) => `Act as a corporate communications coach. Rewrite the email draft below so it is professional, clear and appropriately concise, keeping the sender's intent and every concrete detail intact.

Draft:
"""
${text}
"""

Respond with ONLY this JSON object:
{
  "correctedText": "<the rewritten email, including a subject line>",
  "feedback": "<a short markdown bullet list explaining the tone, clarity and structure changes>"
}`,

  "cover-letter": ({ text, jobTitle, company }) => `Act as a career coach writing a cover letter for a candidate.

Target role: ${jobTitle || "the role described below"}
Company: ${company || "the company"}

Candidate's background, resume text or rough notes:
"""
${text}
"""

Write a cover letter of 250-350 words in four short paragraphs: why this company, what the candidate has actually done that maps to the role, one concrete result with a number if the notes contain one, and a direct closing ask.

Hard rules:
- Use only facts present in the notes above. Never invent an employer, a metric or a technology.
- No "I am writing to apply for". No "passionate", "dynamic", "synergy", "leverage".
- Plain, specific, confident. Write the way a competent engineer emails a hiring manager.

Respond with ONLY this JSON object:
{
  "correctedText": "<the complete cover letter, ready to send>",
  "feedback": "<a short markdown bullet list: what you emphasized, what you left out, and what the candidate should add themselves>"
}`,

  linkedin: ({ text, jobTitle }) => `Act as a personal branding expert rewriting a LinkedIn "About" section.

Target role the candidate wants: ${jobTitle || "not specified"}

Candidate's background, resume text or rough notes:
"""
${text}
"""

Write a first-person About section of 120-200 words: a specific opening line, what they build and the stack they build it with, one or two concrete results, and a closing line about what they want next.

Hard rules:
- Use only facts present in the notes above. Invent nothing.
- No buzzword soup, no third person, no "results-driven professional".
- Short paragraphs, no walls of text. At most one emoji, or none.

Respond with ONLY this JSON object:
{
  "correctedText": "<the About section>",
  "feedback": "<a short markdown bullet list: the angle you took, plus 3 keyword suggestions for their headline>"
}`,
};

const WRITING_STORAGE = {
  email: "Draft Review",
  "cover-letter": "Cover Letter",
  linkedin: "LinkedIn Summary",
};

export async function improveText({ text, mode, jobTitle, company }) {
  let email;

  try {
    ({ email } = await requireUser());
    enforceRateLimit(`prep:${email}`, { limit: 20, windowMs: 60_000 });
  } catch (error) {
    return fail(error.message);
  }

  const selectedMode = pickFromList(mode, WRITING_MODES, "grammar");
  const cleaned = cleanString(text, LIMITS.prepText);

  // Cover letters and LinkedIn summaries are generated from background notes,
  // so they need more to work with than a one-line grammar fix does.
  const minimum = selectedMode === "grammar" || selectedMode === "email" ? 10 : 60;

  if (cleaned.length < minimum) {
    return fail(
      minimum === 10
        ? "Please enter at least 10 characters to analyze."
        : `Paste at least ${minimum} characters about your background so there is something real to work from.`
    );
  }

  const prompt = WRITING_PROMPTS[selectedMode]({
    text: cleaned,
    jobTitle: cleanString(jobTitle ?? "", LIMITS.jobPosition),
    company: cleanString(company ?? "", LIMITS.company),
  });

  let result;
  try {
    result = await generateJson(prompt);
  } catch (error) {
    console.error("Writing tool failed:", error);
    return fail(error.message || "Analysis failed. Please try again.");
  }

  const correctedText = cleanString(result?.correctedText, LIMITS.prepText * 2);
  if (!correctedText) {
    return fail("The AI did not return anything usable. Please try again.");
  }

  const feedback =
    typeof result?.feedback === "string"
      ? result.feedback
      : Array.isArray(result?.feedback)
        ? result.feedback.map((item) => `- ${item}`).join("\n")
        : JSON.stringify(result?.feedback ?? "");

  try {
    if (selectedMode === "grammar") {
      await db.insert(grammarHistory).values({
        userEmail: email,
        originalText: cleaned,
        correctedText,
        feedback,
      });
    } else {
      await db.insert(emailHistory).values({
        userEmail: email,
        emailType: WRITING_STORAGE[selectedMode],
        originalText: cleaned,
        generatedEmail: correctedText,
        feedback,
      });
    }
  } catch (error) {
    // The user still gets their result; only the history row is lost.
    console.error("Could not save writing history:", error);
  }

  revalidatePath("/dashboard/preparation");
  return { success: true, mode: selectedMode, correctedText, feedback };
}
