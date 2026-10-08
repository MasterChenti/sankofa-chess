import { redirect } from "next/navigation";

export default async function StoryRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/app/discover/${slug}`);
}
