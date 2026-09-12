import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The CareerPilot mark: a compass needle inside a rounded badge.
 *
 * Drawn as inline SVG rather than shipped as an image so it stays crisp at
 * every size, costs no network request, and renders identically in both
 * themes. The previous asset was a 329KB JPEG named `.png` - it had no
 * transparency, which is why it needed a `dark:invert` hack that turned the
 * navy blue orange in dark mode, and it was unreadable at favicon size.
 */
export function LogoMark({ className, title }) {
  // Gradient ids must be unique per instance, or a second copy on the same page
  // reuses the first one's definition.
  const id = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 32 32"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={`${id}-badge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f1b2d" />
          <stop offset="100%" stopColor="#0a1220" />
        </linearGradient>
        <linearGradient id={`${id}-needle`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="8" fill={`url(#${id}-badge)`} />
      <rect
        x="0.75"
        y="0.75"
        width="30.5"
        height="30.5"
        rx="7.25"
        fill="none"
        stroke="#22d3ee"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />

      {/* Compass needle, also readable as an upward trajectory. The two tones
          are the classic north/south split. */}
      <path d="M16 5.5 L23.8 25.5 L16 21 Z" fill={`url(#${id}-needle)`} />
      <path d="M16 5.5 L16 21 L8.2 25.5 Z" fill="#22d3ee" fillOpacity="0.42" />
    </svg>
  );
}

/**
 * Full lockup: mark plus wordmark.
 *
 * The wordmark is real text in the app's own font, not baked into an image, so
 * it stays sharp on any display and inherits the current colour.
 */
export function Logo({ className, markClassName, showWordmark = true, title }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} title={showWordmark ? undefined : title} />
      {showWordmark ? (
        <span className="text-[15px] font-bold leading-none tracking-tight">
          CareerPilot<span className="text-primary"> AI</span>
        </span>
      ) : null}
    </span>
  );
}

export default Logo;
