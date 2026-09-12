/**
 * Delivery metrics for a spoken answer.
 *
 * Deliberately not `server-only`: the browser computes these from the live
 * transcript so the candidate sees pace feedback while they talk, and the
 * server re-derives them to clamp what actually gets stored.
 */

const FILLER_PHRASES = [
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "or something",
  "and stuff",
  "basically",
  "actually",
  "literally",
  "honestly",
  "obviously",
  "umm",
  "uhh",
  "hmm",
  "like",
  "right",
  "okay",
  "yeah",
  "so",
  "um",
  "uh",
  "er",
  "ah",
];

// Hinglish speakers reach for these the way English speakers reach for "um".
const HINGLISH_FILLERS = ["matlab", "yaar", "achha", "haan", "toh", "bas", "waise"];

// Longest phrase first, so "you know" is consumed before "know" could be.
const FILLER_TOKENS = [...FILLER_PHRASES, ...HINGLISH_FILLERS]
  .map((phrase) => ({ phrase, words: phrase.split(" ") }))
  .sort((a, b) => b.words.length - a.words.length);

const STAR_SIGNALS = {
  situation: [
    "when i", "at my", "we were", "the project", "the team", "context", "back at",
    "during", "our company", "the client", "at the time",
  ],
  task: [
    "my job", "i was responsible", "i had to", "my role", "the goal", "we needed",
    "i was asked", "the requirement", "assigned", "i owned",
  ],
  action: [
    "i built", "i designed", "i implemented", "i wrote", "i refactored", "i led",
    "i decided", "i migrated", "i set up", "i debugged", "i proposed", "so i",
    "i reviewed", "i tested", "i added",
  ],
  result: [
    "as a result", "reduced", "increased", "improved", "shipped", "saved",
    "cut down", "went from", "we hit", "grew", "dropped", "percent", "%",
    "faster", "outcome",
  ],
};

export const PACE_BAND = { slow: 110, fast: 170 };

export function countWords(text) {
  const trimmed = String(text ?? "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Scans the word list rather than running a regex per filler.
 *
 * Token matching is exact by construction - "so" can never fire inside
 * "software" - and consecutive fillers ("so um, basically") are all counted,
 * which an overlapping global regex would have missed.
 */
export function countFillers(text) {
  const tokens = tokenize(text);
  const breakdown = {};
  let total = 0;

  for (let index = 0; index < tokens.length; ) {
    const hit = FILLER_TOKENS.find(({ words }) =>
      words.every((word, offset) => tokens[index + offset] === word)
    );

    if (hit) {
      breakdown[hit.phrase] = (breakdown[hit.phrase] ?? 0) + 1;
      total += 1;
      index += hit.words.length;
    } else {
      index += 1;
    }
  }

  return { total, breakdown };
}

export function analyzeStar(text) {
  const haystack = String(text ?? "").toLowerCase();
  const covered = {};

  for (const [part, signals] of Object.entries(STAR_SIGNALS)) {
    covered[part] = signals.some((signal) => haystack.includes(signal));
  }

  return {
    covered,
    score: Object.values(covered).filter(Boolean).length,
    outOf: 4,
  };
}

export function paceVerdict(wordsPerMinute) {
  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) return "unknown";
  if (wordsPerMinute < PACE_BAND.slow) return "slow";
  if (wordsPerMinute > PACE_BAND.fast) return "fast";
  return "good";
}

/**
 * Builds the full delivery payload. `spokenSeconds` is only known when the
 * answer was actually recorded - a typed answer has no pace to report, and is
 * not penalised for lacking one.
 */
export function buildDeliveryMetrics(text, spokenSeconds) {
  const words = countWords(text);
  const fillers = countFillers(text);
  const star = analyzeStar(text);

  const seconds =
    Number.isFinite(spokenSeconds) && spokenSeconds > 0 ? Math.round(spokenSeconds) : null;
  const wordsPerMinute = seconds ? Math.round((words / seconds) * 60) : null;

  return {
    words,
    seconds,
    wordsPerMinute,
    pace: paceVerdict(wordsPerMinute),
    fillerCount: fillers.total,
    // Per 100 words, so a long answer is not penalised for its length alone.
    fillerRate: words > 0 ? Number(((fillers.total / words) * 100).toFixed(1)) : 0,
    fillerBreakdown: fillers.breakdown,
    star,
  };
}

/** 0-10, combining filler density, pace and STAR coverage. */
export function deliveryScore(metrics) {
  if (!metrics) return null;

  let score = 10;

  // Filler density: nothing comes off below 3 per 100 words, then 1 point each.
  score -= Math.min(4, Math.max(0, metrics.fillerRate - 3));

  if (metrics.pace === "slow" || metrics.pace === "fast") score -= 1.5;

  // Each missing STAR element costs a point, capped at 3.
  score -= Math.min(3, 4 - metrics.star.score);

  // A 30-word answer is not a complete one, however cleanly it was delivered.
  if (metrics.words < 40) score -= 2;
  else if (metrics.words < 70) score -= 1;

  return Number(Math.min(10, Math.max(1, score)).toFixed(1));
}

export const DELIVERY_TIPS = {
  slow: "You're speaking below ~110 words a minute. A little more energy reads as confidence.",
  fast: "You're above ~170 words a minute. Slow down - interviewers need time to follow you.",
  good: "Your pace is in the natural conversational band.",
  unknown: "Record your answer instead of typing it to get pace feedback.",
};
