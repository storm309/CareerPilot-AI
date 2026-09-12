import "server-only";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

let cached = null;

/**
 * Builds the Gemini client, reading configuration at call time.
 *
 * The key and model name are deliberately NOT captured at module scope. Next.js
 * evaluates server modules once and keeps them alive across hot reloads, so a
 * module-level `const apiKey = process.env.GEMINI_API_KEY` freezes whatever was
 * set when the module first loaded - editing .env.local then leaves the process
 * insisting the key is missing until the whole server is restarted.
 *
 * The key must also stay server-side. A NEXT_PUBLIC_ prefix would inline it
 * into the browser bundle, where anyone can read it out of the page source and
 * spend the project's quota.
 */
function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local (server-side only).");
  }

  // Rebuild whenever the configuration actually changed.
  if (!cached || cached.apiKey !== apiKey || cached.modelName !== modelName) {
    cached = {
      apiKey,
      modelName,
      model: new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName }),
    };
  }

  return cached.model;
}

const generationConfig = {
  temperature: 0.9,
  topP: 0.95,
  topK: 64,
  // Gemini 2.5 is a thinking model and its internal reasoning tokens are
  // charged against this same budget. At 8192 a hard problem spent ~7900 on
  // reasoning and had ~300 left for the answer, so the JSON came back
  // truncated mid-string. 2.5 Flash allows up to 65536.
  maxOutputTokens: 32768,
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
 * Escapes raw control characters that the model left inside JSON string values.
 *
 * Even with responseMimeType set to application/json, Gemini occasionally emits
 * a literal newline inside a string - `"output": "2` then a line break - which
 * is invalid JSON and kills the whole response. Walking the text and escaping
 * those in place recovers the payload instead of discarding a good answer over
 * one stray character.
 */
export function repairJsonStrings(text) {
  const ESCAPES = { "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f" };

  let out = "";
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (escaped) {
      out += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inString) {
      out += char;
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      out += char;
      continue;
    }

    if (inString && char in ESCAPES) {
      out += ESCAPES[char];
      continue;
    }

    // Any other C0 control character is illegal inside a JSON string.
    if (inString && char < " ") continue;

    out += char;
  }

  return out;
}

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
    // fall through to repair, then the balanced scan below
  }

  try {
    return JSON.parse(repairJsonStrings(text));
  } catch {
    // fall through to the balanced scan below
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
      const slice = text.slice(start, i + 1);
      try {
        return JSON.parse(slice);
      } catch {
        try {
          return JSON.parse(repairJsonStrings(slice));
        } catch {
          return null;
        }
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
export async function generateJson(prompt, { retries = 2 } = {}) {
  const model = getModel();
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });

      // A truncated response is not a parsing problem, and saying so makes the
      // difference between a useful retry and a confusing error.
      const finishReason = result.response.candidates?.[0]?.finishReason;

      if (finishReason === "MAX_TOKENS") {
        lastError = new Error("The AI ran out of room before finishing. Please try again.");
        console.error(
          "Gemini hit MAX_TOKENS.",
          `thoughts=${result.response.usageMetadata?.thoughtsTokenCount ?? "?"}`,
          `output=${result.response.usageMetadata?.candidatesTokenCount ?? "?"}`
        );
        continue;
      }

      if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        throw new Error(
          "The AI declined to answer that. Try rewording the job description or topic."
        );
      }

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
