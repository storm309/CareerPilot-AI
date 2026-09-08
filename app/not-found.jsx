import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Compass className="h-12 w-12 text-muted-foreground/40" />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">404</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        We couldn&apos;t find that page. It may have moved, or the link may be out of date.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button variant="outline">Go home</Button>
        </Link>
        <Link href="/dashboard">
          <Button>Go to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
