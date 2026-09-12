"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

import { generateJson } from "@/utils/Geminimodel";
import { db } from "@/utils/db";
import { enforceRateLimit } from "@/utils/rateLimit";
import { codingSessions } from "@/utils/schema";
import { requireUser } from "@/utils/serverAuth";
import {
  CODE_LANGUAGES,
  CODE_TOPICS,
  DIFFICULTIES,
  LIMITS,
  clampInt,
  cleanCode,
  cleanString,
  cleanStringList,
  pickFromList,
} from "@/utils/validation";

function fail(message) {
  return { success: false, error: message };
}

const LANGUAGE_IDS = CODE_LANGUAGES.map((language) => language.id);

function parseProblem(row) {
  try {
    return JSON.parse(row.problem);
  } catch {
    return null;
  }
}

/**
 * Loads a coding session the caller owns.
 *
 * problemId is a uuid handed to the browser, so it must be treated as an
 * untrusted identifier, not as proof of ownership.
 */
async function loadOwnedSession(problemId, email) {
  if (typeof problemId !== "string" || !problemId.trim()) {
    throw new Error("Invalid problem id.");
  }

  const [row] = await db
    .select()
    .from(codingSessions)
    .where(and(eq(codingSessions.problemId, problemId), eq(codingSessions.userEmail, email)))
    .limit(1);

  if (!row) throw new Error("Problem not found.");
  return row;
}

export async function generateCodingProblem(input) {
  let email;

  try {
    ({ email } = await requireUser());
    enforceRateLimit(`coding:${email}`, { limit: 10, windowMs: 60_000 });
  } catch (error) {
    return fail(error.message);
  }

  const difficulty = pickFromList(input?.difficulty, DIFFICULTIES, "Medium");
  const topic = pickFromList(input?.topic, CODE_TOPICS, CODE_TOPICS[0]);
  const language = pickFromList(input?.language, LANGUAGE_IDS, "javascript");
  const role = cleanString(input?.role ?? "", LIMITS.jobPosition) || "Software Engineer";

  const prompt = `You are setting one coding-round question for a ${role} interview.

Topic: ${topic}
Difficulty: ${difficulty}

Write an original problem (do not copy a well-known LeetCode problem verbatim) that a candidate can solve in 20-30 minutes.

Critical rules for the test cases:
- The candidate implements a single JavaScript function named exactly as "functionName".
- "args" is the argument list for one call, as a JSON array. If the function takes two arguments, "args" has two elements.
- "expected" is the exact return value, as JSON.
- Every expected value must be verifiable by deep equality. Do not use problems whose answer is a set with ambiguous ordering, unless you state the required ordering in the problem.
- Provide 5 to 8 test cases, including edge cases (empty input, single element, duplicates, negatives where relevant).
- Double-check each expected value by mentally running your own reference solution.

Respond with ONLY this JSON object:
{
  "title": "<short title>",
  "statement": "<the problem, in markdown, 3-8 sentences>",
  "functionName": "<camelCase JS function name>",
  "signature": "<e.g. function twoSum(nums, target) -> number[]>",
  "constraints": ["..."],
  "examples": [{ "input": "...", "output": "...", "explanation": "..." }],
  "hints": ["<hint 1>", "<hint 2>"],
  "testCases": [{ "args": [], "expected": null }],
  "starterCode": "<a JS function stub with the right signature and a TODO comment>"
}`;

  let result;
  try {
    result = await generateJson(prompt);
  } catch (error) {
    console.error("Coding problem generation failed:", error);
    return fail(error.message || "The AI could not generate a problem. Please try again.");
  }

  const functionName = cleanString(result?.functionName, 80);
  const testCases = Array.isArray(result?.testCases)
    ? result.testCases
        .slice(0, 10)
        .filter((test) => Array.isArray(test?.args))
        .map((test) => ({ args: test.args, expected: test.expected ?? null }))
    : [];

  const problem = {
    title: cleanString(result?.title, 200) || `${topic} challenge`,
    statement: cleanString(result?.statement, 4000),
    functionName,
    signature: cleanString(result?.signature, 300),
    constraints: cleanStringList(result?.constraints, { max: 8, itemLength: 200 }),
    examples: Array.isArray(result?.examples)
      ? result.examples.slice(0, 3).map((example) => ({
          input: cleanString(example?.input, 400),
          output: cleanString(example?.output, 400),
          explanation: cleanString(example?.explanation, 500),
        }))
      : [],
    hints: cleanStringList(result?.hints, { max: 3, itemLength: 300 }),
    testCases,
    starterCode: cleanCode(result?.starterCode, 3000),
    topic,
    difficulty,
  };

  if (!problem.statement || !functionName || testCases.length === 0) {
    return fail("The AI returned an incomplete problem. Please try again.");
  }

  if (!problem.starterCode) {
    problem.starterCode = `function ${functionName}(/* TODO: arguments */) {\n  // Write your solution here.\n}\n`;
  }

  const problemId = uuidv4();

  try {
    await db.insert(codingSessions).values({
      userEmail: email,
      problemId,
      title: problem.title,
      difficulty,
      language,
      problem: JSON.stringify(problem),
      code: problem.starterCode,
      testVerdict: "not-run",
    });
  } catch (error) {
    console.error("Could not save coding session:", error);
    return fail("Could not save the problem. Please try again.");
  }

  revalidatePath("/dashboard/coding");
  return { success: true, problemId, language, problem };
}

/** Persists the editor contents and the latest local test run. */
export async function saveCodeProgress({ problemId, code, language, testsPassed, testsTotal }) {
  let email;

  try {
    ({ email } = await requireUser());
    await loadOwnedSession(problemId, email);
  } catch (error) {
    return fail(error.message);
  }

  const passed = clampInt(testsPassed, { min: 0, max: 100, fallback: null });
  const total = clampInt(testsTotal, { min: 0, max: 100, fallback: null });

  try {
    await db
      .update(codingSessions)
      .set({
        code: cleanCode(code, LIMITS.code),
        language: pickFromList(language, LANGUAGE_IDS, "javascript"),
        testsPassed: passed,
        testsTotal: total,
        testVerdict:
          total === null ? "not-run" : passed === total && total > 0 ? "passed" : "failed",
      })
      .where(and(eq(codingSessions.problemId, problemId), eq(codingSessions.userEmail, email)));
  } catch (error) {
    console.error("Could not save code progress:", error);
    return fail("Could not save your code.");
  }

  return { success: true };
}

export async function reviewCode({ problemId, code, language, testsPassed, testsTotal }) {
  let email;
  let session;

  try {
    ({ email } = await requireUser());
    enforceRateLimit(`review:${email}`, { limit: 15, windowMs: 60_000 });
    session = await loadOwnedSession(problemId, email);
  } catch (error) {
    return fail(error.message);
  }

  const submitted = cleanCode(code, LIMITS.code);
  if (submitted.trim().length < 20) {
    return fail("Write a bit more code before asking for a review.");
  }

  const problem = parseProblem(session);
  if (!problem) return fail("This problem's data is corrupted. Generate a new one.");

  const chosenLanguage = pickFromList(language, LANGUAGE_IDS, session.language ?? "javascript");
  const runnable = CODE_LANGUAGES.find((entry) => entry.id === chosenLanguage)?.runnable;

  const testLine =
    runnable && Number.isInteger(testsPassed) && Number.isInteger(testsTotal)
      ? `The candidate's code passed ${testsPassed} of ${testsTotal} test cases when run.`
      : "The code was not executed against the test cases.";

  const prompt = `Act as a senior engineer reviewing a coding-round submission.

Problem: ${problem.title}
${problem.statement}

Language: ${chosenLanguage}
${testLine}

Candidate's code:
\`\`\`${chosenLanguage}
${submitted}
\`\`\`

Review it the way you would in a real interview debrief. Judge correctness first, then complexity, then readability. If the code does not actually solve the stated problem, say so plainly and score it low regardless of style.

Respond with ONLY this JSON object:
{
  "score": "<integer 1-10 as a string>",
  "verdict": "<one sentence: would this pass the round>",
  "correctness": "<does it solve the problem; name any failing case>",
  "timeComplexity": "<e.g. O(n)>",
  "spaceComplexity": "<e.g. O(1)>",
  "strengths": "<what was done well>",
  "improvements": "<specific changes, referencing lines or names>",
  "edgeCases": ["<edge case the code mishandles or does not cover>"],
  "optimalApproach": "<the approach a strong candidate would take, 3-6 sentences>"
}`;

  let result;
  try {
    result = await generateJson(prompt);
  } catch (error) {
    console.error("Code review failed:", error);
    return fail(error.message || "The AI could not review your code. Please try again.");
  }

  const rawScore = Number.parseFloat(result?.score);
  const score = Number.isFinite(rawScore)
    ? String(Math.min(10, Math.max(1, Math.round(rawScore))))
    : null;

  const review = {
    score,
    verdict: cleanString(result?.verdict, 500),
    correctness: cleanString(result?.correctness, 1500),
    timeComplexity: cleanString(result?.timeComplexity, 60),
    spaceComplexity: cleanString(result?.spaceComplexity, 60),
    strengths: cleanString(result?.strengths, 1500),
    improvements: cleanString(result?.improvements, 2000),
    edgeCases: cleanStringList(result?.edgeCases, { max: 6, itemLength: 300 }),
    optimalApproach: cleanString(result?.optimalApproach, 2500),
  };

  const passed = clampInt(testsPassed, { min: 0, max: 100, fallback: null });
  const total = clampInt(testsTotal, { min: 0, max: 100, fallback: null });

  try {
    await db
      .update(codingSessions)
      .set({
        code: submitted,
        language: chosenLanguage,
        reviewScore: score,
        review: JSON.stringify(review),
        testsPassed: passed,
        testsTotal: total,
        testVerdict:
          total === null ? "not-run" : passed === total && total > 0 ? "passed" : "failed",
      })
      .where(and(eq(codingSessions.problemId, problemId), eq(codingSessions.userEmail, email)));
  } catch (error) {
    console.error("Could not save code review:", error);
  }

  revalidatePath("/dashboard/coding");
  return { success: true, ...review };
}

export async function getCodingSession(problemId) {
  const { email } = await requireUser();
  const row = await loadOwnedSession(problemId, email);

  let review = null;
  try {
    review = row.review ? JSON.parse(row.review) : null;
  } catch {
    review = null;
  }

  return {
    problemId: row.problemId,
    language: row.language,
    code: row.code,
    testsPassed: row.testsPassed,
    testsTotal: row.testsTotal,
    testVerdict: row.testVerdict,
    problem: parseProblem(row),
    review,
  };
}

export async function getCodingHistory() {
  const { email } = await requireUser();

  return db
    .select({
      problemId: codingSessions.problemId,
      title: codingSessions.title,
      difficulty: codingSessions.difficulty,
      language: codingSessions.language,
      testVerdict: codingSessions.testVerdict,
      testsPassed: codingSessions.testsPassed,
      testsTotal: codingSessions.testsTotal,
      reviewScore: codingSessions.reviewScore,
      createdat: codingSessions.createdat,
    })
    .from(codingSessions)
    .where(eq(codingSessions.userEmail, email))
    .orderBy(desc(codingSessions.id))
    .limit(20);
}

export async function deleteCodingSession(problemId) {
  let email;

  try {
    ({ email } = await requireUser());
    await loadOwnedSession(problemId, email);
  } catch (error) {
    return fail(error.message);
  }

  await db
    .delete(codingSessions)
    .where(and(eq(codingSessions.problemId, problemId), eq(codingSessions.userEmail, email)));

  revalidatePath("/dashboard/coding");
  return { success: true };
}
