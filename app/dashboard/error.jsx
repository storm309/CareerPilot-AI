"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <div className="bg-red-50 p-6 rounded-2xl border border-red-100 max-w-md">
        <h2 className="text-2xl font-bold text-red-700 mb-2">Something went wrong!</h2>
        <p className="text-red-500 mb-6 text-sm">
          {error.message || "An unexpected error occurred in the dashboard."}
        </p>
        <Button
          onClick={() => reset()}
          className="bg-red-600 hover:bg-red-700 text-white w-full rounded-xl"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
