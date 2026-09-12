const plans = [
  {
    id: "free",
    name: "Free",
    cost: 0,
    description: "Enough to rehearse properly for one role.",
    cta: "You're on this plan",
    offering: [
      { value: "AI interviews from any job description", included: true },
      { value: "Unlimited retakes, every attempt saved", included: true },
      { value: "Content and delivery scoring on every answer", included: true },
      { value: "Coding rounds with runnable test cases", included: true },
      { value: "Grammar checker and email rewriter", included: true },
      { value: "Resume ATS scoring and bullet rewrites", included: false },
      { value: "Resume-tailored interview questions", included: false },
      { value: "Cover letter and LinkedIn writers", included: false },
      { value: "PDF feedback reports", included: false },
      { value: "Priority support", included: false },
    ],
  },
  {
    id: "monthly",
    name: "Monthly",
    cost: 299,
    highlighted: true,
    description: "For when you're actually interviewing.",
    cta: "Upgrade on WhatsApp",
    paymentLink:
      "https://wa.me/918252980774?text=Hello,%20I%20want%20to%20upgrade%20to%20the%20Monthly%20Plan.",
    offering: [
      { value: "AI interviews from any job description", included: true },
      { value: "Unlimited retakes, every attempt saved", included: true },
      { value: "Content and delivery scoring on every answer", included: true },
      { value: "Coding rounds with runnable test cases", included: true },
      { value: "Grammar checker and email rewriter", included: true },
      { value: "Resume ATS scoring and bullet rewrites", included: true },
      { value: "Resume-tailored interview questions", included: true },
      { value: "Cover letter and LinkedIn writers", included: true },
      { value: "PDF feedback reports", included: true },
      { value: "Priority support", included: true },
    ],
  },
];

export default plans;
