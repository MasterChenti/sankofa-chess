import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";
import { JoinButton } from "@/features/online/components/join-button";
import { requirePlayer } from "@/features/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { LIVE_MODES } from "@/lib/chess/live";
import { countryFlag, countryName } from "@/config/countries";
import type { LiveGame } from "@/types/database";

export const metadata: Metadata = { title: "You’ve been challenged" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await requirePlayer();
  // The invitee can't read the game through RLS yet, so look it up by its unguessable code on the server.
  const valid = /^[a-z2-9]{8}$/.test(code);
  const admin = createAdminClient();
  const { data } = valid ? await admin.from("live_games").select("id, status, mode, created_by").eq("invite_code", code).maybeSingle() : { data: null };
  const game = data as Pick<LiveGame, "id" | "status" | "mode" | "created_by"> | null;
  const { data: host } = game?.created_by
    ? await admin.from("profiles").select("username, display_name, rating, country").eq("id", game.created_by).maybeSingle()
    : { data: null };
  const h = host as { username: string; display_name: string; rating: number; country: string } | null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      <LogoMark className="size-14 text-foreground" />
      {!game ? (
        <>
          <h1 className="text-3xl font-semibold">This invite has expired.</h1>
          <p className="text-muted-foreground">Ask your friend to send a new link.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">{h ? `${h.display_name} challenges you.` : "You’ve been challenged."}</h1>
          {h && (
            <p className="text-muted-foreground">
              @{h.username} · {countryFlag(h.country)} {countryName(h.country)} · rating {h.rating}
            </p>
          )}
          <p className="text-sm">
            {LIVE_MODES[game.mode].label} · {LIVE_MODES[game.mode].detail} · rated
          </p>
          <JoinButton code={code} disabled={game.status !== "waiting"} />
          {game.status !== "waiting" && <p className="text-sm text-muted-foreground">Someone already accepted this invite.</p>}
        </>
      )}
    </div>
  );
}
