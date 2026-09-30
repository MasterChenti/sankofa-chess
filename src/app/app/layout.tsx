import { AppHeader, BottomNav } from "@/components/layout/app-shell";
import { requirePlayer } from "@/features/auth/session";
import { levelForXp } from "@/features/progress/rules";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePlayer();
  const lv = levelForXp(profile.xp);
  return (
    <div className="min-h-dvh">
      <AppHeader
        user={{
          displayName: profile.display_name,
          username: profile.username,
          level: lv.level,
          levelName: lv.name,
          levelProgress: lv.progress,
          xp: profile.xp,
        }}
      />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16 lg:pt-10">{children}</main>
      <BottomNav />
    </div>
  );
}
