"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinInvite } from "@/features/online/actions";

export function JoinButton({ code, disabled }: { code: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        size="lg"
        disabled={disabled || pending}
        data-testid="accept-challenge"
        onClick={() =>
          start(async () => {
            const r = await joinInvite(code);
            if (r.ok) router.push(`/app/play/live/${r.gameId}`);
            else setError(r.message);
          })
        }
      >
        {pending ? "Joining…" : "Accept the challenge"}
      </Button>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
