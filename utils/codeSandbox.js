import "server-only";
import vm from "node:vm";

/**
 * Runs a generated reference solution against its own test cases.
 *
 * This exists to catch the single worst failure mode of an AI-authored
 * problem: a test case whose "expected" value is simply wrong. Without it, a
 * candidate writes a correct solution and is told Wrong Answer.
 *
 * IMPORTANT: this is for OUR generated reference solutions only. Never run
 * candidate-submitted code through here - `node:vm` is an isolation boundary,
 * not a security boundary, and it shares the server process. Candidate code
 * runs in the browser's Web Worker instead
 * (app/dashboard/coding/_components/runTests.js).
 */

const TIMEOUT_MS = 2000;

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;

  if (typeof a === "number" && typeof b === "number") {
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9;
  }

  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;

  // Array.isArray and Object.keys both work across vm realms, which matters
  // because the values below were constructed inside the sandbox.
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  return keysA.every(
    (key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key])
  );
}

/**
 * @returns {{ ok: boolean, reason?: string, failures: number[], ran: number }}
 */
export function verifyReferenceSolution({ code, functionName, testCases }) {
  if (!code || !functionName || !Array.isArray(testCases) || testCases.length === 0) {
    return { ok: false, reason: "nothing to verify", failures: [], ran: 0 };
  }

  // A bare context: no require, no process, no fetch, no timers. The test
  // arguments go in as data.
  const context = vm.createContext({
    __tests: structuredClone(testCases.map((test) => test.args)),
    __results: null,
  });

  // Every call happens INSIDE this one script. Pulling the function out and
  // invoking it from the host would run it without the timeout, so a reference
  // solution containing `while (true) {}` would hang the whole server process.
  const script = `
    ${code}
    ;
    if (typeof ${functionName} !== "function") {
      __results = { missing: true };
    } else {
      __results = __tests.map(function (args) {
        try {
          // Clone per call so a solution that mutates its input cannot
          // corrupt a later case.
          return { ok: true, value: ${functionName}.apply(null, JSON.parse(JSON.stringify(args))) };
        } catch (error) {
          return { ok: false, error: String(error && error.message) };
        }
      });
    }
  `;

  try {
    vm.runInContext(script, context, { timeout: TIMEOUT_MS });
  } catch (error) {
    const timedOut = error?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT";
    return {
      ok: false,
      reason: timedOut
        ? `reference solution did not finish within ${TIMEOUT_MS}ms`
        : `reference did not run: ${error.message}`,
      failures: [],
      ran: 0,
    };
  }

  const results = context.__results;

  if (!results || results.missing) {
    return { ok: false, reason: `reference does not define ${functionName}`, failures: [], ran: 0 };
  }

  const failures = [];
  let ran = 0;

  for (const [index, outcome] of results.entries()) {
    if (!outcome.ok) {
      failures.push(index);
      continue;
    }

    ran += 1;
    if (!deepEqual(outcome.value, testCases[index].expected)) failures.push(index);
  }

  return {
    ok: failures.length === 0,
    reason: failures.length
      ? `${failures.length} of ${testCases.length} expected values are wrong`
      : undefined,
    failures,
    ran,
  };
}
