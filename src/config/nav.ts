import type { LucideIcon } from "lucide-react";
import { BookOpen, Crown, Home, LayoutGrid, Swords, Trophy, User } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/app/play", label: "Play", icon: Swords },
  { href: "/app/learn", label: "Learn", icon: BookOpen },
  { href: "/app/puzzles", label: "Puzzles", icon: LayoutGrid },
  { href: "/app/challenges", label: "Challenges", icon: Trophy },
  { href: "/app/profile", label: "Profile", icon: User },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/app/stories", label: "Stories", icon: BookOpen },
  { href: "/app/leaderboard", label: "Leaderboard", icon: Crown },
];

/** Mobile bottom bar: Home | Play | Learn | Puzzles | Profile */
export const BOTTOM_NAV: NavItem[] = [PRIMARY_NAV[0], PRIMARY_NAV[1], PRIMARY_NAV[2], PRIMARY_NAV[3], PRIMARY_NAV[5]];
