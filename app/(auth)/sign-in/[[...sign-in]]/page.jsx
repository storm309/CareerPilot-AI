import { SignIn } from "@clerk/nextjs";

import AuthShell from "../../_components/AuthShell";

export const metadata = {
  title: "Sign in",
  description: "Sign in to CareerPilot AI to run AI mock interviews.",
};

export default function Page() {
  return (
    <AuthShell
      note={{
        title: "Guest credentials",
        body: (
          <>
            <p>
              Email: <span className="font-semibold">guestsample@gmail.com</span>
            </p>
            <p>
              Password: <span className="font-semibold">Guest@123</span>
            </p>
          </>
        ),
      }}
    >
      <SignIn
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
