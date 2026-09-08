import "server-only";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

// The key must stay server-side. A NEXT_PUBLIC_ prefix inlines it into the
// browser bundle, where anyone can read it out of the page source and spend
// the project's quota.
const apiKey = process.env.GEMINI_API_KEY;

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let cachedModel = null;

function getModel() {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (server-side only)."
    );
  }

  if (!cachedModel) {
    cachedModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: MODEL_NAME,
    });
  }

  return cachedModel;
}

const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

/**
 * Pulls a JSON value out of a model response.
 *
 * Even with responseMimeType set to application/json the model occasionally
 * wraps its output in a markdown fence or prefixes a sentence, so fall back to
 * slicing out the outermost balanced object/array before giving up.
 */
export function extractJson(raw) {
  if (typeof raw !== "string") return null;

  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    // fall through to the balanced-scan below
  }

  const start = text.search(/[[{]/);
  if (start === -1) return null;

  const opener = text[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === opener) depth++;
    else if (char === closer && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Sends one prompt to Gemini and returns parsed JSON.
 *
 * Each call gets its own chat session. The previous implementation shared a
 * single module-level session across every user of the server, so one person's
 * resume and answers leaked into the context of the next person's questions.
 */
export async function generateJson(prompt, { retries = 1 } = {}) {
  const model = getModel();
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });

      const raw = result.response.text();
      const parsed = extractJson(raw);

      if (parsed !== null) return parsed;

      lastError = new Error("The AI returned a response that was not valid JSON.");
      console.error("Gemini returned unparseable output:", raw?.slice(0, 500));
    } catch (error) {
      lastError = error;
      console.error(`Gemini request failed (attempt ${attempt + 1}):`, error?.message);

      // Bad key / disabled API / quota exhausted will not fix themselves.
      const message = String(error?.message || "");
      if (/API key|PERMISSION_DENIED|API_KEY_INVALID/i.test(message)) break;
    }
  }

  throw lastError ?? new Error("The AI service is unavailable. Please try again.");
}
