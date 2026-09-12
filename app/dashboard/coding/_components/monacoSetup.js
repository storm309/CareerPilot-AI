"use client";

import { loader } from "@monaco-editor/react";

// Monaco's own bundle is ~24MB unminified-by-language, far too large to serve
// from /public, so it is fetched from a CDN at runtime. The version is pinned
// rather than left to the loader's default: an unpinned editor can change API
// behaviour under us without a single line of this repo changing.
const MONACO_VERSION = "0.52.2";

let configured = false;

export function configureMonaco() {
  if (configured) return;
  configured = true;

  loader.config({
    paths: { vs: `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs` },
  });
}

/** Editor options shared by every language, tuned for a timed coding round. */
export const EDITOR_OPTIONS = {
  fontSize: 13,
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  tabSize: 2,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  smoothScrolling: true,
  cursorBlinking: "smooth",
  renderLineHighlight: "gutter",
  // The candidate is writing, not exploring a codebase - suggestions that pop
  // over the next line are a distraction under time pressure.
  quickSuggestions: false,
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
};
