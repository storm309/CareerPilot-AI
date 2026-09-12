"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal tab strip.
 *
 * Radix Tabs is not installed and this needs nothing it offers: the panels are
 * rendered by the caller, and roving focus across a handful of buttons is
 * cheaper to do here than to pull in another dependency.
 */
export function TabList({ tabs, value, onChange, className, label }) {
  const refs = React.useRef([]);

  const move = (event) => {
    const index = tabs.findIndex((tab) => tab.value === value);
    if (index === -1) return;

    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;

    event.preventDefault();
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={move}
      className={cn("flex items-center gap-1 border-b border-border px-2", className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        const Icon = tab.icon;

        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors",
              selected
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon ? <Icon className={cn("h-4 w-4", tab.iconClassName)} aria-hidden /> : null}
            {tab.label}
            {tab.badge != null ? (
              <span className="ml-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                {tab.badge}
              </span>
            ) : null}
            {selected ? (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ value, activeValue, className, children }) {
  if (value !== activeValue) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn("focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
