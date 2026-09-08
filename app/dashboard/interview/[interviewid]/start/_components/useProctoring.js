"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_VIOLATIONS = 3;

// Browsers fire `visibilitychange` while their own permission chrome is up, and
// leaving fullscreen is reported a tick before the new state settles. A short
// grace window after each transition keeps those from being logged as cheating.
const GRACE_MS = 1500;

/**
 * Screen-share + fullscreen + tab-focus proctoring for the interview run.
 *
 * `start()` must be called from a click. getDisplayMedia and requestFullscreen
 * both require transient user activation, so the previous version - which fired
 * them from a mount effect - was rejected every time and immediately logged the
 * rejection as the candidate's first violation.
 */
export function useProctoring({ enabled = true, onViolation, onTerminate } = {}) {
  const [status, setStatus] = useState("idle"); // idle | active | stopped
  const [violations, setViolations] = useState(0);

  const streamRef = useRef(null);
  const graceUntilRef = useRef(0);
  const violationsRef = useRef(0);
  const terminatedRef = useRef(false);
  const callbacksRef = useRef({ onViolation, onTerminate });

  // Keep the latest callbacks without re-subscribing the listeners each render.
  useEffect(() => {
    callbacksRef.current = { onViolation, onTerminate };
  }, [onViolation, onTerminate]);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stop = useCallback(() => {
    releaseStream();
    setStatus("stopped");

    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [releaseStream]);

  const registerViolation = useCallback(
    (reason) => {
      if (terminatedRef.current) return;
      if (Date.now() < graceUntilRef.current) return;

      graceUntilRef.current = Date.now() + GRACE_MS;
      violationsRef.current += 1;
      const count = violationsRef.current;
      setViolations(count);

      if (count >= MAX_VIOLATIONS) {
        terminatedRef.current = true;
        stop();
        callbacksRef.current.onTerminate?.(reason);
      } else {
        callbacksRef.current.onViolation?.(reason, count, MAX_VIOLATIONS);
      }
    },
    [stop]
  );

  const start = useCallback(async () => {
    if (!enabled) return { ok: true, proctored: false };

    if (!navigator?.mediaDevices?.getDisplayMedia) {
      return { ok: false, error: "This browser cannot share your screen. Try Chrome or Edge on a desktop." };
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });
    } catch (error) {
      console.warn("Screen share declined:", error?.name);
      return {
        ok: false,
        error:
          error?.name === "NotAllowedError"
            ? "Screen sharing was declined. It is required for a proctored interview."
            : "Screen sharing could not be started on this device.",
      };
    }

    streamRef.current = stream;

    // Ending the share from the browser's own bar is a violation, not a silent exit.
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        streamRef.current = null;
        registerViolation("Screen sharing was stopped.");
      });
    });

    try {
      await document.documentElement.requestFullscreen?.();
    } catch (error) {
      // Not fatal: some browsers and window managers refuse fullscreen outright.
      console.warn("Fullscreen request failed:", error?.name);
    }

    graceUntilRef.current = Date.now() + GRACE_MS;
    setStatus("active");

    return { ok: true, proctored: true };
  }, [enabled, registerViolation]);

  useEffect(() => {
    if (status !== "active") return undefined;

    const handleVisibility = () => {
      if (document.hidden) registerViolation("Switching tabs or windows is not allowed.");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) registerViolation("Leaving fullscreen is not allowed.");
    };

    const handleBlur = () => {
      // Only treat focus loss as a violation while the page is still visible;
      // a hidden page is already covered by the visibility handler.
      if (!document.hidden) registerViolation("The interview window lost focus.");
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [status, registerViolation]);

  // Leaving the page must release the screen-share track. The old code never
  // stopped it, so the browser's "sharing your screen" bar stayed up until the
  // whole tab was closed.
  useEffect(() => releaseStream, [releaseStream]);

  return {
    status,
    violations,
    maxViolations: MAX_VIOLATIONS,
    start,
    stop,
    isActive: status === "active",
  };
}
