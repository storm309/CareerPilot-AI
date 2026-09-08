import React from "react";

import planData from "@/utils/planData";
import PlanItemCard from "./_components/PlanItemCard";

export const metadata = {
  title: "Upgrade",
  description: "Compare the free and monthly CareerPilot AI plans.",
};

function Upgrade() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
        <p className="mt-2 text-muted-foreground">
          Start free. Upgrade when you want resume-tailored questions and priority support.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
        {planData.map((plan) => (
          <PlanItemCard plan={plan} key={plan.id} />
        ))}
      </div>

      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>Payments and questions are handled over WhatsApp:</p>
        <a
          href="https://wa.me/918252980774"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-1 inline-block text-lg font-bold text-primary underline-offset-4 hover:underline"
        >
          +91 82529 80774
        </a>
      </div>
    </div>
  );
}

export default Upgrade;
