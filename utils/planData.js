const plans = [
  {
    id: "free",
    name: "Free",
    cost: 0,
    description: "Everything you need to rehearse a role.",
    offering: [
      { value: "AI-generated interviews from any job description", included: true },
      { value: "Unlimited retakes with per-attempt history", included: true },
      { value: "Scored feedback on every answer", included: true },
      { value: "Grammar checker and email writer", included: true },
      { value: "Resume-tailored questions", included: false },
      { value: "Priority email support", included: false },
    ],
  },
  {
    id: "monthly",
    name: "Monthly",
    cost: 299,
    highlighted: true,
    description: "For candidates actively interviewing.",
    paymentLink:
      "https://wa.me/918252980774?text=Hello,%20I%20want%20to%20upgrade%20to%20the%20Monthly%20Plan.",
    offering: [
      { value: "AI-generated interviews from any job description", included: true },
      { value: "Unlimited retakes with per-attempt history", included: true },
      { value: "Scored feedback on every answer", included: true },
      { value: "Grammar checker and email writer", included: true },
      { value: "Resume-tailored questions", included: true },
      { value: "Priority email support", included: true },
    ],
  },
];

export default plans;
