/**
 * Integration test for runJavaScriptTests.
 *
 * The earlier test poked the worker's onmessage handler directly, which skipped
 * the very step that was broken: nothing ever called worker.postMessage, so the
 * worker waited forever and every run was reported as an infinite loop.
 *
 * This shims Blob / URL / Worker on top of node:worker_threads, so the sandbox
 * really does run off the main thread. That matters: a same-thread shim cannot
 * test the timeout at all, because `while (true) {}` would block the very event
 * loop the timer lives on.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker as ThreadWorker } from "node:worker_threads";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const blobs = new Map();
let nextId = 0;

globalThis.Blob = class Blob {
  constructor(parts) {
    this.source = parts.join("");
  }
};

globalThis.URL = {
  createObjectURL(blob) {
    const url = `blob:${nextId++}`;
    blobs.set(url, blob.source);
    return url;
  },
  revokeObjectURL(url) {
    blobs.delete(url);
  },
};

globalThis.Worker = class BrowserWorkerShim {
  constructor(url) {
    const body = blobs.get(url);

    // Bridge the browser worker API onto the Node thread API.
    const bootstrap = `
      const { parentPort } = require("node:worker_threads");
      const self = {
        onmessage: null,
        postMessage: (data) => parentPort.postMessage(data),
      };
      ${body}
      parentPort.on("message", (data) => { self.onmessage && self.onmessage({ data }); });
    `;

    this.thread = new ThreadWorker(bootstrap, { eval: true });
    this.onmessage = null;
    this.onerror = null;

    this.thread.on("message", (data) => this.onmessage?.({ data }));
    this.thread.on("error", (error) => this.onerror?.({ message: error.message }));
    this.thread.unref();
  }

  postMessage(data) {
    this.thread.postMessage(data);
  }

  terminate() {
    this.thread.terminate();
  }
};

const tmp = path.join(ROOT, "__runtests_under_test.mjs");
fs.writeFileSync(
  tmp,
  fs
    .readFileSync(path.join(ROOT, "app/dashboard/coding/_components/runTests.js"), "utf8")
    .replace('"use client";', "")
);

let allPass = true;
const check = (label, condition, detail = "") => {
  if (!condition) allPass = false;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};

try {
  const { runJavaScriptTests } = await import("file://" + tmp.replace(/\\/g, "/"));

  // Verbatim from the screenshot.
  const userCode = `function countPrefixMatches(words, prefix) {
  let count = 0;

  for (const word of words) {
    if (word.startsWith(prefix)) {
      count++;
    }
  }

  return count;
}`;

  const testCases = [
    { args: [["apple", "apricot", "banana"], "ap"], expected: 2 },
    { args: [["cat", "dog", "cow"], "co"], expected: 1 },
    { args: [["hello", "world"], "hi"], expected: 0 },
    { args: [[], "a"], expected: 0 },
  ];

  const started = Date.now();
  const run = await runJavaScriptTests({
    code: userCode,
    functionName: "countPrefixMatches",
    testCases,
  });
  const ms = Date.now() - started;

  check("correct solution returns results", !run.error, run.error ?? "");
  check("finished fast, not on the timeout", ms < 2000, `${ms}ms`);
  check(
    "all four cases pass",
    run.results?.length === 4 && run.results.every((r) => r.passed),
    run.results?.map((r) => `${r.actual}/${r.expected}`).join(" ")
  );

  const wrong = await runJavaScriptTests({
    code: "function countPrefixMatches() { return 99; }",
    functionName: "countPrefixMatches",
    testCases,
  });
  check("wrong answer reported per case", !wrong.error && wrong.results.every((r) => !r.passed));

  const missing = await runJavaScriptTests({
    code: "function somethingElse() {}",
    functionName: "countPrefixMatches",
    testCases,
  });
  check("missing function named clearly", /No function named/.test(missing.error ?? ""));

  const broken = await runJavaScriptTests({
    code: "function countPrefixMatches( {",
    functionName: "countPrefixMatches",
    testCases,
  });
  check("syntax error reported as such", /syntax error/i.test(broken.error ?? ""));

  const logged = await runJavaScriptTests({
    code: "function countPrefixMatches(w) { console.log('seen', w.length); return 0; }",
    functionName: "countPrefixMatches",
    testCases: [{ args: [["a", "b"], "a"], expected: 0 }],
  });
  check("console.log captured", logged.logs?.[0] === "seen 2", JSON.stringify(logged.logs));

  const loopStart = Date.now();
  const looped = await runJavaScriptTests({
    code: "function countPrefixMatches() { while (true) {} }",
    functionName: "countPrefixMatches",
    testCases: testCases.slice(0, 1),
  });
  check(
    "real infinite loop still caught",
    /infinite loop/.test(looped.error ?? ""),
    `${Date.now() - loopStart}ms`
  );

  console.log("\n" + (allPass ? "ALL CHECKS PASS" : "SOME CHECKS FAILED"));
} finally {
  fs.rmSync(tmp, { force: true });
}

process.exit(allPass ? 0 : 1);
