import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlayClient, type PlayPreset } from "@/features/chess/components/play-client";
import { PlayTabs } from "@/features/chess/components/play-tabs";
import { OnlinePanel } from "@/features/online/components/online-panel";
import { getMyLiveGames } from "@/features/online/queries";
import { requirePlayer } from "@/features/auth/session";
import { siteOrigin } from "@/lib/site";
import { PERSONAS, TIME_CONTROLS, type PersonaId, type TimeControlId } from "@/lib/chess/personas";
import type { LiveMode } from "@/types/database";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; mode?: string; auto?: string; vs?: string; tc?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, profile } = await requirePlayer();
  const [games, origin] = await Promise.all([getMyLiveGames(supabase, profile.id), siteOrigin()]);

  const mode: LiveMode = sp.mode === "blitz" || sp.mode === "daily" ? sp.mode : "rapid";
  const preset: PlayPreset = {};
  if (sp.vs && sp.vs in PERSONAS) preset.personaId = sp.vs as PersonaId;
  if (sp.tc && sp.tc in TIME_CONTROLS) preset.timeControl = sp.tc as TimeControlId;
  const tab = sp.tab === "computer" || sp.vs ? "computer" : sp.tab === "people" ? "people" : null;

  return (
    <>
      <PageHeader title="Play" description="A real opponent somewhere in the world, or the computer. Every game ends with a personal review." />
      <PlayTabs
        initialTab={tab}
        people={<OnlinePanel meId={profile.id} games={games} origin={origin} initialMode={mode} autoStart={sp.auto === "1"} />}
        computer={
          <PlayClient
            playerName={profile.display_name}
            playerRating={profile.rating}
            initial={profile.display_name.slice(0, 1).toUpperCase()}
            preset={preset}
          />
        }
      />
    </>
  );
}
