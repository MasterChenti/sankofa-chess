import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { OnboardingFlow } from "@/features/auth/components/onboarding-flow";
import { getSession } from "@/features/auth/session";

export const metadata: Metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { user, profile } = await getSession();
  if (!user) redirect("/login?next=/onboarding");
  if (profile?.onboarded_at) redirect("/app/today");

  return (
    <div className="min-h-dvh">
      <header className="pt-safe mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Sankofa Chess home">
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[520px] px-4 pb-20 pt-8 sm:pt-14">
        {profile ? (
          <OnboardingFlow name={profile.display_name} initialLevel={profile.chess_level} />
        ) : (
          <p className="text-muted-foreground">We’re setting up your profile. Refresh in a moment.</p>
        )}
      </main>
    </div>
  );
}
