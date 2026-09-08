import { SignUp } from "@clerk/nextjs";

import AuthShell from "../../_components/AuthShell";

export const metadata = {
  title: "Sign up",
  description: "Create a free CareerPilot AI account and start practicing interviews.",
};

export default function Page() {
  return (
    <AuthShell>
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-sm normal-case",
            card: "shadow-xl rounded-2xl",
          },
        }}
      />
    </AuthShell>
  );
}
