import type { LucideIcon } from "lucide-react";
import { Compass, Lightbulb, Sunrise, Swords, User, Users } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; /** Other routes that belong to this section. */ also?: string[] };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/app/today", label: "Today", icon: Sunrise, also: ["/app/home"] },
  { href: "/app/play", label: "Play", icon: Swords },
  { href: "/app/think", label: "Think", icon: Lightbulb, also: ["/app/puzzles", "/app/learn"] },
  { href: "/app/discover", label: "Discover", icon: Compass, also: ["/app/stories"] },
  { href: "/app/community", label: "Community", icon: Users, also: ["/app/leaderboard"] },
];

const ME: NavItem = { href: "/app/profile", label: "Me", icon: User, also: ["/app/challenges", "/app/settings"] };

/** Mobile bottom bar: Today | Play | Think | Discover | Me */
export const BOTTOM_NAV: NavItem[] = [PRIMARY_NAV[0], PRIMARY_NAV[1], PRIMARY_NAV[2], PRIMARY_NAV[3], ME];

export function isActiveNav(pathname: string, item: NavItem) {
  return [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(h + "/"));
}
