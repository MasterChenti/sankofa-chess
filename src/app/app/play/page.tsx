import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { PlayClient } from "@/features/chess/components/play-client";
import { requirePlayer } from "@/features/auth/session";

export const metadata: Metadata = { title: "Play" };

export default async function PlayPage() {
  const { profile } = await requirePlayer();
  return (
    <>
      <PageHeader title="Play" description="Every game ends with a personal review." />
      <PlayClient playerName={profile.display_name} playerRating={profile.rating} initial={profile.display_name.slice(0, 1).toUpperCase()} />
    </>
  );
}
