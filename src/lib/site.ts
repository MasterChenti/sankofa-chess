import "server-only";
import { headers } from "next/headers";
import { env } from "@/config/env";

/** Public origin of the site, for links people share (invites, auth emails). */
export async function siteOrigin() {
  if (env.siteUrl) return env.siteUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
