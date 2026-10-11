import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/components/auth-forms";
import { safeNext } from "@/features/auth/schemas";
import { getInvite, inviteCodeFromPath } from "@/features/online/invite";
import { env } from "@/config/env";

export const metadata: Metadata = { title: "Join" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = raw ? safeNext(raw, "") || undefined : undefined;
  const code = inviteCodeFromPath(next);
  const invite = code ? await getInvite(code) : null;
  return <SignupForm googleEnabled={env.googleAuthEnabled} next={next} invitedBy={invite?.host?.display_name ?? null} />;
}
