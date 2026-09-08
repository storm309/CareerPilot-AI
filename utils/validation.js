import "server-only";

export const INTERVIEW_TYPES = ["Technical", "HR", "Mixed", "System Design"];
export const DIFFICULTIES = ["Easy", "Medium", "Hard"];
export const QUESTION_COUNTS = [3, 5, 8, 10];

export const LIMITS = {
  jobPosition: 200,
  jobDescription: 5000,
  resumeText: 8000,
  answer: 8000,
  prepText: 6000,
};

export function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  // Strip control characters that break both the prompt and the JSON round-trip.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maxLength);
}

export function requireString(value, { field, min = 1, max = 1000 }) {
  const cleaned = cleanString(value, max);

  if (cleaned.length < min) {
    throw new Error(
      min === 1
        ? `${field} is required.`
        : `${field} must be at least ${min} characters.`
    );
  }

  return cleaned;
}

export function pickFromList(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function clampExperience(value) {
  const years = Number.parseInt(value, 10);
  if (Number.isNaN(years)) throw new Error("Years of experience must be a number.");
  return String(Math.min(50, Math.max(0, years)));
}
