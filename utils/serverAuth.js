import "server-only";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Resolves the signed-in user from the Clerk session on the server.
 *
 * Never trust an email address sent from the browser: every action derives the
 * caller's identity here instead, so a client cannot read or mutate another
 * user's rows by passing someone else's address.
 */
export async function requireUser() {
  const user = await currentUser();

  if (!user) {
    throw new Error("You must be signed in to do that.");
  }

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    throw new Error("Your account has no email address attached.");
  }

  return { userId: user.id, email };
}
