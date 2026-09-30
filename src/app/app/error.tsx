"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-3xl font-semibold">This page didn’t load.</h1>
      <p className="text-muted-foreground">Your progress is safe. It’s usually a connection hiccup — try again.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
