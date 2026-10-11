import { redirect } from "next/navigation";

/** Invite links moved to /join/<code> (public, so friends without an account can open them). */
export default async function OldJoinRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/join/${code}`);
}
