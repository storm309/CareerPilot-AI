"use client";

/**
 * Runs the candidate's JavaScript against the generated test cases.
 *
 * The code executes inside a Web Worker built from a blob URL, not on the main
 * thread. That buys two things: an infinite loop cannot freeze the page (the
 * worker is terminated on timeout), and the code has no access to the DOM, to
 * React state, or to the Clerk session in this tab.
 */

const WORKER_SOURCE = `
function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every(function (item, index) { return deepEqual(item, b[index]); });
  }

  if (typeof a === 'object') {
    var keysA = Object.keys(a);
    var keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(function (key) {
      return Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]);
    });
  }

  // Floating point results should not fail on representation noise alone.
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }

  return false;
}

function preview(value) {
  try {
    var text = JSON.stringify(value);
    if (text === undefined) return String(value);
    return text.length > 300 ? text.slice(0, 300) + '...' : text;
  } catch (error) {
    return String(value);
  }
}

self.onmessage = function (event) {
  var payload = event.data || {};
  var code = payload.code;
  var functionName = payload.functionName;
  var testCases = payload.testCases || [];
  var logs = [];

  // A working console for the candidate, injected as a parameter rather than
  // assigned onto the global. Shadowing it this way keeps the capture
  // deterministic and leaves the worker's own globals untouched.
  var sandboxConsole = {
    log: function () {
      if (logs.length < 50) {
        // Plain strings print as-is; everything else is JSON so objects and
        // arrays are actually readable.
        logs.push(
          Array.prototype.map
            .call(arguments, function (value) {
              return typeof value === 'string' ? value : preview(value);
            })
            .join(' ')
        );
      }
    },
    error: function () {},
    warn: function () {},
    info: function () {},
    table: function () {},
  };

  // Compile the candidate's code on its own first. Appending the lookup line
  // before checking would blame their syntax error on our own trailing
  // 'return typeof ...', which reads as nonsense.
  try {
    new Function('console', code);
  } catch (error) {
    self.postMessage({
      error: 'Your code has a syntax error: ' + (error && error.message),
      logs: logs,
    });
    return;
  }

  var solve;
  try {
    var factory = new Function(
      'console',
      code + '\\n;return typeof ' + functionName + ' === "function" ? ' + functionName + ' : undefined;'
    );
    solve = factory(sandboxConsole);
  } catch (error) {
    self.postMessage({ error: 'Your code did not run: ' + (error && error.message), logs: logs });
    return;
  }

  if (typeof solve !== 'function') {
    self.postMessage({
      error: 'No function named "' + functionName + '" was found. Keep that exact name.',
      logs: logs,
    });
    return;
  }

  var results = [];

  for (var index = 0; index < testCases.length; index++) {
    var test = testCases[index];
    try {
      // Arguments are cloned per run so a solution that mutates its input
      // cannot corrupt a later test case.
      var args = JSON.parse(JSON.stringify(test.args));
      var actual = solve.apply(null, args);
      results.push({
        index: index,
        args: preview(test.args),
        expected: preview(test.expected),
        actual: preview(actual),
        passed: deepEqual(actual, test.expected),
      });
    } catch (error) {
      results.push({
        index: index,
        args: preview(test.args),
        expected: preview(test.expected),
        actual: 'threw: ' + (error && error.message),
        passed: false,
      });
    }
  }

  self.postMessage({ results: results, logs: logs });
};
`;

const TIMEOUT_MS = 5000;

export function runJavaScriptTests({ code, functionName, testCases }) {
  return new Promise((resolve) => {
    let worker;
    let url;
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
      resolve(value);
    };

    // An infinite loop never posts back, so the main thread owns the deadline.
    const timer = setTimeout(() => {
      finish({
        error: `Your code ran for over ${TIMEOUT_MS / 1000} seconds and was stopped. Check for an infinite loop.`,
        results: [],
        logs: [],
      });
    }, TIMEOUT_MS);

    try {
      url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
      worker = new Worker(url);

      worker.onmessage = (event) =>
        finish({ results: [], logs: [], error: null, ...event.data });

      worker.onerror = (event) =>
        finish({ error: event.message || "Your code crashed.", results: [], logs: [] });
    } catch (error) {
      finish({
        error: "This browser could not start the code sandbox.",
        results: [],
        logs: [],
      });
    }
  });
}
