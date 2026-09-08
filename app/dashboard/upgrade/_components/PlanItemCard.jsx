"use client";

import { Check, X } from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function PlanItemCard({ plan }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8",
        plan.highlighted ? "border-primary ring-1 ring-primary" : "border-border"
      )}
    >
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {plan.highlighted ? <Badge>Most popular</Badge> : null}
        </div>
        <p className="mt-4">
          <strong className="text-4xl font-bold tabular-nums">&#8377;{plan.cost}</strong>
          <span className="text-sm font-medium text-muted-foreground"> /month</span>
        </p>
        {plan.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
        ) : null}
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.offering.map((item) => (
          <li key={item.value} className="flex items-start gap-2 text-sm">
            {item.included ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
            )}
            <span className={cn(!item.included && "text-muted-foreground/70 line-through")}>
              {item.value}
            </span>
            <span className="sr-only">{item.included ? "included" : "not included"}</span>
          </li>
        ))}
      </ul>

      {plan.paymentLink ? (
        <a
          href={plan.paymentLink}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-8 block rounded-full bg-primary px-8 py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Upgrade via WhatsApp
        </a>
      ) : (
        <span className="mt-8 block rounded-full border border-border px-8 py-3 text-center text-sm font-medium text-muted-foreground">
          Your current plan
        </span>
      )}
    </div>
  );
}

export default PlanItemCard;
