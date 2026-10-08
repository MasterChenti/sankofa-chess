import { redirect } from "next/navigation";

export default async function LeaderboardRedirect({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab ? `/app/community?tab=${encodeURIComponent(tab)}` : "/app/community");
}
