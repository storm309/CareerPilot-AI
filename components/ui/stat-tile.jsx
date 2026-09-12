import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The dashboard's numeric tile.
 *
 * Caption in mono uppercase, value in tabular figures so a column of tiles
 * lines up digit for digit rather than jittering as numbers change.
 */
export function StatTile({ label, value, suffix, hint, icon: Icon, tone, className }) {
  const isEmpty = value === null || value === undefined || value === "";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon ? <Icon className={cn("h-4 w-4", tone ?? "text-muted-foreground")} aria-hidden /> : null}
        <span className="mono-label text-muted-foreground">{label}</span>
      </div>

      <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {isEmpty ? <span className="text-muted-foreground">--</span> : value}
        {!isEmpty && suffix ? (
          <span className="ml-0.5 text-sm font-normal text-muted-foreground">{suffix}</span>
        ) : null}
      </p>

      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function StatTileGrid({ children, className }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5", className)}>
      {children}
    </div>
  );
}
